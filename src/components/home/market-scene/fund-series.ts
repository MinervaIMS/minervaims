// =====================================================================
// The funds' real record, as the hero draws it.
// ---------------------------------------------------------------------
// The line in the hero is each fund's actual cumulative return, read from
// `fund_performance_years`, the table the workspace maintains and the
// homepage's own performance chart reads further down the same page.
//
// IT IS COMPUTED EXACTLY AS THAT CHART COMPUTES ITS "SINCE INCEPTION"
// VIEW (see `observations()` and the rebase in FundPerformanceChart):
// every published month, oldest first; a month with no value is skipped
// rather than read as zero; the first month anchors the series at 0%, and
// each later month compounds on it. So the figure at the end of the line
// in the hero is the figure the chart prints, and publishing a month in
// the workspace extends both.
//
// THE READ IS SHARED, NOT REPEATED. `listFundYears()` coalesces calls
// made within a few seconds of each other into one request, and the page
// asks for this while it is loading anyway: the hero's request and the
// chart's are the same request.
//
// Nothing here is waited for. If the read fails, or the table is empty,
// the hero simply draws no fund line; everything else is unaffected.
// =====================================================================

import { ACTIVE_FUND_LABELS, listFundYears, parseFundNumber, type ActiveFund, type FundYear } from '@/lib/funds-api';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface FundPoint {
  /** year * 12 + month, the sortable key FundPerformanceChart uses. */
  order: number;
  year: number;
  /** 0 for January. */
  month: number;
  /** Cumulative return since the first published month, in percent. */
  value: number;
}

export interface FundSeries {
  fund: ActiveFund;
  /** The full name, as the fund pages print it. */
  name: string;
  /** The first word of it, for the label that travels with the line. */
  short: string;
  points: FundPoint[];
}

/** The two funds the homepage's own chart compares, in its order. */
const HERO_FUNDS: ActiveFund[] = ['long-short', 'multi-asset'];

/** "Mar 2026". */
export function monthLabel(p: { year: number; month: number }) {
  return `${MONTHS_SHORT[p.month]} ${p.year}`;
}

/** Each fund's cumulative return, month by month; funds with under two months are left out. */
export function fundSeries(rows: FundYear[]): FundSeries[] {
  return HERO_FUNDS.map((fund) => {
    const observations: { order: number; year: number; month: number; factor: number }[] = [];
    rows
      .filter((r) => r.fund === fund)
      .sort((a, b) => a.year - b.year)
      .forEach((row) => {
        row.months.forEach((raw, i) => {
          const pct = parseFundNumber(raw ?? '');
          if (pct === null) return;
          observations.push({ order: row.year * 12 + i, year: row.year, month: i, factor: 1 + pct / 100 });
        });
      });
    observations.sort((a, b) => a.order - b.order);
    let nav = 1;
    const points = observations.map((o, i) => {
      // The first month anchors the series at zero, as on the chart.
      if (i > 0) nav *= o.factor;
      return { order: o.order, year: o.year, month: o.month, value: Number(((nav - 1) * 100).toFixed(2)) };
    });
    const name = ACTIVE_FUND_LABELS[fund];
    return { fund, name, short: name.split(' ')[0], points };
  }).filter((s) => s.points.length >= 2);
}

/**
 * The series, when the table has answered. Never rejects: a failed read
 * resolves to no funds, and the hero draws no line.
 */
export function loadFundSeries(): Promise<FundSeries[]> {
  return listFundYears().then(fundSeries, () => []);
}
