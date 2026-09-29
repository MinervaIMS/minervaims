// =====================================================================
// Dates for the two month calendars (Calendar, Editorial calendar).
// ---------------------------------------------------------------------
// Everything here works on calendar dates written 'YYYY-MM-DD', never on
// instants, so a day is the same day whatever the reader's computer is set
// to. "Today" is Rome's today, like every other date in the workspace.
// Pure functions only: the grids, the labels and the relative wording are
// all derived here, so the pages hold no date arithmetic of their own.
// =====================================================================

import { romeYmd } from '@/lib/event-time';

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A 'YYYY-MM-DD' built from numbers (month 0-based). */
export function ymdOf(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().slice(0, 10);
}

/** Rome's date today. */
export function todayYmd(): string {
  return romeYmd(new Date());
}

/** The date `n` days after `ymd` (negative for before). */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The first day of the month `n` months after the month of `ymd`. */
export function addMonths(ymd: string, n: number): string {
  const [y, m] = ymd.split('-').map(Number);
  return ymdOf(y, m - 1 + n, 1);
}

export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Whole days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86400000);
}

/** Monday = 0 ... Sunday = 6. */
export function weekdayIndex(ymd: string): number {
  return (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The six weeks a month grid shows, Monday first: the days of the month
 * with the tail of the one before and the start of the one after, so
 * every grid is the same height and the eye never has to re-find a row.
 */
export function monthMatrix(anyDayInMonth: string): string[] {
  const first = monthStart(anyDayInMonth);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The week rows a month actually needs (4 to 6), for a compact grid. */
export function monthWeeks(anyDayInMonth: string): string[][] {
  const cells = monthMatrix(anyDayInMonth);
  const weeks: string[][] = [];
  for (let i = 0; i < 42; i += 7) {
    const week = cells.slice(i, i + 7);
    if (i > 0 && !week.some((d) => sameMonth(d, anyDayInMonth))) break;
    weeks.push(week);
  }
  return weeks;
}

const fmt = (ymd: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });

/** "October 2026". */
export function monthTitle(ymd: string): string {
  return fmt(ymd, { month: 'long', year: 'numeric' });
}

/** "September to November 2026", or "December 2026 to February 2027". */
export function quarterTitle(firstMonth: string): string {
  const last = addMonths(firstMonth, 2);
  const a = fmt(firstMonth, { month: 'long' });
  const b = fmt(last, { month: 'long' });
  return firstMonth.slice(0, 4) === last.slice(0, 4)
    ? `${a} to ${b} ${last.slice(0, 4)}`
    : `${a} ${firstMonth.slice(0, 4)} to ${b} ${last.slice(0, 4)}`;
}

/** "Thursday 1 October 2026". */
export function longDay(ymd: string): string {
  return `${fmt(ymd, { weekday: 'long' })} ${fmt(ymd, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

/** "Thu 1 Oct". */
export function shortDay(ymd: string): string {
  return `${fmt(ymd, { weekday: 'short' })} ${fmt(ymd, { day: 'numeric', month: 'short' })}`;
}

/** "Oct". */
export function monthShort(ymd: string): string {
  return fmt(ymd, { month: 'short' });
}

/** "Thu". */
export function weekdayShort(ymd: string): string {
  return fmt(ymd, { weekday: 'short' });
}

/**
 * How far away a day is, the way people say it: "Today", "Tomorrow",
 * "Friday" within the week, "In 12 days", "In 3 weeks", "Yesterday",
 * "5 days ago".
 */
export function relativeDay(ymd: string, today = todayYmd()): string {
  const n = daysBetween(today, ymd);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `This ${fmt(ymd, { weekday: 'long' })}`;
  if (n >= 7 && n < 21) return `In ${n} days`;
  if (n >= 21 && n < 60) return `In ${Math.round(n / 7)} weeks`;
  if (n >= 60) return `In ${Math.round(n / 30)} months`;
  if (n > -7) return `${-n} days ago`;
  if (n > -60) return `${Math.round(-n / 7)} weeks ago`;
  return `${Math.round(-n / 30)} months ago`;
}
