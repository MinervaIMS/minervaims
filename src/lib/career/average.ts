import {
  SYSTEM_BY_ID, weightedAverage,
  type CourseRow, type GradingSystem, type AverageResult,
} from '@/lib/career/grading';

// =====================================================================
// The calculation a member works on in GPA Converter > Weighted average,
// as it is kept on screen, in the browser and in their saved rows.
// =====================================================================

/** The range a grade must be in to count (honours included). */
function inScale(s: GradingSystem, v: number): boolean {
  const top = s.honours ? s.honours.value : s.max;
  return v >= s.min - 1e-9 && v <= top + 1e-9;
}

export interface Draft {
  /** Set when the calculation was opened from, or saved to, the account. */
  id: string | null;
  name: string;
  system: string;
  settings: { lodeValue: number };
  courses: CourseRow[];
}

export function newRowId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyRows(n = 3): CourseRow[] {
  return Array.from({ length: n }, () => ({ id: newRowId(), name: '', weight: null, grade: null }));
}

/** Rows with a grade outside the scale are left out of every figure. */
export function cleanRows(s: GradingSystem, rows: CourseRow[]): CourseRow[] {
  return rows.map((c) => (c.grade !== null && !inScale(s, c.grade) ? { ...c, grade: null } : c));
}

export function computeAverage(d: Draft): AverageResult {
  const s = SYSTEM_BY_ID[d.system];
  return weightedAverage(s, cleanRows(s, d.courses), d.settings);
}
