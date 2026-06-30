// =====================================================================
// alumni-aod-api — alumni calls tracker + Association on Display slots.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';

export type CallStatus = 'planned' | 'invited' | 'accepted' | 'completed' | 'declined';

export interface AlumniCall {
  id: string;
  alumnus_name: string;
  former_role: string | null;
  current_company: string | null;
  current_position: string | null;
  division: OrgDivision | null;
  responsible_person: string | null;
  planned_date: string | null;
  status: CallStatus;
  notes: string | null;
}

export interface AlumniCallInput {
  id?: string;
  alumnus_name: string;
  former_role?: string | null;
  current_company?: string | null;
  current_position?: string | null;
  division?: OrgDivision | null;
  responsible_person?: string | null;
  planned_date?: string | null;
  status?: CallStatus;
  notes?: string | null;
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
