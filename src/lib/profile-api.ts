import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// What My Profile, Membership reads (Step 97B).
// ---------------------------------------------------------------------
// Two database functions that answer for the signed-in member only
// (migration 20261027090000): their role in every semester, from the
// rosters, and the reports that name them among their authors, by the
// same rule the report pages use to link an author to a person. Neither
// takes an argument, so nobody can ask for somebody else's.
// =====================================================================

type Rpc = (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc: Rpc = (fn) => (supabase.rpc as unknown as Rpc)(fn);

/** One semester and one role in the member's path through the Society. */
export interface CareerEntry {
  /** `2026-fall`, `2027-spring`. */
  semester: string;
  /** `Fall 2026`. */
  label: string;
  role: string;
  /** The rosters' division key (board, asset_management, equity, ...). */
  division: string;
  team: string | null;
  /** The current semester only: active, on_exchange, one_semester_pause. */
  status?: string;
}

export interface CareerHistory {
  /** False when the account is not yet linked to a person in the rosters. */
  linked: boolean;
  current_semester: string;
  current_label: string;
  /** Past semesters, newest first. */
  entries: CareerEntry[];
  /** The current semester, from the register; null when not on it. */
  current: CareerEntry | null;
}

export interface ProjectReport {
  id: string;
  title: string;
  /** The report's address, `/archive/<slug>`, once published. */
  slug: string | null;
  date: string | null;
  division: string | null;
  report_type: string | null;
  status: 'draft' | 'published' | 'blocked';
  /** The role printed beside the member's name on the cover. */
  role: string | null;
}

export interface MyProjects {
  linked: boolean;
  reports: ProjectReport[];
}

export async function myCareerHistory(): Promise<CareerHistory> {
  const { data, error } = await rpc('my_roster_history');
  // No answer at all is a failure too: the database has not got the
  // function yet, and the page says it could not be read.
  if (error || !data) throw new Error(error?.message || 'Your history could not be read.');
  return data as CareerHistory;
}

export async function myProjects(): Promise<MyProjects> {
  const { data, error } = await rpc('my_report_projects');
  // No answer at all is a failure too: the database has not got the
  // function yet, and the page says it could not be read.
  if (error || !data) throw new Error(error?.message || 'Your projects could not be read.');
  return data as MyProjects;
}

/** The academic year a semester belongs to: Fall 2026 and Spring 2027 are 2026/27. */
export function academicYearOf(semesterKey: string): string {
  const [y, term] = semesterKey.split('-');
  const start = term === 'fall' ? Number(y) : Number(y) - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Semesters in order: a larger number is later (Spring before Fall of the same year). */
export function semesterOrdinal(semesterKey: string): number {
  const [y, term] = semesterKey.split('-');
  return Number(y) * 2 + (term === 'fall' ? 1 : 0);
}
