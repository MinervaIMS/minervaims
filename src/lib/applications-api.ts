// =====================================================================
// applications-api — typed data access for the Applications pipeline.
// Reviewer access goes through the admin-applications edge function;
// candidates read only their own row (RLS). Contains the cast around the
// not-yet-regenerated Supabase types in one place.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { divisionLabels, type OrgDivision } from '@/lib/roles';

export type AcademicYear = 'bachelor_1' | 'bachelor_2' | 'bachelor_3' | 'master_1' | 'master_2' | 'exchange';

export type ApplicationStatus =
  | 'received' | 'cv_opened' | 'under_review' | 'to_be_contacted' | 'interview_invitation_sent'
  | 'waiting_interview_confirmation' | 'interview_confirmed' | 'interview_completed'
  | 'accepted' | 'rejected' | 'offer_accepted' | 'offer_declined' | 'joined';

export interface ApplicationRow {
  id: string;
  user_id: string | null;
  semester_label: string;
  first_name: string;
  surname: string;
  bocconi_id: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  degree_course: string;
  academic_year: AcademicYear;
  cv_path: string | null;
  answer_path: string | null;
  first_choice: OrgDivision;
  second_choice: OrgDivision | null;
  status: ApplicationStatus;
  /** Division the candidate was invited to interview for (set on invitation). */
  interview_division: OrgDivision | null;
  /**
   * The division currently ASSESSING this candidate, which is not the same
   * question as the divisions they asked for. Defaults to the first choice
   * and may be changed by a role that can move candidacies. Optional in
   * the type only because the generated Supabase types are regenerated
   * from the live schema and lag behind a migration; `select('*')` returns
   * the column regardless. Read it through `evaluationDivision()`.
   */
  evaluation_division?: OrgDivision | null;
  /** The division the evaluation was last moved away from, or null. */
  evaluation_division_previous?: OrgDivision | null;
  cv_viewed_at: string | null;
  created_at: string;
  note_count?: number;
  // Offer to join (set when New Joiners sends an offer).
  offer_sent_at?: string | null;
  offer_deadline?: string | null;
  offer_role?: string | null;
  offer_division?: OrgDivision | null;
  offer_fee_due?: boolean | null;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface ApplicationQuestion {
  division: OrgDivision;
  question: string;
}

export const ACADEMIC_YEAR_LABELS: Record<AcademicYear, string> = {
  bachelor_1: 'Bachelor, 1st year', bachelor_2: 'Bachelor, 2nd year', bachelor_3: 'Bachelor, 3rd year',
  master_1: 'Master, 1st year', master_2: 'Master, 2nd year', exchange: 'Exchange student',
};

// Colour classes per status for the reviewer table / detail (report item 15).
// Grouped: neutral (early), amber (interview in progress / caution), green
// (positive outcomes), red (negative outcomes).
// =====================================================================
// THE DIVISIONS AN APPLICANT MAY CHOOSE, and what they are called here.
// ---------------------------------------------------------------------
// The five core research divisions, plus Media and Operations, which the
// Society recruits for jointly: one intake, one team, one choice on the
// form.
//
// IT IS STORED AS `media`, which is an existing value of the
// `org_division` enum, so nothing in the database, in the edge functions
// or in the interview scheduling has to change to accept it. Only the
// NAME differs on the applicant's side, because "Media and Operations"
// is what the Society calls the intake even though the register keeps
// the two divisions separately for members.
//
// TWO THINGS ARE TRUE OF IT AND OF NOTHING ELSE ON THE FORM: there is no
// written question to answer, and there is no second choice to make.
// Both follow from the same fact - it is not one of the five research
// divisions a candidate ranks - and both are declared here rather than
// spelled out as conditions in the form, so the form reads the rule
// instead of restating it.
// =====================================================================

/** In the order the form offers them. */
export const APPLY_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media'];

// =====================================================================
// THE EVALUATION DIVISION: who is assessing this candidate.
// ---------------------------------------------------------------------
// Separate from the two preferences, and wider than them. An applicant
// ranks the five research divisions, or applies once to the joint Media
// and Operations intake; an examiner may conclude that somebody belongs
// in a division nobody named, including Operations on its own, and this
// is the list that lets them say so.
//
// Mirrors EVALUATION_DIVISIONS in supabase/functions/admin-applications.
// =====================================================================
export const EVALUATION_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

/**
 * The division assessing this candidate.
 *
 * Every screen that names "the division" for a candidate reads it from
 * here, so the table, the candidate's own status page and the emails can
 * never be describing three different divisions. The fallbacks cover rows
 * written before the field existed: an application already invited to
 * interview is being evaluated by whoever invited it, and one that is not
 * is being evaluated by its first choice.
 */
export function evaluationDivision(
  a: Pick<ApplicationRow, 'first_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division'>>,
): OrgDivision {
  return a.evaluation_division || a.interview_division || a.first_choice;
}

/**
 * Is this candidate being assessed by a division they did not ask for?
 *
 * The one fact that makes a candidacy unusual, and the trigger for both
 * the marker in the reviewer's table and the notice on the candidate's
 * own status page.
 */
export function isReEvaluated(
  a: Pick<ApplicationRow, 'first_choice' | 'second_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division' | 'evaluation_division_previous'>>,
): boolean {
  if (!a.evaluation_division_previous) return false;
  const ev = evaluationDivision(a);
  return ev !== a.first_choice && ev !== a.second_choice;
}

/**
 * The divisions this candidacy may still be moved to.
 *
 * Before the first move: any of them. After it: only the two it has
 * already involved, which is what caps a candidate at two selection
 * processes rather than an open-ended tour of the association.
 */
export function allowedEvaluationDivisions(
  a: Pick<ApplicationRow, 'first_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division' | 'evaluation_division_previous'>>,
): OrgDivision[] {
  const current = evaluationDivision(a);
  const previous = a.evaluation_division_previous;
  if (!previous) return EVALUATION_DIVISIONS;
  return EVALUATION_DIVISIONS.filter((d) => d === current || d === previous);
}

/** The five a candidate may rank. Media and Operations is not ranked. */
export const RANKED_APPLY_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

/** Divisions whose applicants attach no written answer. */
export const NO_WRITTEN_ANSWER_DIVISIONS: OrgDivision[] = ['media'];

export const hasWrittenAnswer = (division: OrgDivision | '' | null | undefined): boolean =>
  !!division && !NO_WRITTEN_ANSWER_DIVISIONS.includes(division);

export const hasSecondChoice = (division: OrgDivision | '' | null | undefined): boolean =>
  !!division && RANKED_APPLY_DIVISIONS.includes(division);

/**
 * The division's name as an APPLICANT sees it. Everywhere else - the
 * register, the workspace, a member's own profile - keeps `divisionLabels`,
 * which is the association's own naming for its divisions.
 */
export function applyDivisionLabel(division: OrgDivision): string {
  return division === 'media' ? 'Media and Operations' : divisionLabels[division];
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  received: 'bg-muted text-muted-foreground border-separator',
  cv_opened: 'bg-muted text-muted-foreground border-separator',
  under_review: 'bg-sky-50 text-sky-700 border-sky-200',
  to_be_contacted: 'bg-sky-50 text-sky-700 border-sky-200',
  interview_invitation_sent: 'bg-amber-50 text-amber-700 border-amber-200',
  waiting_interview_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  interview_confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  interview_completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offer_accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  joined: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  offer_declined: 'bg-orange-50 text-orange-700 border-orange-200',
};

/** Small status pill used in the reviewer table and detail view. */
export function statusBadgeClass(status: ApplicationStatus): string {
  return STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-separator';
}

// Full internal status list (reviewer-facing), in workflow order.
export const STATUS_FLOW: ApplicationStatus[] = [
  'received', 'cv_opened', 'under_review', 'to_be_contacted', 'interview_invitation_sent',
  'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed',
  'accepted', 'rejected', 'offer_accepted', 'offer_declined', 'joined',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: 'Application received', cv_opened: 'CV opened', under_review: 'Under review',
  // The KEY stays `to_be_contacted`: it is stored on every application row,
  // referenced by the edge function's STATUSES list and used for ordering the
  // workflow. Only the words a reviewer reads change.
  to_be_contacted: 'To be invited', interview_invitation_sent: 'Interview invitation sent',
  waiting_interview_confirmation: 'Waiting for interview confirmation', interview_confirmed: 'Interview confirmed',
  interview_completed: 'Interview completed', accepted: 'Accepted', rejected: 'Rejected',
  offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
};

/** Statuses locked from manual change — driven by the offer flow / applicant response. */
export const LOCKED_STATUSES: ApplicationStatus[] = ['offer_accepted', 'offer_declined', 'joined'];
export function isLockedStatus(s: ApplicationStatus): boolean {
  return LOCKED_STATUSES.includes(s);
}

/** Position of a status in the forward-only workflow. */
export function statusRank(s: ApplicationStatus): number {
  return STATUS_FLOW.indexOf(s);
}

/**
 * A candidacy only ever moves FORWARD: once a stage is reached it can never
 * be taken back (enforced again server-side). The only sanctioned exception
 * is the post-interview division transfer, which is its own explicit process.
 */
export function allowedNextStatuses(current: ApplicationStatus): typeof MANUAL_STATUSES {
  const rank = statusRank(current);
  return MANUAL_STATUSES.filter((o) => statusRank(o.value) > rank);
}

/** Statuses a reviewer can set by hand. `effect: 'action'` = triggers an email or unlocks a step. */
export const MANUAL_STATUSES: { value: ApplicationStatus; label: string; effect: 'passive' | 'action' }[] = [
  { value: 'received', label: STATUS_LABELS.received, effect: 'passive' },
  { value: 'cv_opened', label: STATUS_LABELS.cv_opened, effect: 'passive' },
  { value: 'under_review', label: STATUS_LABELS.under_review, effect: 'passive' },
  { value: 'to_be_contacted', label: STATUS_LABELS.to_be_contacted, effect: 'passive' },
  { value: 'interview_invitation_sent', label: STATUS_LABELS.interview_invitation_sent, effect: 'action' },
  { value: 'waiting_interview_confirmation', label: STATUS_LABELS.waiting_interview_confirmation, effect: 'passive' },
  { value: 'interview_confirmed', label: STATUS_LABELS.interview_confirmed, effect: 'passive' },
  { value: 'interview_completed', label: STATUS_LABELS.interview_completed, effect: 'passive' },
  { value: 'accepted', label: STATUS_LABELS.accepted, effect: 'passive' },
  { value: 'rejected', label: STATUS_LABELS.rejected, effect: 'action' },
];

// =====================================================================
// THE APPLICANT'S JOURNEY, as their own workspace sees it.
// ---------------------------------------------------------------------
// The applicant workspace shows a section only once it has something in
// it: Interview appears when a division has invited them, Offer appears
// when an offer has been sent. Both questions are answered here, once,
// so the navigation and the pages themselves cannot disagree about
// whether a stage has been reached.
//
// Both are deliberately answered from FACTS ON THE ROW rather than from
// the status alone. `interview_division` is written when the invitation
// is sent and is never cleared, so a candidate who has since been
// interviewed, transferred, accepted or rejected still keeps the record
// of the interview they sat. `offer_sent_at` works the same way: an
// offer that was declined or that expired still happened, and hiding the
// page would leave the applicant unable to see what they replied to.
// =====================================================================

/** Statuses that mean an interview has been offered, sat or is pending. */
const INTERVIEW_STATUSES: ApplicationStatus[] = [
  'interview_invitation_sent', 'waiting_interview_confirmation',
  'interview_confirmed', 'interview_completed',
];

/** Has a division invited this applicant to interview? */
export function isInvitedToInterview(a: Pick<ApplicationRow, 'status' | 'interview_division'> | null): boolean {
  if (!a) return false;
  return !!a.interview_division || INTERVIEW_STATUSES.includes(a.status);
}

/**
 * Has an offer been sent to this applicant?
 *
 * `offer_sent_at` is the only trustworthy signal. The status `accepted`
 * on its own is an INTERNAL decision that the applicant must not see
 * until the President actually sends the offers, so it is not enough.
 */
export function hasOffer(a: Pick<ApplicationRow, 'status' | 'offer_sent_at'> | null): boolean {
  if (!a) return false;
  return !!a.offer_sent_at || a.status === 'offer_accepted' || a.status === 'joined';
}

/** An offer that is sent, not yet answered and not yet expired. */
export function isOfferLive(a: ApplicationRow | null): boolean {
  if (!a) return false;
  return a.status === 'accepted' && !!a.offer_sent_at
    && (!a.offer_deadline || new Date(a.offer_deadline) > new Date());
}

// Simplified candidate-facing status (report 10.3).
export function candidateStatus(s: ApplicationStatus): { label: string; step: number } {
  switch (s) {
    case 'received': return { label: 'Application received', step: 1 };
    case 'cv_opened':
    case 'under_review':
    case 'to_be_contacted': return { label: 'Application under review', step: 2 };
    case 'interview_invitation_sent':
    case 'waiting_interview_confirmation':
    case 'interview_confirmed':
    case 'interview_completed': return { label: 'Interview stage', step: 3 };
    case 'accepted':
    case 'offer_accepted':
    case 'joined': return { label: 'Accepted', step: 4 };
    case 'rejected':
    case 'offer_declined': return { label: 'Not selected', step: 5 };
    default: return { label: 'Application received', step: 1 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-applications', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Reviewer ───────────────────────────────────────────────────────────
export async function listApplications(session: Session | null): Promise<ApplicationRow[]> {
  return (await invoke(session, { action: 'list' })).applications as ApplicationRow[];
}
export async function getApplication(session: Session | null, id: string): Promise<{ application: ApplicationRow; notes: ApplicationNote[] }> {
  return await invoke(session, { action: 'get', id });
}
export async function signDocumentUrl(session: Session | null, id: string, kind: 'cv' | 'answer', mode: 'preview' | 'download'): Promise<string> {
  return (await invoke(session, { action: 'sign-url', id, kind, mode })).url as string;
}
export async function bulkDocumentUrls(session: Session | null, ids: string[], kind: 'cv' | 'answer'): Promise<{ name: string; url: string }[]> {
  return (await invoke(session, { action: 'bulk-urls', ids, kind })).files;
}
export async function updateApplicationStatus(session: Session | null, id: string, status: ApplicationStatus, interviewDivision?: OrgDivision | null) {
  return await invoke(session, { action: 'update-status', id, status, interview_division: interviewDivision ?? undefined });
}
export async function addApplicationNote(session: Session | null, id: string, body: string) {
  return await invoke(session, { action: 'add-note', id, body });
}
/**
 * Move a candidacy to a different division.
 *
 * Returns the candidacy to "To be invited" for the new division, clears
 * the old interview invitation and releases any slot it held. Sends no
 * email of its own: the invitation that follows does that, naming the new
 * division. Refused server-side once the candidacy has already been moved
 * once and the target is neither of its two divisions.
 */
export async function setEvaluationDivision(session: Session | null, id: string, division: OrgDivision) {
  return await invoke(session, { action: 'set-evaluation-division', id, division });
}
export async function setDivisionQuestion(session: Session | null, division: OrgDivision, question: string) {
  return await invoke(session, { action: 'set-question', division, question });
}
export async function convertToMember(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'convert-to-member', id, role, division, fee_due: feeDue });
}
/** New Joiners: extend an offer to join (3-day window, 2-day reminder). */
export async function sendOffer(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'send-offer', id, role, division, fee_due: feeDue });
}

