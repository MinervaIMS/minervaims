// =====================================================================
// Grading systems, and how a grade in one reads in another.
// ---------------------------------------------------------------------
// There is no official, universal conversion between grading systems:
// every admissions office and every employer uses its own table. What
// this module does is the thing those tables have in common, done
// transparently.
//
// EQUIVALENCE BANDS (the default). Each system is described by six
// anchors, the grades that mean the same thing everywhere:
//
//   0  pass            the lowest passing grade
//   1  satisfactory    a sound but ordinary result
//   2  good
//   3  very good
//   4  excellent       the grade that marks the best students
//   5  top             the top of the scale, honours included
//
// A grade is placed between two anchors of its own system and read at
// the same position between the same two anchors of the other one. The
// anchors are drawn from the equivalence tables most commonly used for
// these countries (university conversion tables, the ECTS grade scale,
// the classifications used by UK admissions); they are indicative.
//
// LINEAR (the modified Bavarian formula). The method German universities
// use for foreign grades: the grade's position between the pass mark and
// the best mark, carried over proportionally. Simple and official in
// Germany, harsher than the bands in the middle of most scales.
//
// Where a system flattens at the top (4.0 is both "excellent" and "top"
// in a US GPA), the reverse conversion is a RANGE, and it is shown as one.
// =====================================================================

export type Region = 'Italy' | 'UK and Ireland' | 'North America' | 'Europe';

export interface GradeOption { value: number; label: string }

export interface GradingSystem {
  id: string;
  name: string;
  region: Region;
  /** One line under the name: the scale in words. */
  scale: string;
  /** Input limits. */
  min: number;
  max: number;
  step: number;
  /** Most systems: yes. Germany and Austria: 1.0 is the best grade. */
  higherIsBetter: boolean;
  /** Lowest passing grade. */
  pass: number;
  /** Best grade, for the linear method. */
  best: number;
  /** pass, satisfactory, good, very good, excellent, top. */
  anchors: [number, number, number, number, number, number];
  /** Decimals when showing a converted value. */
  decimals: number;
  /** Always show every decimal (a GPA is written 3.50, not 3.5). */
  fixedDecimals?: boolean;
  /** Discrete grades (letters, the Danish scale): converted values snap to these. */
  options?: GradeOption[];
  /** For the calculator: choose each course's grade from these instead of typing it. */
  entryOptions?: GradeOption[];
  /** Named bands: the first whose threshold the value reaches (in the better direction). */
  bands: { at: number; label: string }[];
  /** Label for a value below the pass mark. */
  failLabel: string;
  /** Can courses be averaged in this system (the calculator)? */
  averageable: boolean;
  /** Has an honours grade above the maximum ("e lode"). */
  honours?: { value: number; label: string };
  note?: string;
}

// ---------------------------------------------------------------------
// Letter scales, shared.
// ---------------------------------------------------------------------
const US_LETTERS: GradeOption[] = [
  { value: 4.0, label: 'A' }, { value: 3.7, label: 'A-' }, { value: 3.3, label: 'B+' }, { value: 3.0, label: 'B' },
  { value: 2.7, label: 'B-' }, { value: 2.3, label: 'C+' }, { value: 2.0, label: 'C' }, { value: 1.7, label: 'C-' },
  { value: 1.3, label: 'D+' }, { value: 1.0, label: 'D' }, { value: 0, label: 'F' },
];
const CA_LETTERS: GradeOption[] = [
  { value: 4.33, label: 'A+' }, { value: 4.0, label: 'A' }, { value: 3.67, label: 'A-' }, { value: 3.33, label: 'B+' },
  { value: 3.0, label: 'B' }, { value: 2.67, label: 'B-' }, { value: 2.33, label: 'C+' }, { value: 2.0, label: 'C' },
  { value: 1.67, label: 'C-' }, { value: 1.33, label: 'D+' }, { value: 1.0, label: 'D' }, { value: 0, label: 'F' },
];
const ECTS_LETTERS: GradeOption[] = [
  { value: 5, label: 'A' }, { value: 4, label: 'B' }, { value: 3, label: 'C' }, { value: 2, label: 'D' }, { value: 1, label: 'E' }, { value: 0, label: 'F' },
];
const bandsFrom = (opts: GradeOption[]) => opts.filter((o) => o.value > 0).map((o) => ({ at: o.value, label: o.label }));

