import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

// =====================================================================
// The Time Machine and the person record, as the workspace reads and
// changes them (Steps 94 and 94B).
// ---------------------------------------------------------------------
// Reads are database functions that check the caller (migrations
// 20261025090000 and 20261028090000): the Board and Operations read every
// division, members from Analyst up their own; a person's record is for
// those who read every division; person codes reach only the President,
// the Vice-President and the Head of Operations. Changes and the PDF go
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

export interface RosterRow {
  entry_id: string;
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
  source: 'history' | 'register' | 'close' | 'edit';
  /** In the official register frozen when that semester's fee collection closed. */
  in_register: boolean;
}

export interface TimeMachineSemester {
  key: string;
  label: string;
  /** How many people the semester lists. */
  count: number;
  /** The official register, where the fee collection froze one (readers of every division only). */
  register: { count: number; frozen_at: string } | null;
  rows: RosterRow[];
}

export interface TimeMachine {
  scope: RosterScope;
  divisions: string[];
  can_edit: boolean;
  show_codes: boolean;
  /** The current semester, which People > Members shows. */
  current: string;
  current_label: string;
  /** Every past semester, newest first. */
  semesters: TimeMachineSemester[];
}

export interface PersonCareerEntry {
  semester: string;
  label: string;
  role: string;
  division: string;
  team: string | null;
  source: string;
  live: boolean;
  status?: string | null;
}

export interface PersonReport {
  id: string;
  slug: string | null;
  title: string;
  date: string;
  division: string;
  fund: string | null;
  /** The role printed next to the name in the report. */
  role: string | null;
}

export interface PersonRecord {
  person_id: string;
  code: string | null;
  first_name: string;
  surname: string;
  public_hidden: boolean;
  /** Ever on the Board, so ever in the public past Boards. */
  held_office: boolean;
  current: string;
  career: PersonCareerEntry[];
  reports: PersonReport[];
  member: { id: string; role: string; division: string; membership_status: string; linkedin_url: string | null } | null;
  alumni: { id: string; graduation_year: number; company: string | null; job_area: string | null; city: string | null; linkedin_url: string | null }[];
  can_edit: boolean;
}

export type PersonRecordKind = 'person' | 'member' | 'alumni';

export interface PeopleOverviewItem {
  person_id: string;
  /** The first semester recorded, "2023-fall". */
  since: string | null;
  semesters: number;
  reports: number;
}

export type PeopleOverview =
  | { visible: false }
  | { visible: true; current: string; members: Record<string, PeopleOverviewItem>; alumni: Record<string, PeopleOverviewItem> };

export interface PendingAlumnus {
  id: string;
  first_name: string;
  surname: string;
  last_semester: string;
  last_role: string;
  career: string;
}

export const fetchTimeMachine = () => read<TimeMachine>('time_machine');
export const fetchPersonRecord = (kind: PersonRecordKind, id: string) => read<PersonRecord>('person_record', { p_kind: kind, p_id: id });
export const fetchPeopleOverview = () => read<PeopleOverview>('people_overview');
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
