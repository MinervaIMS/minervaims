// =====================================================================
// interviews-api — typed data access for the Interview Calendar.
// Staff and candidate actions both go through the admin-interviews edge
// function (service role), which enforces division scoping and the
// candidate booking rules. Candidates additionally read their own booking
// row directly via RLS where convenient.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';
import type { ApplicationStatus } from '@/lib/applications-api';

export interface InterviewSlot {
  id: string;
  division: OrgDivision;
  slot_date: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  examiner_id: string | null;
  examiner_name: string | null;
  is_active: boolean;
  is_booked: boolean;
}

export interface SlotBooking {
  slot_id: string;
  candidate_name: string;
  candidate_email: string;
  application_id: string;
}

export interface StaffSlot extends InterviewSlot {
  booking: SlotBooking | null;
}

export interface StaffSlotsResult {
  slots: StaffSlot[];
  canManage: boolean;
  viewDivisions: OrgDivision[];
  manageDivisions: OrgDivision[];
}

export interface CandidateContext {
  invited: boolean;
  division?: OrgDivision | null;
  status?: ApplicationStatus;
  booking?: {
    id: string;
    slot_id: string;
    division: OrgDivision;
    slot: InterviewSlot | null;
  } | null;
}

export type AvailableSlot = Pick<
  InterviewSlot,
  'id' | 'division' | 'slot_date' | 'start_time' | 'end_time' | 'examiner_name' | 'meeting_link'
>;

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-interviews', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Staff ────────────────────────────────────────────────────────────────
export async function listSlots(session: Session | null, division: OrgDivision): Promise<StaffSlotsResult> {
  return await invoke(session, { action: 'list', division });
}
export async function createSlot(
  session: Session | null,
  slot: { division: OrgDivision; slot_date: string; start_time: string; end_time: string; meeting_link?: string },
) {
  return await invoke(session, { action: 'create-slot', ...slot });
}
export async function bulkCreateSlots(
  session: Session | null,
  range: { division: OrgDivision; slot_date: string; start_time: string; end_time: string; meeting_link?: string },
): Promise<{ created: number }> {
  return await invoke(session, { action: 'bulk-create', ...range });
}
export async function updateSlot(
  session: Session | null,
  id: string,
  updates: { slot_date?: string; start_time?: string; end_time?: string; meeting_link?: string },
) {
  return await invoke(session, { action: 'update-slot', id, ...updates });
}
export async function deleteSlot(session: Session | null, id: string) {
  return await invoke(session, { action: 'delete-slot', id });
}
export async function clearDivisionSlots(session: Session | null, division: OrgDivision) {
  return await invoke(session, { action: 'clear-division', division });
}

// ── Candidate ─────────────────────────────────────────────────────────────
export async function getInterviewContext(session: Session | null): Promise<CandidateContext> {
  return await invoke(session, { action: 'my-context' });
}
export async function listAvailableSlots(session: Session | null): Promise<AvailableSlot[]> {
  return (await invoke(session, { action: 'list-available' })).slots as AvailableSlot[];
}
export async function bookSlot(session: Session | null, slotId: string) {
  return await invoke(session, { action: 'book', slot_id: slotId });
}
export async function cancelBooking(session: Session | null) {
  return await invoke(session, { action: 'cancel' });
}
