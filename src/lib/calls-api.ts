// =====================================================================
// calls-api: the phone call with the President or the Vice President
// (Step 97), after the division's interview and before the offer.
// Every action goes through the recruiting-calls edge function, which
// checks who is asking: the callers manage, a candidate books their own.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
import type { ApplicationStatus } from '@/lib/applications-api';
import type { OrgDivision } from '@/lib/roles';

export interface CallBooking {
  id: string;
  slot_id: string;
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  reminder_sent_at: string | null;
}

export interface CallSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  caller_id: string | null;
  caller_name: string | null;
  caller_phone: string;
  capacity: number;
  is_active: boolean;
  bookings: CallBooking[];
}

export interface CallCandidate {
  id: string;
  first_name: string;
  surname: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  semester_label: string;
  division: OrgDivision;
  call_invited_at: string | null;
  call_outcome: 'pass' | 'hold' | 'decline' | null;
  call_outcome_at: string | null;
  call_bookings_made: number;
  created_at: string;
}

export interface CallsOverview {
  slots: CallSlot[];
  candidates: CallCandidate[];
  me: { id: string; name: string; phone: string };
  minutes: number[];
}

export type CallOutcome = 'pass' | 'hold' | 'decline';

/** Smart planning: fifteen minutes unless another length is chosen. Mirrors the function. */
export const CALL_MINUTES = [10, 15, 20, 30] as const;
export const DEFAULT_CALL_MINUTES = 15;

/** Where a candidate may be invited from: after the interview, before a decision. */
export const CALL_INVITABLE: ApplicationStatus[] = ['interview_completed', 'on_hold_post_interview', 'plausible_offer'];
export const CALL_STAGES: ApplicationStatus[] = ['call_invitation_sent', 'call_confirmed', 'call_on_hold'];

/** The mirror of phoneError in the function, so the form says it first. */
export function phoneError(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return 'Add the phone number you will call from. Candidates receive it, so they recognise the call and can call back.';
  if (!/^\+?[0-9][0-9 ().-]{4,24}$/.test(v) || v.replace(/\D/g, '').length < 6) {
    return 'That is not a phone number. Use digits, spaces and an optional + with the country code, for example +39 333 123 4567.';
  }
  return null;
}

// `any` deliberately, as in the other recruiting clients: each caller narrows the shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('recruiting-calls', { body, session });
}

// ── The callers ──────────────────────────────────────────────────────
export async function callsOverview(session: Session | null): Promise<CallsOverview> {
  return await invoke(session, { action: 'overview' });
}
export async function createCallSlots(
  session: Session | null,
  range: { slot_date: string; start_time: string; end_time: string; slot_minutes: number; capacity: number; caller_phone: string },
): Promise<{ created: number; skipped_overlapping?: number }> {
  return await invoke(session, { action: 'create-slots', ...range });
}
export async function updateCallSlot(session: Session | null, id: string, updates: { caller_phone?: string; capacity?: number }) {
  return await invoke(session, { action: 'update-slot', id, ...updates });
}
export async function deleteCallSlot(session: Session | null, id: string) {
  return await invoke(session, { action: 'delete-slot', id });
}
export async function inviteToCall(session: Session | null, applicationId: string) {
  return await invoke(session, { action: 'invite', id: applicationId });
}
export async function recordCallOutcome(session: Session | null, applicationId: string, outcome: CallOutcome, notes: string) {
  return await invoke(session, { action: 'record-outcome', id: applicationId, outcome, notes });
}

// ── The candidate ────────────────────────────────────────────────────
export interface MyCallContext {
  invited: boolean;
  withdrawn?: boolean;
  done?: boolean;
  status?: ApplicationStatus;
  phone?: string;
  bookBy?: string | null;
  booking?: { id: string; slot: { slot_date: string; start_time: string; end_time: string; caller_name: string | null; caller_phone: string } | null } | null;
  changesLeft?: number;
}
export interface AvailableCallSlot { id: string; slot_date: string; start_time: string; end_time: string; caller_name: string | null }

export async function myCallContext(session: Session | null): Promise<MyCallContext> {
  return await invoke(session, { action: 'my-context' });
}
export async function availableCallSlots(session: Session | null): Promise<AvailableCallSlot[]> {
  return (await invoke(session, { action: 'list-available' })).slots as AvailableCallSlot[];
}
export async function bookCall(session: Session | null, slotId: string) {
  return await invoke(session, { action: 'book', slot_id: slotId });
}
export async function cancelCall(session: Session | null) {
  return await invoke(session, { action: 'cancel' });
}