export const SYSTEMS: GradingSystem[] = [
  // ── Italy ────────────────────────────────────────────────────────────
  {
    id: 'it30', name: 'Italy and Bocconi (exams, /30)', region: 'Italy', scale: '18 to 30 e lode; 18 is the pass mark',
    min: 18, max: 30, step: 0.01, higherIsBetter: true, pass: 18, best: 30,
    anchors: [18, 22, 25, 27, 29, 31], decimals: 2,
    bands: [{ at: 31, label: '30 e lode' }, { at: 29, label: 'Excellent' }, { at: 27, label: 'Very good' }, { at: 25, label: 'Good' }, { at: 22, label: 'Satisfactory' }, { at: 18, label: 'Pass' }],
    failLabel: 'Below the pass mark', averageable: true,
    honours: { value: 31, label: '30 e lode' },
    note: 'Exams and the weighted average (media ponderata). "30 e lode" is the top grade.',
  },
  {
    id: 'it110', name: 'Italy and Bocconi (degree mark, /110)', region: 'Italy', scale: '66 to 110 e lode',
    min: 66, max: 110, step: 0.01, higherIsBetter: true, pass: 66, best: 110,
    anchors: [66, 81, 92, 99, 106, 111], decimals: 1,
    bands: [{ at: 111, label: '110 e lode' }, { at: 106, label: 'Excellent' }, { at: 99, label: 'Very good' }, { at: 92, label: 'Good' }, { at: 81, label: 'Satisfactory' }, { at: 66, label: 'Pass' }],
    failLabel: 'Below the pass mark', averageable: false,
    honours: { value: 111, label: '110 e lode' },
    note: 'The final degree mark. Its starting point is the /30 average times 110 divided by 30.',
  },
  // ── UK and Ireland ───────────────────────────────────────────────────
  {
    id: 'uk_ug', name: 'United Kingdom (undergraduate, %)', region: 'UK and Ireland', scale: '0 to 100; 40 is the pass mark',
    min: 0, max: 100, step: 0.1, higherIsBetter: true, pass: 40, best: 100,
    anchors: [40, 50, 60, 65, 70, 85], decimals: 1,
    bands: [{ at: 70, label: 'First-class honours' }, { at: 60, label: 'Upper second (2:1)' }, { at: 50, label: 'Lower second (2:2)' }, { at: 40, label: 'Third-class honours' }],
    failLabel: 'Fail', averageable: true,
  },
  {
    id: 'uk_pg', name: "United Kingdom (Master's, %)", region: 'UK and Ireland', scale: '0 to 100; 50 is the pass mark',
    min: 0, max: 100, step: 0.1, higherIsBetter: true, pass: 50, best: 100,
    anchors: [50, 55, 60, 65, 70, 85], decimals: 1,
    bands: [{ at: 70, label: 'Distinction' }, { at: 60, label: 'Merit' }, { at: 50, label: 'Pass' }],
    failLabel: 'Fail', averageable: true,
  },
  {
    id: 'ie', name: 'Ireland (%)', region: 'UK and Ireland', scale: '0 to 100; 40 is the pass mark',
    min: 0, max: 100, step: 0.1, higherIsBetter: true, pass: 40, best: 100,
    anchors: [40, 50, 60, 65, 70, 85], decimals: 1,
    bands: [{ at: 70, label: 'First class honours' }, { at: 60, label: 'Second class honours, grade 1 (2.1)' }, { at: 50, label: 'Second class honours, grade 2 (2.2)' }, { at: 45, label: 'Third class honours' }, { at: 40, label: 'Pass' }],
    failLabel: 'Fail', averageable: true,
  },
  // ── North America ────────────────────────────────────────────────────
  {
    id: 'us_gpa', name: 'United States (GPA, 4.0)', region: 'North America', scale: '0.0 to 4.0; letter grades A to F',
    min: 0, max: 4, step: 0.01, higherIsBetter: true, pass: 1.0, best: 4.0,
    anchors: [1.0, 2.0, 3.0, 3.5, 3.85, 4.0], decimals: 2, fixedDecimals: true,
    entryOptions: US_LETTERS,
    bands: [{ at: 3.85, label: 'A' }, { at: 3.5, label: 'A-' }, { at: 3.15, label: 'B+' }, { at: 2.85, label: 'B' }, { at: 2.5, label: 'B-' }, { at: 2.15, label: 'C+' }, { at: 1.85, label: 'C' }, { at: 1.5, label: 'C-' }, { at: 1.15, label: 'D+' }, { at: 1.0, label: 'D' }],
    failLabel: 'F', averageable: true,
  },
  {
    id: 'us_pct', name: 'United States (percentage)', region: 'North America', scale: '0 to 100; A from 93, D from 60',
    min: 0, max: 100, step: 0.1, higherIsBetter: true, pass: 60, best: 100,
    anchors: [60, 73, 83, 88, 92, 100], decimals: 1,
    bands: [{ at: 93, label: 'A' }, { at: 90, label: 'A-' }, { at: 87, label: 'B+' }, { at: 83, label: 'B' }, { at: 80, label: 'B-' }, { at: 77, label: 'C+' }, { at: 73, label: 'C' }, { at: 70, label: 'C-' }, { at: 67, label: 'D+' }, { at: 60, label: 'D' }],
    failLabel: 'F', averageable: true,
  },
  {
    id: 'ca_gpa', name: 'Canada (GPA, 4.33)', region: 'North America', scale: '0.0 to 4.33; A+ is 4.33',
    min: 0, max: 4.33, step: 0.01, higherIsBetter: true, pass: 1.0, best: 4.33,
    anchors: [1.0, 2.0, 3.0, 3.5, 4.0, 4.33], decimals: 2, fixedDecimals: true,
    entryOptions: CA_LETTERS,
    bands: [{ at: 4.17, label: 'A+' }, { at: 3.84, label: 'A' }, { at: 3.5, label: 'A-' }, { at: 3.17, label: 'B+' }, { at: 2.84, label: 'B' }, { at: 2.5, label: 'B-' }, { at: 2.17, label: 'C+' }, { at: 1.84, label: 'C' }, { at: 1.5, label: 'C-' }, { at: 1.17, label: 'D+' }, { at: 1.0, label: 'D' }],
    failLabel: 'F', averageable: true,
  },
  {
    id: 'ca_pct', name: 'Canada (percentage)', region: 'North America', scale: '0 to 100; 50 is the pass mark',
    min: 0, max: 100, step: 0.1, higherIsBetter: true, pass: 50, best: 100,
    anchors: [50, 60, 72, 77, 85, 95], decimals: 1,
    bands: [{ at: 90, label: 'A+' }, { at: 85, label: 'A' }, { at: 80, label: 'A-' }, { at: 76, label: 'B+' }, { at: 72, label: 'B' }, { at: 68, label: 'B-' }, { at: 64, label: 'C+' }, { at: 60, label: 'C' }, { at: 55, label: 'C-' }, { at: 50, label: 'D' }],
    failLabel: 'F', averageable: true,
  },
  // ── Europe ───────────────────────────────────────────────────────────
  {
    id: 'ects', name: 'ECTS grade (A to F)', region: 'Europe', scale: 'A to E pass, F fail',
    min: 0, max: 5, step: 1, higherIsBetter: true, pass: 1, best: 5,
    anchors: [1, 2, 3, 4, 5, 5], decimals: 0, options: ECTS_LETTERS, entryOptions: ECTS_LETTERS,
    bands: bandsFrom(ECTS_LETTERS), failLabel: 'F', averageable: false,
    note: 'The European credit transfer grade, also used by Sweden and Norway (A to F).',
  },
  {
    id: 'fr', name: 'France (/20)', region: 'Europe', scale: '0 to 20; 10 is the pass mark',
    min: 0, max: 20, step: 0.01, higherIsBetter: true, pass: 10, best: 20,
    anchors: [10, 11, 12, 14, 16, 18], decimals: 2,
    bands: [{ at: 16, label: 'Très bien' }, { at: 14, label: 'Bien' }, { at: 12, label: 'Assez bien' }, { at: 10, label: 'Passable' }],
    failLabel: 'Ajourné (fail)', averageable: true,
  },
  {
    id: 'de', name: 'Germany (1.0 to 5.0)', region: 'Europe', scale: '1.0 is the best, 4.0 the pass mark',
    min: 1, max: 5, step: 0.1, higherIsBetter: false, pass: 4.0, best: 1.0,
    anchors: [4.0, 3.2, 2.5, 1.8, 1.3, 1.0], decimals: 2,
    bands: [{ at: 1.5, label: 'Sehr gut (very good)' }, { at: 2.5, label: 'Gut (good)' }, { at: 3.5, label: 'Befriedigend (satisfactory)' }, { at: 4.0, label: 'Ausreichend (sufficient)' }],
    failLabel: 'Nicht bestanden (fail)', averageable: true,
  },
  {
    id: 'at', name: 'Austria (1 to 5)', region: 'Europe', scale: '1 is the best, 4 the pass mark',
    min: 1, max: 5, step: 0.1, higherIsBetter: false, pass: 4.0, best: 1.0,
    anchors: [4.0, 3.3, 2.6, 2.0, 1.4, 1.0], decimals: 2,
    bands: [{ at: 1.5, label: 'Sehr gut' }, { at: 2.5, label: 'Gut' }, { at: 3.5, label: 'Befriedigend' }, { at: 4.0, label: 'Genügend' }],
    failLabel: 'Nicht genügend (fail)', averageable: true,
  },
  {
    id: 'ch', name: 'Switzerland (1 to 6)', region: 'Europe', scale: '6 is the best, 4 the pass mark',
    min: 1, max: 6, step: 0.05, higherIsBetter: true, pass: 4, best: 6,
    anchors: [4, 4.5, 5, 5.25, 5.5, 6], decimals: 2,
    bands: [{ at: 5.5, label: 'Excellent' }, { at: 5, label: 'Very good' }, { at: 4.5, label: 'Good' }, { at: 4, label: 'Sufficient' }],
    failLabel: 'Insufficient (fail)', averageable: true,
  },
  {
    id: 'es', name: 'Spain (/10)', region: 'Europe', scale: '0 to 10; 5 is the pass mark',
    min: 0, max: 10, step: 0.01, higherIsBetter: true, pass: 5, best: 10,
    anchors: [5, 6, 7, 8, 9, 10], decimals: 2,
    bands: [{ at: 10, label: 'Matrícula de honor' }, { at: 9, label: 'Sobresaliente' }, { at: 7, label: 'Notable' }, { at: 5, label: 'Aprobado' }],
    failLabel: 'Suspenso (fail)', averageable: true,
  },
  {
    id: 'pt', name: 'Portugal (/20)', region: 'Europe', scale: '0 to 20; 10 is the pass mark',
    min: 0, max: 20, step: 0.01, higherIsBetter: true, pass: 10, best: 20,
    anchors: [10, 12, 14, 15.5, 17, 19], decimals: 2,
    bands: [{ at: 18, label: 'Excelente' }, { at: 16, label: 'Muito bom' }, { at: 14, label: 'Bom' }, { at: 10, label: 'Suficiente' }],
    failLabel: 'Fail', averageable: true,
  },
  {
    id: 'be', name: 'Belgium (/20)', region: 'Europe', scale: '0 to 20; 10 is the pass mark',
    min: 0, max: 20, step: 0.01, higherIsBetter: true, pass: 10, best: 20,
    anchors: [10, 11, 13, 14.5, 16, 18], decimals: 2,
    bands: [{ at: 18, label: 'Highest distinction' }, { at: 16, label: 'High distinction' }, { at: 14, label: 'Distinction' }, { at: 12, label: 'Satisfaction' }, { at: 10, label: 'Pass' }],
    failLabel: 'Fail', averageable: true,
  },
  {
    id: 'nl', name: 'Netherlands (/10)', region: 'Europe', scale: '1 to 10; 5.5 is the pass mark',
    min: 1, max: 10, step: 0.01, higherIsBetter: true, pass: 5.5, best: 10,
    anchors: [5.5, 6.3, 7, 7.5, 8, 9], decimals: 2,
    bands: [{ at: 8, label: 'Zeer goed (very good)' }, { at: 7, label: 'Goed (good)' }, { at: 6, label: 'Voldoende (sufficient)' }, { at: 5.5, label: 'Pass' }],
    failLabel: 'Onvoldoende (fail)', averageable: true,
    note: 'Grades of 9 and 10 are rarely awarded in the Netherlands.',
  },
  {
    id: 'gr', name: 'Greece (/10)', region: 'Europe', scale: '0 to 10; 5 is the pass mark',
    min: 0, max: 10, step: 0.01, higherIsBetter: true, pass: 5, best: 10,
    anchors: [5, 5.8, 6.5, 7.5, 8.5, 10], decimals: 2,
    bands: [{ at: 8.5, label: 'Excellent (Arista)' }, { at: 6.5, label: 'Very good (Lian kalos)' }, { at: 5, label: 'Good (Kalos)' }],
    failLabel: 'Fail', averageable: true,
  },
  {
    id: 'pl', name: 'Poland (2 to 5)', region: 'Europe', scale: '5 is the best, 3 the pass mark',
    min: 2, max: 5, step: 0.01, higherIsBetter: true, pass: 3, best: 5,
    anchors: [3, 3.5, 4, 4.5, 5, 5], decimals: 2,
    bands: [{ at: 5, label: 'Bardzo dobry (very good)' }, { at: 4.5, label: 'Dobry plus' }, { at: 4, label: 'Dobry (good)' }, { at: 3.5, label: 'Dostateczny plus' }, { at: 3, label: 'Dostateczny (sufficient)' }],
    failLabel: 'Niedostateczny (fail)', averageable: true,
  },
  {
    id: 'dk', name: 'Denmark (7-point scale)', region: 'Europe', scale: '-3 to 12; 02 is the pass mark',
    min: -3, max: 12, step: 0.1, higherIsBetter: true, pass: 2, best: 12,
    anchors: [2, 4, 7, 10, 12, 12], decimals: 0,
    options: [{ value: 12, label: '12' }, { value: 10, label: '10' }, { value: 7, label: '7' }, { value: 4, label: '4' }, { value: 2, label: '02' }, { value: 0, label: '00' }, { value: -3, label: '-3' }],
    entryOptions: [{ value: 12, label: '12' }, { value: 10, label: '10' }, { value: 7, label: '7' }, { value: 4, label: '4' }, { value: 2, label: '02' }, { value: 0, label: '00' }, { value: -3, label: '-3' }],
    bands: [{ at: 12, label: 'Excellent' }, { at: 10, label: 'Very good' }, { at: 7, label: 'Good' }, { at: 4, label: 'Fair' }, { at: 2, label: 'Adequate' }],
    failLabel: 'Fail', averageable: true,
    note: 'Averages on the Danish scale are decimals; single grades are one of seven values.',
  },
  {
    id: 'fi', name: 'Finland (0 to 5)', region: 'Europe', scale: '5 is the best, 1 the pass mark',
    min: 0, max: 5, step: 0.01, higherIsBetter: true, pass: 1, best: 5,
    anchors: [1, 2, 3, 4, 5, 5], decimals: 2,
    bands: [{ at: 5, label: 'Excellent' }, { at: 4, label: 'Very good' }, { at: 3, label: 'Good' }, { at: 2, label: 'Satisfactory' }, { at: 1, label: 'Sufficient' }],
    failLabel: 'Fail', averageable: true,
  },
];

