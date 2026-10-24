import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

// =====================================================================
// The semester rosters, as the workspace reads and changes them (Step 94).
// ---------------------------------------------------------------------
// Reads are database functions that check the caller (migration
// 20261025090000): the Board and Operations read every division, members
// from Analyst up their own; person codes reach only the President, the
// Vice-President and the Head of Operations. Changes and the PDF go
// through the admin-rosters function, which records each one.
// =====================================================================

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc)(fn, args);

async function read<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message || 'The roster could not be read.');
  return data as T;
}

export type RosterScope = 'all' | 'division' | 'none';

export interface RosterSemesterSummary {
  key: string;
  label: string;
  live: boolean;
  count: number;
}

export interface RosterIndex {
  scope: RosterScope;
  divisions: string[];
  can_edit: boolean;
  show_codes: boolean;
  current: string;
  semesters: RosterSemesterSummary[];
}

export interface RosterRow {
  /** Null for the current semester, which is read live from the register. */
  entry_id: string | null;
  /** Only for readers who see every division. */
  person_id: string | null;
  /** The internal person code, for the roles that manage people. */
  code: string | null;
  first_name: string;
  surname: string;
  role: string;
  division: string;
  team: string | null;
  office_rank: number | null;
  /** The current semester: on_exchange or one_semester_pause, else active. */
  status: string | null;
  source: 'live' | 'history' | 'register' | 'close' | 'edit';
}

export interface RosterSemester {
  key: string;
  label: string;
  live: boolean;
  scope: RosterScope;
  divisions: string[];
  can_edit: boolean;
  show_codes: boolean;
  rows: RosterRow[];
}

export interface RosterPersonEntry {
  entry_id?: string;
  semester: string;
  label: string;
  role: string;
  division: string;
  team: string | null;
  source: string;
  status?: string | null;
}

export interface RosterPerson {
  person_id: string;
  code: string | null;
  first_name: string;
  surname: string;
  public_hidden: boolean;
  is_member: boolean;
  is_alumnus: boolean;
  entries: RosterPersonEntry[];
  current: RosterPersonEntry | null;
  can_edit: boolean;
}

export interface PendingAlumnus {
  id: string;
  first_name: string;
  surname: string;
  last_semester: string;
  last_role: string;
  career: string;
}

export const fetchRosterIndex = () => read<RosterIndex>('roster_semesters');
export const fetchRosterSemester = (key: string) => read<RosterSemester>('roster_semester', { p_key: key });
export const fetchRosterPerson = (personId: string) => read<RosterPerson>('roster_person', { p_person: personId });
export const fetchPendingAlumni = () => read<PendingAlumnus[]>('alumni_pending_list');

// ── Changes (the President and the Vice-President) ───────────────────

export interface RosterEntryInput {
  role: string;
  division: string;
  team: string | null;
}

export function updateRosterEntry(session: Session | null, entryId: string, input: RosterEntryInput) {
  return invokeFunction('admin-rosters', { body: { action: 'update', entry_id: entryId, ...input }, session });
}

export function deleteRosterEntry(session: Session | null, entryId: string) {
  return invokeFunction('admin-rosters', { body: { action: 'delete', entry_id: entryId }, session });
}

export function addRosterEntry(
  session: Session | null,
  semesterKey: string,
  who: { person_id: string } | { first_name: string; surname: string },
  input: RosterEntryInput,
) {
  return invokeFunction('admin-rosters', { body: { action: 'add', semester_key: semesterKey, ...who, ...input }, session });
}

export function setPublicHidden(session: Session | null, personId: string, hidden: boolean) {
  return invokeFunction('admin-rosters', { body: { action: 'set-public-hidden', person_id: personId, hidden }, session });
}

export function dismissPendingAlumnus(session: Session | null, pendingId: string) {
  return invokeFunction('admin-rosters', { body: { action: 'pending-dismiss', pending_id: pendingId }, session });
}

export async function searchPeople(session: Session | null, q: string): Promise<{ id: string; first_name: string; surname: string }[]> {
  const res = await invokeFunction<{ people: { id: string; first_name: string; surname: string }[] }>(
    'admin-rosters', { body: { action: 'search-people', q }, session },
  );
  return res?.people ?? [];
}

/**
 * The roster as a PDF, made by the server (and recorded there as a
 * download): saved under the name the server gives it.
 */
export async function downloadRosterPdf(session: Session | null, semesterKey: string): Promise<void> {
  const res = await invokeFunction<{ file_name: string; pdf: string }>(
    'admin-rosters', { body: { action: 'pdf', semester_key: semesterKey }, session },
  );
  if (!res?.pdf) throw new Error('The PDF could not be prepared.');
  const bin = atob(res.pdf);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = res.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
