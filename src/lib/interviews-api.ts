// =====================================================================
// interviews-api — typed data access for the Interview Calendar.
// Staff and candidate actions both go through the admin-interviews edge
// function (service role), which enforces division scoping and the
// candidate booking rules. Candidates additionally read their own booking
// row directly via RLS where convenient.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
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

  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('admin-interviews', { body: body, session });
}


// =====================================================================
// "A slot a candidate could actually book."
// ---------------------------------------------------------------------
// The mirror of supabase/functions/_shared/interview-slots.ts, and it has
// to stay a mirror: the workspace uses it to decide whether an invitation
// may be offered, the server uses it to decide whether one may be sent,
// and the candidate's booking list is filtered by it. If they drifted, an
// examiner would be allowed to invite somebody to an empty calendar.
//
// `slot_date` is a date and `start_time` a time, both without a zone,
// typed on the association's own clock. So "still to come" is compared
// against the wall clock in Rome rather than against the reader's, which
// keeps the answer the same for a member travelling and for the server.
// =====================================================================
const ASSOCIATION_TZ = 'Europe/Rome';

/** `{ date: 'YYYY-MM-DD', time: 'HH:MM' }` right now, in Rome. */
export function nowInAssociationTime(at: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ASSOCIATION_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

/** Has this slot not happened yet? */
export function isFutureSlot(
  slot: { slot_date: string; start_time: string },
  now = nowInAssociationTime(),
): boolean {
  if (slot.slot_date > now.date) return true;
  if (slot.slot_date < now.date) return false;
  return (slot.start_time ?? '').slice(0, 5) > now.time;
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
