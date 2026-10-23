// =====================================================================
// THE MARKET MONITOR, AS THE HOMEPAGE SHOWS IT (Step 93B).
// ---------------------------------------------------------------------
// Twelve official market figures (ECB Data Portal, Eurostat, BIS) live
// in the key numbers registry under page key `home-monitor`, written once
// a month by the macro-monitor edge function; the two active funds'
// cumulative returns are under `home-funds`. The hero's canvas and the
// ticker at its foot read the same registry entries and format them here,
// so a figure drawn in the scene and the same figure in the page text are
// the same characters (the number rule and the parity rule).
//
// No imports beyond types, so any bundle can use it.
// =====================================================================

import type { KeyNumber } from './key-numbers';

export const MONITOR_PAGE = 'home-monitor';
export const FUNDS_PAGE = 'home-funds';

/** How often each series is published: its date is a day, a month or a quarter. */
const FREQUENCY: Record<string, 'day' | 'month' | 'quarter'> = {
  mkt_hicp: 'month',
  mkt_hicp_core: 'month',
  mkt_unemployment: 'month',
  mkt_gdp_qoq: 'quarter',
  mkt_btp_bund: 'month',
  fund_long_short_itd: 'month',
  fund_multi_asset_itd: 'month',
};

/** Who publishes each series, for the line that names the sources. */
export const MONITOR_SOURCES = 'ECB Data Portal · Eurostat · BIS';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "22 Oct 2026", "Sep 2026", "Q2 2026": the date of a figure, as short as it can be said. */
export function monitorDate(slug: string, n: Pick<KeyNumber, 'as_of'>): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(n.as_of ?? '');
  if (!m) return '';
  const month = Number(m[2]);
  switch (FREQUENCY[slug] ?? 'day') {
    case 'quarter':
      return `Q${Math.ceil(month / 3)} ${m[1]}`;
    case 'month':
      return `${MONTHS[month - 1]} ${m[1]}`;
    default:
      return `${Number(m[3])} ${MONTHS[month - 1]} ${m[1]}`;
  }
}

/** The fund names the hero uses beside their figures: the homepage chart's own (lib/funds-api.ts). */
export const FUND_FIGURE_NAMES: Record<string, string> = {
  fund_long_short_itd: 'Long-Short Equity Fund',
  fund_multi_asset_itd: 'Multi-Asset Global Opportunities Fund',
};

/** Which fund's line each figure ends. */
export const FUND_FIGURE_LINES: Record<string, 'long-short' | 'multi-asset'> = {
  fund_long_short_itd: 'long-short',
  fund_multi_asset_itd: 'multi-asset',
};
