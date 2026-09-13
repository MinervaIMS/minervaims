// =====================================================================
// alumni-aod-api — alumni calls tracker + Association on Display slots.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
import type { OrgDivision } from '@/lib/roles';

export type CallStatus = 'planned' | 'invited' | 'accepted' | 'completed' | 'declined';

export interface CallParticipant {
  id?: string;
  alumni_id: string | null;
  alumnus_name: string;
  former_role?: string | null;
}

export interface AlumniCall {
  id: string;
  division: OrgDivision | null;
  organiser_name: string | null;
  planned_date: string | null;
  status: CallStatus;
  notes: string | null;
  /** The call's poster. Its presence is what publishes the call publicly. */
  poster_url: string | null;
  /** The public event this call is mirrored into, when it has one. */
  event_id: string | null;
  participants: CallParticipant[];
}

export interface AlumniCallInput {
  id?: string;
  division?: OrgDivision | null;
  planned_date?: string | null;
  status?: CallStatus;
  notes?: string | null;
  poster_url?: string | null;
  participants: CallParticipant[];
}

// =====================================================================
// THE POSTER IS WHAT MAKES A CALL PUBLIC.
// ---------------------------------------------------------------------
// An alumni call begins as a plan: a division, a date and a list of
// alumni who have not yet all said yes. That is not something to publish.
// A poster exists only once the call is real - somebody designed it, with
// the names and the time on it - so the poster is the honest signal that
// the call is ready to be announced, and no second "publish" switch is
// needed beside it.
//
// A call with a poster and a date is mirrored into the `events` table as
// an event of type `alumni_call`, which is what the public Events page
// and the Alumni page read. The mirror is written by the edge function,
// so the two can never be edited into disagreement from the interface.
// =====================================================================

/** Is this call published on the public site? */
export const isCallPublic = (c: Pick<AlumniCall, 'poster_url' | 'planned_date'>): boolean =>
  !!c.poster_url && !!c.planned_date;

/** Upload an alumni-call poster; returns its public URL. */
export async function uploadAlumniCallPoster(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `alumni-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // The same bucket event posters use: an alumni call IS an event once it
  // is published, and one bucket means one set of storage rules to keep
  // right rather than two that can drift apart.
  const { error } = await supabase.storage.from('event-posters').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('event-posters').getPublicUrl(path).data.publicUrl;
}

/** A single alumnus from the directory, for the participant picker. */
export interface AlumniOption {
  id: string;
  name: string;
  surname: string;
  company: string | null;
  graduation_year: number | null;
}

export async function listAlumniDirectory(): Promise<AlumniOption[]> {
  const { data, error } = await supabase.from('alumni')
    .select('id, name, surname, company, graduation_year')
    .order('surname', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as AlumniOption[];
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  planned: 'Planned', invited: 'Invited', accepted: 'Accepted', completed: 'Completed', declined: 'Declined',
};

export interface AodDay { id: string; event_date: string; registration_open: boolean; notes: string | null; }
export interface AodSignup { id: string; day_id: string; slot_time: string; user_id: string | null; member_name: string; division: OrgDivision | null; }

// =====================================================================
// THE SLOTS, AND THE DIFFERENCE BETWEEN WHAT IS STORED AND WHAT IS READ.
// ---------------------------------------------------------------------
// `AOD_SLOTS` holds the 24-hour keys "10:00" through "18:30", and they
// are NOT a display format: each one is written verbatim into
// `aod_signups.slot_time` and is how an existing registration is found
// again. They are therefore left exactly as they are, forever.
//
// What a person reads is a separate question, answered by the helpers
// below. Changing how the association writes the time of day must never
// mean rewriting rows, so the two are kept apart on purpose.
// =====================================================================

/** How long one slot lasts. The whole half hour that follows its start. */
export const AOD_SLOT_MINUTES = 30;

/** The stored keys. One per half hour from 10:00 to 18:30 inclusive. */
export const AOD_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 10; h < 19; h++) { out.push(`${String(h).padStart(2, '0')}:00`); out.push(`${String(h).padStart(2, '0')}:30`); }
  return out;
})();

/**
 * A stored "18:30" as the association writes the time of day: "6:30pm".
 *
 * Written out here rather than left to `toLocaleTimeString`, which
 * follows the reader's own locale and would give an Italian browser
 * "18:30" and a British one "6:30 pm" for the same stand. A rota is read
 * side by side by people on different machines, so it reads the same on
 * all of them.
 */
export function formatSlotTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** The stored key of the moment a slot ends: "18:30" gives "19:00". */
export function slotEndTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = h * 60 + m + AOD_SLOT_MINUTES;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** A whole slot, start to finish: "6:30pm to 7:00pm". */
export function formatSlotRange(hhmm: string): string {
  return `${formatSlotTime(hhmm)} to ${formatSlotTime(slotEndTime(hhmm))}`;
}

/** When the stand opens and closes, as one phrase: "10:00am to 7:00pm". */
export const AOD_DAY_HOURS = `${formatSlotTime(AOD_SLOTS[0])} to ${formatSlotTime(slotEndTime(AOD_SLOTS[AOD_SLOTS.length - 1]))}`;

  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(fn: string, session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction(fn, { body: body, session });
}

// Alumni calls
export async function listAlumniCalls(session: Session | null): Promise<AlumniCall[]> {
  return (await invoke('admin-alumni-calls', session, { action: 'list' })).calls;
}
export function saveAlumniCall(session: Session | null, call: AlumniCallInput) {
  return invoke('admin-alumni-calls', session, { action: call.id ? 'update' : 'create', call });
}
export function deleteAlumniCall(session: Session | null, id: string) {
  return invoke('admin-alumni-calls', session, { action: 'delete', id });
}

// Association on Display
export async function listAod(session: Session | null): Promise<{ days: AodDay[]; signups: AodSignup[]; isSenior: boolean }> {
  return await invoke('admin-aod', session, { action: 'list' });
}
export function createAodDay(session: Session | null, event_date: string, notes?: string) {
  return invoke('admin-aod', session, { action: 'create-day', event_date, notes });
}
export function deleteAodDay(session: Session | null, day_id: string) {
  return invoke('admin-aod', session, { action: 'delete-day', day_id });
}
export function setAodOpen(session: Session | null, day_id: string, open: boolean) {
  return invoke('admin-aod', session, { action: 'set-open', day_id, open });
}
export function aodSignup(session: Session | null, day_id: string, slot_time: string) {
  return invoke('admin-aod', session, { action: 'signup', day_id, slot_time });
}
export function aodRemoveSignup(session: Session | null, id: string) {
  return invoke('admin-aod', session, { action: 'remove-signup', id });
}
