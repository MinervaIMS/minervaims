// =====================================================================
// company-visits-api — interest, selection and invitations (Step 93B).
// ---------------------------------------------------------------------
// A company visit with a closing date (`interest_closes_at`) selects its
// participants instead of taking registrations. Members and alumni
// register their interest with their CV until the form closes; the
// President and the Vice President mark each person Invite or Not this
// time, then send every decision at once. The invited take a place on the
// attendance list (ticket, check-in and the day-before reminder work as
// for any event); the others are told kindly and kept as reserves, and a
// place that opens up can be offered to one of them.
//
// Participants are selected solely on their active participation in the
// Society's activities and their demonstrated interest in the topic of
// the visit. The CV plays no part in the selection; only the CVs of the
// members invited may be sent to the host, when the host asks, and every
// CV is deleted six months after the visit.
//
// The server is supabase/functions/company-visits.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';
import { downloadBlob } from '@/lib/file-download';
import { companyVisitCvZipName } from '@/lib/company-visit-download-name';
import { formatDay, formatTime } from '@/lib/event-time';
import type { OrgDivision } from '@/lib/roles';

/** The organisers' address, for anybody who can no longer come. */
export const VISIT_CONTACT = 'as.minerva@unibocconi.it';
export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const CV_RETENTION_MONTHS = 6;

/** The selection statement, word for word wherever it is shown. */
export const SELECTION_STATEMENT =
  'Participants are selected solely on their active participation in the Society’s activities and their demonstrated interest in the topic of the visit. Your CV does not count towards the selection.';
export const CV_USE_STATEMENT =
  'Only the CVs of the members invited may be shared with the host company, and only if it asks for them. All CVs are deleted automatically six months after the visit.';
export const FORFEIT_STATEMENT =
  'Forfeiting a place and not attending is a severe offence towards the other interested members.';

/** Does this event select its participants? (company visit with a closing date) */
export function isSelectionVisit(e: { event_type?: string | null; interest_closes_at?: string | null } | null | undefined): boolean {
  return !!e && e.event_type === 'company_visit' && !!e.interest_closes_at;
}

/** Who chooses the participants: the President, the Vice President and the admin account (mirrors SELECTOR_ROLES on the server). */
export function canSelectParticipants(email: string | null | undefined, roles: { role: string }[]): boolean {
  return email === VISIT_CONTACT || roles.some((r) => ['admin', 'president', 'vice_president'].includes(r.role));
}

/** Is the interest form open right now? */
export function interestOpen(e: { registration_enabled?: boolean | null; interest_closes_at?: string | null }, now = Date.now()): boolean {
  return !!e.registration_enabled && !!e.interest_closes_at && Date.parse(e.interest_closes_at) > now;
}

/** When the form closes, as "Friday 13 November 2026, 11:59 pm CET". */
export function formatClosing(iso: string | null | undefined): string {
  return iso ? `${formatDay(iso)}, ${formatTime(iso)}` : '';
}

/**
 * The suggested closing time for a visit starting at `startLocal` (Rome,
 * "YYYY-MM-DDTHH:mm"): 11:59 pm a week before. When a week before has
 * already passed, the day before; when that has too, nothing.
 */
export function suggestedClosingLocal(startLocal: string, nowLocal: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(startLocal)) return '';
  const [y, m, d] = startLocal.slice(0, 10).split('-').map(Number);
  const dayBefore = (n: number) => new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10) + 'T23:59';
  for (const n of [7, 1]) {
    const candidate = dayBefore(n);
    if (candidate > nowLocal) return candidate;
  }
  return '';
}

// ── Members and alumni ──────────────────────────────────────────────────
export type InterestStatus = 'received' | 'invited' | 'not_selected' | 'withdrawn';
export interface MyInterest {
  event_id: string;
  status: InterestStatus;
  submitted_at: string;
  cv_name: string | null;
  /** Invited after a place opened up (they were a reserve first). */
  spot_opened: boolean;
}

export async function myInterests(session: Session | null, eventId?: string): Promise<{ eligible: boolean; interests: MyInterest[] }> {
  const r = await invoke(session, { action: 'mine', ...(eventId ? { event_id: eventId } : {}) });
  return { eligible: !!r?.eligible, interests: (r?.interests || []) as MyInterest[] };
}

