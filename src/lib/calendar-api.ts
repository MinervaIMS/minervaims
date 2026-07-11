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
