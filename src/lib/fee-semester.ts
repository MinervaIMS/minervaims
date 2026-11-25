// =====================================================================
// THE SEMESTER A FEE COLLECTION IS FOR (Step 108).
// ---------------------------------------------------------------------
// A collection is named after its semester in the one form the Society
// uses everywhere: "Fall 2026" (1 September to 31 January) or "Spring
// 2027" (1 February to 31 August). The label was typed by hand, and a
// collection called "Autumn 2026" was opened beside Fall 2026 by
// mistake; so the label is now chosen from the semesters, checked again
// by `admin-fees`, and the register a collection freezes when it closes
// is the register of the semester its label names, never of the day it
// happened to close on (a collection closed late is still its own
// semester's).
//
// No imports, so that both Deno and the browser can load it; the copy in
// `supabase/functions/_shared/fee-semester.ts` is identical.
// =====================================================================

export interface FeeSemester {
  /** "2026-fall": the key the registers and the Time Machine use. */
  key: string;
  /** "Fall 2026": the collection's label. */
  label: string;
}

/** The only form a collection's label may take. */
export const FEE_SEMESTER_LABEL = /^(Fall|Spring) ([0-9]{4})$/;

/** The semester a canonical label names, or null for any other text. */
export function feeSemesterFromLabel(label: string | null | undefined): FeeSemester | null {
  const m = FEE_SEMESTER_LABEL.exec((label ?? '').trim());
  if (!m) return null;
  return { key: `${m[2]}-${m[1].toLowerCase()}`, label: `${m[1]} ${m[2]}` };
}

/** The semester a day falls in (Fall runs into January). */
export function feeSemesterOn(day: Date): FeeSemester {
  const y = day.getFullYear();
  const m = day.getMonth() + 1;
  if (m >= 9) return { key: `${y}-fall`, label: `Fall ${y}` };
  if (m === 1) return { key: `${y - 1}-fall`, label: `Fall ${y - 1}` };
  return { key: `${y}-spring`, label: `Spring ${y}` };
}

function step(s: FeeSemester, by: 1 | -1): FeeSemester {
  const [yearText, term] = s.key.split('-');
  const year = Number(yearText);
  if (by === 1) return term === 'fall' ? { key: `${year + 1}-spring`, label: `Spring ${year + 1}` } : { key: `${year}-fall`, label: `Fall ${year}` };
  return term === 'fall' ? { key: `${year}-spring`, label: `Spring ${year}` } : { key: `${year - 1}-fall`, label: `Fall ${year - 1}` };
}

/**
 * The semesters a collection can be opened for: the current one first,
 * then the next (opened early, once offers are accepted) and the one
 * just ended (collected late).
 */
export function feeSemesterChoices(now: Date = new Date()): FeeSemester[] {
  const current = feeSemesterOn(now);
  return [current, step(current, 1), step(current, -1)];
}

/**
 * The register a collection freezes when it closes: its label's
 * semester; for an older collection whose label is not in the canonical
 * form, the semester of the day it closes, as before.
 */
export function registerSemesterFor(label: string | null | undefined, closedOn: Date): FeeSemester {
  return feeSemesterFromLabel(label) ?? feeSemesterOn(closedOn);
}
