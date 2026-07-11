// =====================================================================
// calendar-api — custom entries on the main workspace Calendar.
// Reads via RLS (staff); writes via the admin-calendar edge function.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type CalendarEntryType = 'meeting' | 'deadline' | 'reminder' | 'social' | 'other';

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
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listCalendarEntries(): Promise<CalendarEntry[]> {
  const { data, error } = await sb.from('calendar_entries').select('*').order('entry_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as CalendarEntry[];
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-calendar', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveCalendarEntry(session: Session | null, entry: CalendarEntryInput) {
  return invoke(session, { action: 'save', entry });
}
export function deleteCalendarEntry(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}