export const SYSTEM_BY_ID: Record<string, GradingSystem> = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));
export const REGIONS: Region[] = ['Italy', 'UK and Ireland', 'North America', 'Europe'];

export type ConversionMethod = 'bands' | 'linear';

/** Is `a` at least as good as `b` in this system? */
function atLeastAsGood(s: GradingSystem, a: number, b: number): boolean {
  return s.higherIsBetter ? a >= b - 1e-9 : a <= b + 1e-9;
}

/** Is this value a pass? */
export function passes(s: GradingSystem, value: number): boolean {
  return atLeastAsGood(s, value, s.pass);
}

/** The named band a value falls in, or the fail label. */
export function bandOf(s: GradingSystem, value: number): string {
  if (!passes(s, value)) return s.failLabel;
  for (const b of s.bands) if (atLeastAsGood(s, value, b.at)) return b.label;
  return s.bands[s.bands.length - 1]?.label ?? '';
}

/** A value as people write it in that system. */
export function formatGrade(s: GradingSystem, value: number): string {
  if (s.honours && value >= s.honours.value - 1e-9) return s.honours.label;
  if (s.options) {
    const opt = s.options.find((o) => Math.abs(o.value - value) < 1e-9);
    if (opt) return opt.label;
  }
  const fixed = value.toFixed(s.decimals);
  if (s.decimals === 0 || s.fixedDecimals) return fixed;
  // 27.50 reads as 27.5 and 28.00 as 28.
  return String(Number(fixed));
}

