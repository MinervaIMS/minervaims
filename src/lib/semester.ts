// =====================================================================
// Semester model — single definition used across the workspace.
// Fall  = 1 September – 31 January   (belongs to the year it starts in)
// Spring = 1 February – 31 August
// "Reset" is derived, not scheduled: active views filter rows to the
// current semester by each row's own date, so on 1 Sep / 1 Feb the working
// area renews itself automatically and nothing is ever deleted.
// =====================================================================

export interface Semester {
  key: string;    // stable id, e.g. '2026-fall'
  label: string;  // 'Fall 2026'
  start: string;  // inclusive, YYYY-MM-DD
  end: string;    // inclusive, YYYY-MM-DD
  sort: number;   // monotonic for ordering
}

function build(year: number, season: 'fall' | 'spring'): Semester {
  return season === 'fall'
    ? { key: `${year}-fall`, label: `Fall ${year}`, start: `${year}-09-01`, end: `${year + 1}-01-31`, sort: year * 2 + 1 }
    : { key: `${year}-spring`, label: `Spring ${year}`, start: `${year}-02-01`, end: `${year}-08-31`, sort: year * 2 };
}

/** Semester a date belongs to. Accepts 'YYYY-MM-DD...' strings or Date. */
export function semesterOf(input: string | Date | null | undefined): Semester {
  const d = input ? new Date(input) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 9) return build(y, 'fall');
  if (m === 1) return build(y - 1, 'fall');
  return build(y, 'spring');
}

export function currentSemester(): Semester {
  return semesterOf(new Date());
}

export function previousSemester(of: Semester = currentSemester()): Semester {
  const [yearStr, season] = of.key.split('-');
  const year = parseInt(yearStr, 10);
  return season === 'fall' ? build(year, 'spring') : build(year - 1, 'fall');
}

/** True if the date falls inside the given semester. */
export function inSemester(date: string | Date | null | undefined, s: Semester): boolean {
  return !!date && semesterOf(date).key === s.key;
}

/** Distinct semesters present in a list of dated rows, newest first. */
export function semestersInData(dates: (string | null | undefined)[]): Semester[] {
  const map = new Map<string, Semester>();
  for (const d of dates) { if (d) { const s = semesterOf(d); map.set(s.key, s); } }
  return [...map.values()].sort((a, b) => b.sort - a.sort);
}
