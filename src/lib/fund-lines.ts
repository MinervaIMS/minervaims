// =====================================================================
// THE FUNDS' OFFICIAL LINES, AS THE CHARTS DRAW THEM (Step 93B).
// ---------------------------------------------------------------------
// The cumulative return from inception to the end of each month, exactly
// as public.fund_track_record computes it (`monthly[].itd`). Nothing here
// compounds a return: the line is read, never rebuilt, so the homepage
// hero, the homepage chart and the fund pages all draw the one line that
// scripts/fund-stats.test.mjs checks.
//
// WHERE IT COMES FROM. The build embeds the two active funds' lines in
// the page (vite.fund-lines.ts), so the first render has them; a page
// without them (a development server, a build that could not reach the
// database) reads them once, live (lib/fund-lines-api.ts).
//
// No imports beyond types, so the build can use this file too.
// =====================================================================

import type { FundsSnapshot, RecordFund } from './fund-record';

export type LineFund = 'long-short' | 'multi-asset';
export const LINE_FUNDS: LineFund[] = ['long-short', 'multi-asset'];

/** One fund's line: [month "YYYY-MM", cumulative return in % at its end]. */
export interface FundLine {
  fund: LineFund;
  first_month: string;
  last_month: string;
  points: [string, number][];
}

export interface FundLinesSnapshot {
  /** When the database computed the records the lines were read from. */
  computed_at: string | null;
  lines: Partial<Record<LineFund, FundLine>>;
  built_at?: string;
}

/** The id of the JSON block the build writes into index.html. */
export const FUND_LINES_ELEMENT_ID = 'mims-fund-lines';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The lines in a snapshot of the records. A fund whose months do not all
 * carry their cumulative return (a database before the Step 93B migration)
 * has no line: it is left out rather than rebuilt here.
 */
export function linesFromRecords(snap: FundsSnapshot | null): FundLinesSnapshot {
  const lines: FundLinesSnapshot['lines'] = {};
  for (const fund of LINE_FUNDS) {
    const monthly = snap?.funds?.[fund as RecordFund]?.record?.monthly ?? [];
    if (monthly.length < 2 || !monthly.every((m) => typeof m.itd === 'number' && Number.isFinite(m.itd))) continue;
    lines[fund] = {
      fund,
      first_month: monthly[0].month,
      last_month: monthly[monthly.length - 1].month,
      points: monthly.map((m) => [m.month, m.itd as number]),
    };
  }
  return { computed_at: snap?.computed_at ?? null, lines };
}

export function isFundLinesSnapshot(v: unknown): v is FundLinesSnapshot {
  if (!isObject(v) || !isObject(v.lines)) return false;
  return Object.values(v.lines).every((l) => isObject(l) && Array.isArray(l.points)
    && l.points.every((p) => Array.isArray(p) && typeof p[0] === 'string' && typeof p[1] === 'number'));
}

/** The lines embedded in the page by the build, if any. Synchronous, so the first render has them. */
export function readEmbeddedFundLines(): FundLinesSnapshot | null {
  const doc = (globalThis as unknown as { document?: { getElementById(id: string): { textContent: string | null } | null } }).document;
  const el = doc?.getElementById(FUND_LINES_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    const parsed = JSON.parse(el.textContent) as unknown;
    return isFundLinesSnapshot(parsed) && Object.keys(parsed.lines).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** "2026-03" as a sortable month number. */
export const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

/** The month before "2018-12": where every line starts, at zero, before its first return. */
export function monthBefore(month: string): string {
  const i = monthIndex(month) - 1;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
