// =====================================================================
// funds-api — fund performance matrix (public-readable; managed via the
// admin-funds edge function). One row per (fund, year) mirrors the public
// fund page table: ITD, twelve monthly returns, YTD, Vol, Sharpe.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type ActiveFund = 'long-short' | 'multi-asset';

export interface FundYear {
  id: string;
  fund: ActiveFund;
  year: number;
  itd: string;
  months: string[]; // 12 entries, Jan..Dec
  ytd: string;
  vol: string;
  sharpe: string;
}

export interface FundYearInput {
  fund: ActiveFund;
  year: number;
  itd: string;
  months: string[];
  ytd: string;
  vol: string;
  sharpe: string;
}

export const ACTIVE_FUND_LABELS: Record<ActiveFund, string> = {
  'long-short': 'Long-Short Equity Fund',
  'multi-asset': 'Multi-Asset Global Opportunities Fund',
};

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Number formatting ───────────────────────────────────────────────────────
// Every value that reaches the fund performance table (workspace and public
// site) must read in one consistent format, no matter how it is typed. These
// helpers normalise free-text input: comma → dot decimal separator, a single
// '%' suffix on percentages, a fixed number of decimals, and a consistent sign.
//
//   'signed-pct' → forced +/- sign, 1 decimal, '%'  (monthly returns, YTD)
//   'pct'        → sign only if negative, 1 decimal, '%'  (ITD, Vol)
//   'ratio'      → sign only if negative, 2 decimals, no '%'  (Sharpe)
export type FundValueKind = 'signed-pct' | 'pct' | 'ratio';

/** Field → the format its values must follow. */
export const FUND_FIELD_KIND: Record<'itd' | 'ytd' | 'vol' | 'sharpe' | 'month', FundValueKind> = {
  itd: 'pct',
  ytd: 'signed-pct',
  vol: 'pct',
  sharpe: 'ratio',
  month: 'signed-pct',
};

/** Parse a free-text numeric string into a number, or null if not a number. */
export function parseFundNumber(raw: string): number | null {
  const s = (raw ?? '').trim();
  if (s === '') return null;
  // Strip spaces, the percent sign and any thousands separators, and accept a
  // comma OR a dot as the decimal separator.
  let t = s.replace(/\s+/g, '').replace(/%/g, '');
  if (t.includes(',') && t.includes('.')) {
    // Both present: assume the last one is the decimal separator.
    t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else {
    t = t.replace(',', '.');
  }
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** True when a cell is empty (allowed) or a parseable number. */
export function isValidFundValue(raw: string): boolean {
  return (raw ?? '').trim() === '' || parseFundNumber(raw) !== null;
}

/** Format a value into the canonical string for its field kind. Empty stays empty. */
export function formatFundValue(raw: string, kind: FundValueKind): string {
  if ((raw ?? '').trim() === '') return '';
  const n = parseFundNumber(raw);
  if (n === null) return raw; // Leave unparseable input untouched so validation can flag it.
  const decimals = kind === 'ratio' ? 2 : 1;
  const body = Math.abs(n).toFixed(decimals);
  const suffix = kind === 'ratio' ? '' : '%';
  const sign = kind === 'signed-pct' ? (n < 0 ? '-' : '+') : n < 0 ? '-' : '';
  return `${sign}${body}${suffix}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

function normalizeMonths(m: unknown): string[] {
  const arr = Array.isArray(m) ? m.map((x) => (x == null ? '' : String(x))) : [];
  return Array.from({ length: 12 }, (_, i) => arr[i] ?? '');
}

// =====================================================================
// ONE READ OF THE PERFORMANCE TABLE PER PAGE, however many things ask.
// ---------------------------------------------------------------------
// A fund page asked for these rows twice: the page itself queried the
// table for its own matrix, and the chart it renders called this function
// for the whole table and filtered client-side. Two requests, for the
// same rows, in the same second - one of them selecting every column of
// every fund.
//
// A single in-flight promise, held for a few seconds after it settles, is
// enough to collapse them: whoever asks first performs the read, everyone
// asking while it is in the air receives the same promise, and a caller
// arriving a moment later - a chart mounting after the page's own fetch,
// a Suspense boundary resolving - gets the settled result without a
// second round trip.
//
// The window is deliberately short. This is request coalescing, not a
// cache: it exists to stop one page load asking twice, and a reader who
// returns to the page a minute later still gets fresh figures. A failed
// read is not held at all, so an error is never remembered.
//
// `refreshFundYears()` drops it outright, which is what the workspace
// editor needs after it has written a row.
// =====================================================================

const FUND_YEARS_TTL_MS = 5000;
let fundYearsInFlight: Promise<FundYear[]> | null = null;
let fundYearsAt = 0;

/** Forget any coalesced read. Call after writing to the table. */
export function refreshFundYears(): void {
  fundYearsInFlight = null;
  fundYearsAt = 0;
}

export function listFundYears(): Promise<FundYear[]> {
  if (fundYearsInFlight && Date.now() - fundYearsAt < FUND_YEARS_TTL_MS) return fundYearsInFlight;
  fundYearsAt = Date.now();
  fundYearsInFlight = (async () => {
    const { data, error } = await sb.from('fund_performance_years').select('*').order('year', { ascending: true });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data || []) as any[]).map((r) => ({ ...r, months: normalizeMonths(r.months) })) as FundYear[];
  })();
  // A rejected read must not be handed to the next caller.
  fundYearsInFlight.catch(() => { refreshFundYears(); });
  return fundYearsInFlight;
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-funds', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Both writers drop the coalesced read before returning, so the caller's
// own reload after a save cannot be answered from a read that predates it.
// Putting it here rather than at the call sites means a future writer
// cannot forget: there is no path that writes the table without clearing.
export async function upsertFundYear(session: Session | null, year: FundYearInput) {
  const res = await invoke(session, { action: 'upsert', year });
  refreshFundYears();
  return res;
}
export async function deleteFundYear(session: Session | null, id: string) {
  const res = await invoke(session, { action: 'delete', id });
  refreshFundYears();
  return res;
}
