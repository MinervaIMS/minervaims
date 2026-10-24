// =====================================================================
// THE €STR, FROM THE ECB (Step 93, automated in Step 93B).
// ---------------------------------------------------------------------
// The Sharpe ratio's risk-free rate is the euro short-term rate. The
// ECB publishes it every business day since 2 October 2019 (series
// EST.B.EU000A2X2A25.WT, the volume-weighted trimmed mean rate); each
// month's value is the average of that month's daily rates.
// Before October 2019 there was no €STR: the ECB's own bridge is
// "EONIA = €STR + 8.5 basis points", so those months use the EONIA
// monthly average (FM.M.U2.EUR.4F.MM.EONIA.HSTA) minus 8.5 basis points,
// and say so in their source.
//
// Only complete months are filled. A month's last rate is published the
// next business day, and a month can end on a weekend or a holiday, so a
// month counts as complete from the 4th of the month after it.
//
// Used by admin-funds (`import-estr`, the button in Fund Performances)
// and key-numbers (`fill-estr`, which the database asks for every
// morning): both fill only the months with no value yet, so a rate the
// PM team typed is never replaced.
// =====================================================================

export const ECB_DATA = 'https://data-api.ecb.europa.eu/service/data';
export const ESTR_KEY = 'EST/B.EU000A2X2A25.WT';
export const EONIA_KEY = 'FM/M.U2.EUR.4F.MM.EONIA.HSTA';
export const ESTR_SOURCE = 'ECB Data Portal, €STR (EST.B.EU000A2X2A25.WT), monthly average of daily rates';
export const EONIA_SOURCE = 'ECB Data Portal, EONIA monthly average (FM.M.U2.EUR.4F.MM.EONIA.HSTA) minus 8.5 basis points';
/** The first month with a €STR. */
export const ESTR_FIRST_MONTH = '2019-10';
/** From this day of the month, the previous month counts as complete. */
export const COMPLETE_FROM_DAY = 4;

/** TIME_PERIOD and OBS_VALUE of an ECB csvdata response, by column name. */
export function ecbRows(csv: string): { period: string; value: number }[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  // Quoted cells (the series titles) can hold commas of their own.
  const split = (l: string) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (quoted) {
        if (ch === '"' && l[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cell); cell = ''; } else cell += ch;
    }
    cells.push(cell);
    return cells;
  };
  const head = split(lines[0]);
  const t = head.indexOf('TIME_PERIOD');
  const v = head.indexOf('OBS_VALUE');
  if (t < 0 || v < 0) throw new Error('it answered in an unexpected format');
  return lines.slice(1).map(split)
    .filter((c) => c[t] && c[v] !== undefined && c[v].trim() !== '')
    .map((c) => ({ period: c[t], value: Number(c[v]) }))
    .filter((r) => Number.isFinite(r.value));
}

type Read = (url: string, init?: RequestInit) => Promise<Response>;

/** One series as csv, between two periods; an empty answer when the ECB has none (404). */
export async function ecbFetch(key: string, start: string, end: string, read: Read = fetch): Promise<string> {
  const url = `${ECB_DATA}/${key}?format=csvdata&startPeriod=${start}&endPeriod=${end}`;
  const res = await read(url, { headers: { Accept: 'text/csv' } });
  if (res.status === 404) return '';
  if (!res.ok) throw new Error(`it answered ${res.status}`);
  return await res.text();
}

/** The last complete month (YYYY-MM) at `now`, and its last day (YYYY-MM-DD). */
export function lastCompleteMonth(now: Date = new Date()): { month: string; lastDay: string } {
  const back = now.getUTCDate() >= COMPLETE_FROM_DAY ? 1 : 2;
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { month: first.toISOString().slice(0, 7), lastDay: last.toISOString().slice(0, 10) };
}

/** The last day (YYYY-MM-DD) of a month (YYYY-MM). */
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Every month from `start` to `end` (YYYY-MM), both included. */
export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/**
 * The monthly €STR (EONIA - 8.5 bp before October 2019) from `start` to
 * `end` (YYYY-MM), rounded to four decimals, with its source. `endDay` is
 * the real last day of `end`: the ECB refuses a date such as 30 February.
 * Throws when the ECB cannot be read.
 */
export async function estrMonthly(start: string, end: string, endDay: string, read: Read = fetch): Promise<Map<string, { value: number; source: string }>> {
  const monthly = new Map<string, { value: number; source: string }>();
  if (start > end) return monthly;
  const estrStart = start < ESTR_FIRST_MONTH ? ESTR_FIRST_MONTH : start;
  const daily = end >= ESTR_FIRST_MONTH ? ecbRows(await ecbFetch(ESTR_KEY, `${estrStart}-01`, endDay, read)) : [];
  const eonia = start < ESTR_FIRST_MONTH ? ecbRows(await ecbFetch(EONIA_KEY, start, end < '2019-09' ? end : '2019-09', read)) : [];
  const sums = new Map<string, { s: number; n: number }>();
  for (const d of daily) {
    const m = d.period.slice(0, 7);
    if (m < start || m > end) continue;
    const acc = sums.get(m) || { s: 0, n: 0 };
    acc.s += d.value; acc.n += 1;
    sums.set(m, acc);
  }
  for (const [m, a] of sums) monthly.set(m, { value: Math.round((a.s / a.n) * 1e4) / 1e4, source: ESTR_SOURCE });
  for (const e of eonia) {
    const m = e.period.slice(0, 7);
    if (m >= start && m < ESTR_FIRST_MONTH && !monthly.has(m)) monthly.set(m, { value: Math.round((e.value - 0.085) * 1e4) / 1e4, source: EONIA_SOURCE });
  }
  return monthly;
}