// ---------------------------------------------------------------------
// The equivalence-band method: grade -> level (0 pass .. 5 top) -> grade.
// ---------------------------------------------------------------------

/**
 * Where a grade sits among its system's anchors, as a level from 0 (pass)
 * to 5 (top). Returns an interval, because a flat stretch of anchors (a
 * US 4.0 is both "excellent" and "top") covers several levels at once.
 * Below the pass mark it returns null.
 */
export function levelOf(s: GradingSystem, value: number): [number, number] | null {
  if (!passes(s, value)) return null;
  const a = s.anchors;
  const dir = s.higherIsBetter ? 1 : -1;
  const v = value * dir;
  const top = a[5] * dir;
  if (v >= top) {
    // At or beyond the top anchor: the top, including any flat run below it.
    let lo = 5;
    while (lo > 0 && Math.abs(a[lo - 1] - a[5]) < 1e-9) lo -= 1;
    return [lo, 5];
  }
  let lo = Infinity; let hi = -Infinity;
  for (let i = 0; i < 5; i++) {
    const x0 = a[i] * dir; const x1 = a[i + 1] * dir;
    if (v < x0 - 1e-9 || v > x1 + 1e-9) continue;
    if (Math.abs(x1 - x0) < 1e-9) { lo = Math.min(lo, i); hi = Math.max(hi, i + 1); continue; }
    const t = i + (v - x0) / (x1 - x0);
    lo = Math.min(lo, t); hi = Math.max(hi, t);
  }
  if (lo === Infinity) return [0, 0];
  return [lo, hi];
}

