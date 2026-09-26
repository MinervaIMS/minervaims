import type { GradingSystem } from '@/lib/career/grading';

// =====================================================================
// Small helpers of the GPA Converter's forms: number parsing, how an
// average is written, and the look of a native select.
// =====================================================================

/** A native select, sized like the Input beside it (and kind to phones). */
export const SELECT_CLASS =
  'font-body text-base md:text-sm bg-background border border-input rounded-md px-3 h-10 w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** "27,5" and "27.5" are the same grade; an empty field is no grade. */
export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** An average is always shown with two decimals, whatever the scale. */
export function fmtAverage(n: number): string {
  return n.toFixed(2);
}

/** The range a system accepts, in words. */
export function rangeText(s: GradingSystem): string {
  return `${s.min} to ${s.max}${s.honours ? `, and tick e lode for ${s.honours.label}` : ''}`;
}

export function inRange(s: GradingSystem, v: number): boolean {
  const top = s.honours ? s.honours.value : s.max;
  return v >= s.min - 1e-9 && v <= top + 1e-9;
}
