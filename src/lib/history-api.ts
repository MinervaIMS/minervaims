import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// =====================================================================
// history-api — the Society's timeline (public read, managed writes).
// ---------------------------------------------------------------------
// One row per year. Reading is open, because /about shows it to everyone;
// writing goes through the admin-history edge function, which checks the
// role and re-applies every rule the register promises.
// =====================================================================

export type HistoryMediaKind = 'none' | 'report' | 'number' | 'image';

export interface HistoryEventRow {
  year: number;
  title: string;
  description: string;
  href: string | null;
  media_kind: HistoryMediaKind;
  report_file_id: string | null;
  number_value: number | null;
  number_label: string | null;
  image_url: string | null;
  image_alt: string | null;
  is_active: boolean;
}

export type HistoryEventInput = Omit<HistoryEventRow, never>;

/**
 * The year the Society was founded: the timeline cannot start earlier.
 *
 * MINERVA WAS FOUNDED IN 2017, not 2019. The whole project was built on the
 * later date; this constant is the one the rail, the workspace's year list
 * and the edge function's guard all read, so correcting it here moves every
 * one of them together.
 */
export const HISTORY_FIRST_YEAR = 2017;

export const EMPTY_HISTORY_EVENT = (year: number): HistoryEventInput => ({
  year,
  title: '',
  description: '',
  href: null,
  media_kind: 'none',
  report_file_id: null,
  number_value: null,
  number_label: null,
  image_url: null,
  image_alt: null,
  is_active: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

/** Public read: every year on the rail, oldest first. */
export async function listHistoryEvents(): Promise<HistoryEventRow[]> {
  const { data, error } = await sb.from('history_events').select('*').order('year', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as HistoryEventRow[];
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-history', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveHistoryEvent(session: Session | null, event: HistoryEventInput) {
  return invoke(session, { action: 'save', event });
}

export function deleteHistoryEvent(session: Session | null, year: number) {
  return invoke(session, { action: 'delete', year });
}

/**
 * Every year from the founding to today, whether or not it carries an
 * event. This is what makes the subsection grow on its own: a new January
 * adds a year to the list, ready to be filled in or left quiet.
 */
export function timelineYears(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = HISTORY_FIRST_YEAR; y <= now; y += 1) years.push(y);
  return years;
}