/** The grade at a level (0 pass .. 5 top) in a system. */
export function gradeAtLevel(s: GradingSystem, level: number): number {
  const a = s.anchors;
  const l = Math.max(0, Math.min(5, level));
  const i = Math.min(4, Math.floor(l));
  return a[i] + (l - i) * (a[i + 1] - a[i]);
}

/** Snap to the nearest allowed grade, for discrete scales. */
function snap(s: GradingSystem, value: number): number {
  if (!s.options) return value;
  let best = s.options[0].value; let d = Infinity;
  for (const o of s.options) {
    const dd = Math.abs(o.value - value);
    if (dd < d - 1e-9) { d = dd; best = o.value; }
  }
  return best;
}

export interface Conversion {
  /** Below the pass mark in the source system. */
  fail: boolean;
  /** The converted value, or the two ends of a range. */
  low: number;
  high: number;
  /** Ready to show: "3.68", "29 to 30 e lode", "First-class honours". */
  text: string;
  band: string;
}

export function convert(from: GradingSystem, to: GradingSystem, value: number, method: ConversionMethod = 'bands'): Conversion {
  if (!Number.isFinite(value) || !passes(from, value)) {
    return { fail: true, low: NaN, high: NaN, text: to.failLabel, band: to.failLabel };
  }
  let low: number; let high: number;
  if (method === 'linear') {
    // (value - pass) / (best - pass) is the share of the way from the pass
    // mark to the best mark, whichever way the scale runs; honours above the
    // best mark count as the best mark.
    const span = from.best - from.pass;
    const p = span === 0 ? 1 : Math.max(0, Math.min(1, (value - from.pass) / span));
    const t = to.pass + p * (to.best - to.pass);
    low = t; high = t;
  } else {
    const lv = levelOf(from, value)!;
    const g0 = gradeAtLevel(to, lv[0]); const g1 = gradeAtLevel(to, lv[1]);
    low = to.higherIsBetter ? Math.min(g0, g1) : Math.max(g0, g1);
    high = to.higherIsBetter ? Math.max(g0, g1) : Math.min(g0, g1);
  }
  low = snap(to, low); high = snap(to, high);
  // Honours: only the top of an honours scale is "e lode"; a value between
  // the maximum and the honours anchor is shown as the maximum.
  if (to.honours) {
    if (low > to.max && low < to.honours.value - 1e-9) low = to.max;
    if (high > to.max && high < to.honours.value - 1e-9) high = to.max;
  }
  const same = Math.abs(low - high) < Math.pow(10, -to.decimals) / 2;
  const text = same
    ? formatGrade(to, (low + high) / 2)
    : `${formatGrade(to, to.higherIsBetter ? low : high)} to ${formatGrade(to, to.higherIsBetter ? high : low)}`;
  // The band of the more cautious end, so a range never reads as more than it is.
  const band = bandOf(to, low);
  return { fail: false, low, high, text, band };
}

