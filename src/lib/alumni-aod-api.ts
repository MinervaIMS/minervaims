// =====================================================================
// alumni-aod-api — alumni calls tracker + Association on Display slots.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
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

// 30-minute slots from 10:00 to 18:30 (each covers a half hour up to 19:00).
export const AOD_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 10; h < 19; h++) { out.push(`${String(h).padStart(2, '0')}:00`); out.push(`${String(h).padStart(2, '0')}:30`); }
  return out;
})();

async function invoke(fn: string, session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body, headers: { Authorization: `Bearer ${session?.access_token}` } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
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