/** Registers the interest with this CV, or replaces the CV while nothing is decided. */
export async function submitInterest(session: Session | null, eventId: string, file: File): Promise<{ interest: MyInterest; replaced: boolean }> {
  if (file.size > CV_MAX_BYTES) throw new Error('The CV must be a PDF under 10 MB.');
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('The CV must be a PDF file.');
  const link = await invoke(session, { action: 'upload-url', event_id: eventId }) as { bucket: string; path: string; token: string };
  const { error } = await supabase.storage.from(link.bucket).uploadToSignedUrl(link.path, link.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error('Your CV could not be uploaded. Check your connection and try again.');
  const r = await invoke(session, { action: 'submit', event_id: eventId, path: link.path, file_name: file.name });
  return { interest: r.interest as MyInterest, replaced: !!r.replaced };
}

// ── The President and the Vice President ───────────────────────────────
export type Decision = 'pending' | 'invite' | 'not_selected';
export interface ParticipationRecord {
  events_attended_year: number;
  events_attended_total: number;
  visits_attended: number;
  missed_year: number;
  visits_missed: number;
  last_attended: string | null;
}
export interface Candidate {
  id: string;
  name: string;
  email: string;
  kind: 'member' | 'alumni';
  member: { id: string; role: string | null; division: OrgDivision | null; membership_status: string | null } | null;
  submitted_at: string;
  cv_name: string | null;
  cv_size: number | null;
  has_cv: boolean;
  cv_deleted: boolean;
  decision: Decision;
  notified: 'invited' | 'not_selected' | null;
  notified_at: string | null;
  spot_opened_at: string | null;
  withdrawn_at: string | null;
  attended: boolean;
  record: ParticipationRecord | null;
}
export interface SelectionCounts {
  interested: number;
  undecided: number;
  draft_invite: number;
  draft_not_selected: number;
  /** Invitations sent (withdrawals excluded). */
  invited: number;
  reserves: number;
  withdrawn: number;
  places: number | null;
  places_left: number | null;
}
export interface Selection {
  open: boolean;
  started: boolean;
  contact: string;
  counts: SelectionCounts;
  candidates: Candidate[];
  event: { id: string; title: string; interest_closes_at: string | null; capacity: number | null };
}

/** Where a candidate stands, in one word for the list. */
export function candidateStage(c: Pick<Candidate, 'notified' | 'withdrawn_at' | 'decision'>):
  'invited' | 'reserve' | 'withdrawn' | 'draft_invite' | 'draft_not_selected' | 'undecided' {
  if (c.notified === 'invited') return c.withdrawn_at ? 'withdrawn' : 'invited';
  if (c.notified === 'not_selected') return 'reserve';
  if (c.decision === 'invite') return 'draft_invite';
  if (c.decision === 'not_selected') return 'draft_not_selected';
  return 'undecided';
}

export async function listSelection(session: Session | null, eventId: string): Promise<Selection> {
  return invoke(session, { action: 'list', event_id: eventId });
}
export async function draftDecision(session: Session | null, eventId: string, interestIds: string[], decision: Decision): Promise<{ changed: number; counts: SelectionCounts }> {
  return invoke(session, { action: 'decide', event_id: eventId, interest_ids: interestIds, decision });
}
export async function closeInterestNow(session: Session | null, eventId: string): Promise<{ interest_closes_at: string }> {
  return invoke(session, { action: 'close-now', event_id: eventId });
}
export async function sendDecisions(session: Session | null, eventId: string): Promise<{ invited: number; not_selected: number; counts: SelectionCounts }> {
  return invoke(session, { action: 'send', event_id: eventId, confirm: true });
}
export async function offerPlace(session: Session | null, interestId: string): Promise<{ counts: SelectionCounts }> {
  return invoke(session, { action: 'open-place', interest_id: interestId, confirm: true });
}
export async function recordWithdrawal(session: Session | null, interestId: string): Promise<{ counts: SelectionCounts }> {
  return invoke(session, { action: 'withdraw', interest_id: interestId, confirm: true });
}

/** Opens one CV in a new tab, through a link that lasts ten minutes. */
export async function openCv(session: Session | null, interestId: string): Promise<void> {
  // The tab is opened first, in the click, so that no pop-up blocker stops it.
  // ('noopener' would make window.open return null, so it is cut by hand.)
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const r = await invoke(session, { action: 'cv-url', interest_id: interestId });
    if (tab) tab.location.href = r.url; else window.location.assign(r.url);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** The CVs of the members invited, in one ZIP, for a host that asks for them. */
export async function downloadInvitedCvs(session: Session | null, eventId: string, title: string): Promise<void> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';
  const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/company-visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(key ? { apikey: key } : {}) },
    body: JSON.stringify({ action: 'cvs-zip', event_id: eventId }),
  });
  if (!res.ok || !(res.headers.get('Content-Type') || '').includes('zip')) {
    let message = 'The CVs could not be prepared. Please try again.';
    try { message = ((await res.json()) as { error?: string }).error || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  downloadBlob(await res.blob(), companyVisitCvZipName(title));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('company-visits', { body, session });
}