// ---------------------------------------------------------------------
// Weighted averages.
// ---------------------------------------------------------------------

export interface CourseRow {
  id: string;
  name: string;
  /** Credits, ECTS or any weight. */
  weight: number | null;
  /** The grade as entered. For /30: 18 to 30. */
  grade: number | null;
  /** Only for the /30 scale: the grade is 30 e lode. */
  lode?: boolean;
}

export interface AverageSettings {
  /** What a 30 e lode counts as in the average. Bocconi: 30. */
  lodeValue: number;
}

export const DEFAULT_AVERAGE_SETTINGS: AverageSettings = { lodeValue: 30 };

/** The number a course contributes to the average. */
export function courseValue(s: GradingSystem, c: CourseRow, settings: AverageSettings): number | null {
  if (c.grade === null || !Number.isFinite(c.grade)) return null;
  if (s.id === 'it30' && c.lode) return settings.lodeValue;
  return c.grade;
}

/** Only rows with a weight above zero and a grade count. */
export function countedRows(s: GradingSystem, rows: CourseRow[], settings: AverageSettings) {
  return rows
    .map((c) => ({ c, v: courseValue(s, c, settings), w: c.weight ?? 0 }))
    .filter((x) => x.v !== null && Number.isFinite(x.w) && x.w > 0) as { c: CourseRow; v: number; w: number }[];
}

