// =====================================================================
// A fund's track record, as the fund pages, /track-record and the data
// files show it (Step 93).
// ---------------------------------------------------------------------
// Only the monthly returns are typed. Every other figure is computed from
// them by ONE database function, public.fund_track_record (migration
// 20261023120000), and arrives here finished: this file only types the
// result and turns its numbers into text, the same text everywhere.
// scripts/fund-stats.test.mjs recomputes every figure independently from
// the monthly returns and fails on any difference.
//
// No imports, so the build's static pages use the same formatting.
// =====================================================================

export type RecordFund = 'long-short' | 'multi-asset' | 'dps' | 'pir';
export const RECORD_FUNDS: RecordFund[] = ['long-short', 'multi-asset', 'dps', 'pir'];

export interface FundYear {
  year: number;
  /** How many months of the year have a return. */
  n: number;
  /** Jan..Dec, in %, or null for a month without a return. */
  months: (number | null)[];
  /** Compounded over the year's months, in %. */
  ytd: number;
  /** Compounded from inception to the year's last month, in %. */
  itd: number;
  /** Annualised, from the year's months (two or more), in %. */
  vol: number | null;
  /** For a full calendar year with the €STR for every month. */
  sharpe: number | null;
}

export interface FundMonthValue { month: string; value: number }

export interface FundReference {
  series: string;
  label: string;
  variant: string;
  currency: string;
  months: number;
  from: string | null;
  to: string | null;
  beta: number | null;
  correlation: number | null;
  sources: string[];
  as_of: string | null;
}

export interface FundDrawdown {
  value: number;
  peak_month: string | null;
  from_inception: boolean;
  trough_month: string | null;
  recovery_month: string | null;
  months_to_recover: number | null;
}

export interface FundRiskFree {
  label: string;
  months_covered: number;
  average_rate: number | null;
  sources: string[];
  as_of: string | null;
  complete: boolean;
}

export interface FundRecord {
  fund: RecordFund;
  months_count: number;
  first_month?: string;
  last_month?: string;
  monthly: FundMonthValue[];
  years: FundYear[];
  itd?: number;
  ann_return?: number | null;
  ann_vol?: number | null;
  sharpe?: number | null;
  positive_share?: number;
  positive_months?: number;
  best?: FundMonthValue;
  worst?: FundMonthValue;
  max_drawdown?: FundDrawdown;
  risk_free?: FundRiskFree;
  references: FundReference[];
}

export interface FundProfile {
  inception_date: string | null;
  end_date: string | null;
  closing_reason: string | null;
  rebalancing_policy: string | null;
  methodology: string | null;
  positions_count: number | null;
  positions_as_of: string | null;
  updated_at: string | null;
}

export interface FundEntry {
  status: 'active' | 'closed';
  profile: FundProfile | null;
  record: FundRecord;
}

export interface FundsSnapshot {
  computed_at: string | null;
  updated_at: string | null;
  funds: Partial<Record<RecordFund, FundEntry>>;
}

export const isFundsSnapshot = (v: unknown): v is FundsSnapshot =>
  !!v && typeof v === 'object' && !!(v as FundsSnapshot).funds && typeof (v as FundsSnapshot).funds === 'object';

/**
 * Whether a fund's page shows its table. An active fund: once it has a
 * monthly return. A closed fund: once the PM team has typed its monthly
 * returns AND its start and end dates (the reason it closed is optional).
 */
export function fundRecordShown(entry: FundEntry | null | undefined): boolean {
  if (!entry || !entry.record || entry.record.months_count < 1) return false;
  if (entry.status === 'active') return true;
  return !!(entry.profile?.inception_date && entry.profile?.end_date);
}

/** The sentence every fund table, page and data file carries. */
export const VIRTUAL_PORTFOLIO_STATEMENT =
  'Virtual (paper) portfolio managed by students for educational purposes. No real capital is invested. Returns are simulated, net and in EUR.';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const fixed = (decimals: number) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Avoid "-0.0%": a value that rounds to zero is zero. */
function rounded(v: number, decimals: number): number {
  const f = 10 ** decimals;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) || r === 0 ? 0 : r;
}

/** "+0.9%", "-1.2%", "0.0%": a monthly return or a YTD. Empty for no value. */
export function fmtSignedPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  const r = rounded(v, decimals);
  return `${r > 0 ? '+' : r < 0 ? '-' : ''}${fixed(decimals).format(Math.abs(r))}%`;
}

/** "50.9%", "-20.9%": a level (ITD, volatility, drawdown, share). Empty for no value. */
export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  const r = rounded(v, decimals);
  return `${r < 0 ? '-' : ''}${fixed(decimals).format(Math.abs(r))}%`;
}

/** "0.47", "-0.12": a ratio (Sharpe, beta, correlation). Empty for no value. */
export function fmtRatio(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  const r = rounded(v, decimals);
  return `${r < 0 ? '-' : ''}${fixed(decimals).format(Math.abs(r))}`;
}

