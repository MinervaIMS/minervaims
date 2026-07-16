// =====================================================================
// calendar-api — custom entries on the main workspace Calendar.
// Reads via RLS (staff); writes via the admin-calendar edge function.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type CalendarEntryType = 'meeting' | 'deadline' | 'reminder' | 'social' | 'other' | 'casa_committee' | 'casa_deadline';

export interface CalendarEntry {
  id: string;
  title: string;
  description: string | null;
  entry_date: string; // yyyy-mm-dd
  entry_type: CalendarEntryType;
  location: string | null;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

export interface CalendarEntryInput {
  id?: string;
  title: string;
  description?: string | null;
  entry_date: string;
  entry_type: CalendarEntryType;
  location?: string | null;
}

export const CALENDAR_ENTRY_LABELS: Record<CalendarEntryType, string> = {
  meeting: 'Meeting',
  deadline: 'Deadline',
  reminder: 'Reminder',
  social: 'Social',
  other: 'Other',
  casa_committee: 'CASA Committee Meeting',
  casa_deadline: 'Deadline: CASA Committee request submission',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listCalendarEntries(): Promise<CalendarEntry[]> {
  const { data, error } = await sb.from('calendar_entries').select('*').order('entry_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as CalendarEntry[];
}

// Writes go directly to the table under RLS (only authorised managers can write
// — see the can_manage_calendar policy), so no Edge Function deploy is needed.
export async function saveCalendarEntry(session: Session | null, entry: CalendarEntryInput) {
  const uid = session?.user?.id ?? null;
  const payload = {
    title: entry.title.trim(),
    description: entry.description?.trim() || null,
    entry_date: entry.entry_date,
    entry_type: entry.entry_type,
    location: entry.location?.trim() || null,
  };
  if (entry.id) {
    const { error } = await sb.from('calendar_entries').update(payload).eq('id', entry.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('calendar_entries').insert({ ...payload, created_by: uid });
    if (error) throw new Error(error.message);
  }
}

export async function deleteCalendarEntry(_session: Session | null, id: string) {
  const { error } = await sb.from('calendar_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Exam session breaks ────────────────────────────────────────────────
// Date ranges during which no gathering can be scheduled anywhere in the
// workspace. Reads under staff RLS; writes restricted to calendar managers
// (can_manage_calendar). The hard stop lives in database triggers, so no
// client can schedule around a break.

export interface ExamSession {
  id: string;
  label: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  created_at: string;
}

export async function listExamSessions(): Promise<ExamSession[]> {
  const { data, error } = await sb.from('exam_sessions').select('*').order('start_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as ExamSession[];
}

export async function saveExamSession(session: Session | null, input: { id?: string; label: string; start_date: string; end_date: string }) {
  const payload = { label: input.label.trim(), start_date: input.start_date, end_date: input.end_date };
  if (input.id) {
    const { error } = await sb.from('exam_sessions').update(payload).eq('id', input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('exam_sessions').insert({ ...payload, created_by: session?.user?.id ?? null });
    if (error) throw new Error(error.message);
  }
}

export async function deleteExamSession(id: string) {
  const { error } = await sb.from('exam_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** The exam session covering a yyyy-mm-dd date, if any. */
export function examSessionOn(sessions: ExamSession[], date: string): ExamSession | undefined {
  return sessions.find((s) => date >= s.start_date && date <= s.end_date);
}