export interface AverageResult { average: number | null; totalWeight: number; count: number; simple: number | null }

export function weightedAverage(s: GradingSystem, rows: CourseRow[], settings: AverageSettings): AverageResult {
  const counted = countedRows(s, rows, settings);
  const totalWeight = counted.reduce((n, x) => n + x.w, 0);
  if (!counted.length || totalWeight <= 0) return { average: null, totalWeight: 0, count: 0, simple: null };
  const average = counted.reduce((n, x) => n + x.v * x.w, 0) / totalWeight;
  const simple = counted.reduce((n, x) => n + x.v, 0) / counted.length;
  return { average, totalWeight, count: counted.length, simple };
}

/** The average after one more course of `weight` at `grade`. */
export function averageWith(avg: AverageResult, weight: number, grade: number): number | null {
  if (!(weight > 0)) return avg.average;
  if (avg.average === null) return grade;
  return (avg.average * avg.totalWeight + grade * weight) / (avg.totalWeight + weight);
}

/**
 * The grade the next course of `weight` needs for the average to reach
 * `target`. Can fall outside the scale: the caller says so.
 */
export function gradeNeeded(avg: AverageResult, weight: number, target: number): number | null {
  if (!(weight > 0)) return null;
  if (avg.average === null) return target;
  return (target * (avg.totalWeight + weight) - avg.average * avg.totalWeight) / weight;
}

/** Bocconi: the starting point of the degree mark, /110. */
export function degreeBase110(average30: number): number {
  return (average30 * 110) / 30;
}

/** The grades worth trying for the next exam, best first. */
export function candidateGrades(s: GradingSystem, settings: AverageSettings): { value: number; label: string }[] {
  if (s.entryOptions) return s.entryOptions.filter((o) => passes(s, o.value)).map((o) => ({ value: o.value, label: o.label }));
  if (s.id === 'it30') {
    const out = [{ value: settings.lodeValue, label: '30 e lode' }];
    for (let g = 30; g >= 18; g--) out.push({ value: g, label: String(g) });
    // With lode counted as 30, the "30 e lode" row is the same as the 30 row.
    return settings.lodeValue === 30 ? out.slice(1) : out;
  }
  // Numeric scales: ten evenly spaced passing grades from the top anchor
  // (not the nominal maximum: nobody tries for 100 in a UK module) down to
  // the pass mark, best first.
  const lo = s.pass; const hi = s.anchors[5];
  const steps = 10;
  const vals: number[] = [];
  for (let i = 0; i <= steps; i++) vals.push(hi + (lo - hi) * (i / steps));
  return vals.map((v) => ({ value: Number(v.toFixed(s.decimals)), label: formatGrade(s, Number(v.toFixed(s.decimals))) }));
}