/** "2022-01" -> "January 2022". */
export function fmtMonth(month: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(month ?? '');
  if (!m) return '';
  return `${MONTH_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2018-12-03" -> "3 December 2018". */
export function fmtDate(date: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
  if (!m) return '';
  return `${Number(m[3])} ${MONTH_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

export interface FundStat {
  key: string;
  label: string;
  value: string;
  note?: string;
}

/**
 * The statistics block of a fund page, in order, as text. A figure that
 * cannot be computed yet says why instead of showing a number.
 */
export function fundStats(entry: FundEntry): FundStat[] {
  const r = entry.record;
  const p = entry.profile;
  const out: FundStat[] = [];
  const period = r.first_month && r.last_month ? `${fmtMonth(r.first_month)} to ${fmtMonth(r.last_month)}` : '';
  if (p?.inception_date) out.push({ key: 'inception', label: 'Inception', value: fmtDate(p.inception_date) });
  if (entry.status === 'closed' && p?.end_date) out.push({ key: 'end', label: 'Closed', value: fmtDate(p.end_date), note: p.closing_reason || undefined });
  out.push({ key: 'months', label: 'Monthly returns', value: `${r.months_count}`, note: period });
  out.push({ key: 'itd', label: 'Cumulative return since inception', value: fmtPct(r.itd) });
  const yearsShort = 'Shown from twelve months of returns.';
  out.push({ key: 'ann_return', label: 'Annualised return', value: fmtPct(r.ann_return) || 'Not yet available', note: r.ann_return == null ? yearsShort : undefined });
  out.push({ key: 'ann_vol', label: 'Annualised volatility', value: fmtPct(r.ann_vol) || 'Not yet available', note: r.ann_vol == null ? yearsShort : undefined });
  out.push({
    key: 'sharpe', label: 'Sharpe ratio (€STR)',
    value: fmtRatio(r.sharpe) || 'Not yet available',
    note: r.sharpe == null
      ? (r.months_count < 12 ? yearsShort : 'Shown once the €STR is recorded for every month of the record.')
      : undefined,
  });
  const dd = r.max_drawdown;
  if (dd) {
    let note = '';
    if (dd.value < 0) {
      const from = dd.from_inception ? 'inception' : fmtMonth(dd.peak_month);
      note = `From ${from} to ${fmtMonth(dd.trough_month)}; `
        + (dd.recovery_month
          ? `recovered by ${fmtMonth(dd.recovery_month)}, ${dd.months_to_recover} ${dd.months_to_recover === 1 ? 'month' : 'months'} after the low.`
          : 'not yet recovered.');
    }
    out.push({ key: 'mdd', label: 'Maximum drawdown', value: fmtPct(dd.value), note: note || 'No month-end fall from a previous high.' });
  }
  if (r.positive_share != null) {
    out.push({ key: 'positive', label: 'Positive months', value: fmtPct(r.positive_share), note: `${r.positive_months} of ${r.months_count}` });
  }
  if (r.best) out.push({ key: 'best', label: 'Best month', value: fmtSignedPct(r.best.value), note: fmtMonth(r.best.month) });
  if (r.worst) out.push({ key: 'worst', label: 'Worst month', value: fmtSignedPct(r.worst.value), note: fmtMonth(r.worst.month) });
  if (p?.positions_count != null) {
    out.push({ key: 'positions', label: 'Positions', value: `${p.positions_count}`, note: p.positions_as_of ? `As of ${fmtDate(p.positions_as_of)}` : undefined });
  }
  return out;
}

/** The market references with enough shared months for a beta and a correlation. */
export const shownReferences = (r: FundRecord): FundReference[] =>
  (r.references || []).filter((x) => x.beta != null && x.correlation != null);

/** The notes under a fund table: what each column and figure means. */
export function fundNotes(entry: FundEntry): string[] {
  const r = entry.record;
  const rf = r.risk_free;
  const notes = [
    'ITD: the return compounded from inception to the last month of each year. YTD: the year\'s months compounded.',
    'Vol: the standard deviation of the year\'s monthly returns, annualised (multiplied by the square root of twelve).',
    'Sharpe ratio: the annualised return minus the €STR compounded over the same months, divided by the annualised volatility; for full calendar years only, and once the €STR is recorded for every month. Before October 2019, when the €STR did not exist, the EONIA less 8.5 basis points (the ECB\'s own conversion) stands in for it.',
    'Maximum drawdown: the largest fall of the compounded value from a previous month-end high.',
  ];
  if (rf && rf.months_covered > 0) {
    notes.push(`Risk-free rate: ${rf.label}, ${rf.months_covered} of ${r.months_count} months recorded${rf.as_of ? `, as of ${fmtDate(rf.as_of)}` : ''}${rf.sources.length ? `. Source: ${rf.sources.join('; ')}` : ''}.`);
  }
  if (r.last_month) notes.push(`Data to ${fmtMonth(r.last_month)}.`);
  return notes;
}

/**
 * One fund's monthly returns as CSV, the file /data/funds-<fund>.csv: the
 * typed data only. Every figure derived from it is in /data/funds.json,
 * computed by the database function, never recomputed here.
 */
export function fundCsv(fund: RecordFund, entry: FundEntry): string {
  const rows = ['fund,month,return_pct'];
  for (const m of entry.record.monthly) rows.push(`${fund},${m.month},${m.value.toFixed(4)}`);
  return `${rows.join('\n')}\n`;
}