// ── Candidate offer actions (self-service via applicant-notify) ─────────────
async function invokeNotify(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('applicant-notify', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
/** Read-only signed URL for the applicant's OWN CV / written answer. */
export async function signMyDocument(session: Session | null, kind: 'cv' | 'answer', mode: 'preview' | 'download'): Promise<string> {
  const data = await invokeNotify(session, { action: 'sign-own-doc', kind, mode });
  return data.url as string;
}
export async function acceptOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'accept-offer' });
}
export async function declineOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'decline-offer' });
}

// ── Public / candidate ─────────────────────────────────────────────────
export async function listQuestions(): Promise<ApplicationQuestion[]> {
  const { data, error } = await sb.from('application_questions').select('division, question');
  if (error) throw new Error(error.message);
  return (data || []) as ApplicationQuestion[];
}

/** The signed-in candidate's own application (RLS returns only their row). */
export async function getMyApplication(): Promise<ApplicationRow | null> {
  const { data, error } = await sb.from('applications').select('*').limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ApplicationRow) ?? null;
}

// Public: the applicant creates their account (client-side auth.signUp) and
// then submits this form with the returned user id. No prior session needed.
export async function submitApplication(form: FormData): Promise<{ id: string; verified?: boolean; already?: boolean }> {
  const { data, error } = await supabase.functions.invoke('submit-application', { body: form });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
