// =====================================================================
// THE KEY NUMBERS, AS THE WEBSITE SHOWS THEM (Step 92).
// ---------------------------------------------------------------------
// Every figure about Minerva on the public site comes from one registry
// in the database (key_numbers, computed automatically every night) and
// is formatted here, by one function, so the same figure reads the same
// on every page, in the stats sections, on /numbers and in the files
// machines read.
//
// THE NUMBER RULE (AGENTS.md). The text of a figure is its final value
// from the first frame: the build embeds the registry in the page as
// JSON, the app reads it synchronously before React renders, and nothing
// ever counts up, rolls over from zero or swaps one value for another
// while the page is open. Motion, where there is any, moves the final
// characters with transform and opacity only.
// =====================================================================

export type KeyNumberFormat = 'integer' | 'percent' | 'years' | 'ratio' | 'eur' | 'year';
export type KeyNumberKind = 'count' | 'volume' | 'percentage' | 'time' | 'ratio' | 'money';

export interface KeyNumber {
  label: string;
  value: number;
  format: KeyNumberFormat;
  decimals: number;
  prefix: string;
  suffix: string;
  kind: KeyNumberKind;
  definition: string;
  /** A recruiting round, for the figures that belong to one. */
  period: string | null;
  /** The date the figure is true at (YYYY-MM-DD). */
  as_of: string | null;
  virtual_portfolio: boolean;
}

export interface KeyNumbersSnapshot {
  computed_at: string | null;
  numbers: Record<string, KeyNumber>;
  /** Each page's figures, in order. */
  pages: Record<string, string[]>;
  /** When the build read the registry, for a snapshot embedded in the page. */
  built_at?: string;
  /** Where these figures came from: the page itself, or a live read. */
  source?: 'build' | 'snapshot' | 'live' | 'cache';
}

/** The id of the JSON block the build writes into index.html. */
export const KEY_NUMBERS_ELEMENT_ID = 'mims-key-numbers';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** A registry read we can trust the shape of. */
export function isKeyNumbersSnapshot(v: unknown): v is KeyNumbersSnapshot {
  if (!isObject(v) || !isObject(v.numbers) || !isObject(v.pages)) return false;
  return Object.values(v.numbers).every((n) => isObject(n) && typeof n.value === 'number' && typeof n.label === 'string');
}

/** The figures embedded in the page by the build, if any. Synchronous, so the first render has them. */
export function readEmbeddedKeyNumbers(): KeyNumbersSnapshot | null {
  // Read through globalThis so the build (Node, no DOM) can import this file too.
  const doc = (globalThis as unknown as { document?: { getElementById(id: string): { textContent: string | null } | null } }).document;
  if (!doc) return null;
  const el = doc.getElementById(KEY_NUMBERS_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    const parsed = JSON.parse(el.textContent) as unknown;
    if (!isKeyNumbersSnapshot(parsed) || Object.keys(parsed.numbers).length === 0) return null;
    return { ...parsed, source: parsed.source ?? 'build' };
  } catch {
    return null;
  }
}

const groupFormat = (decimals: number) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * A figure as text: exact, in British format, the same everywhere.
 * 1,234 · 12.5% · 4.4 · 0.64 · 2017 · €1,200.
 */
export function formatKeyNumber(n: Pick<KeyNumber, 'value' | 'format' | 'decimals' | 'prefix' | 'suffix'>): string {
  const d = Math.max(0, Math.min(4, n.decimals ?? 0));
  let body: string;
  switch (n.format) {
    case 'year':
      body = String(Math.round(n.value));
      break;
    case 'percent':
      body = `${groupFormat(d).format(n.value)}%`;
      break;
    case 'eur':
      body = `€${groupFormat(d).format(n.value)}`;
      break;
    default:
      body = groupFormat(d).format(n.value);
  }
  return `${n.prefix ?? ''}${body}${n.suffix ?? ''}`;
}

/**
 * The hero form of a count: rounded down to the ten below, with a "+",
 * as the homepage and /join have always shown it (253 reads "250+").
 * Under ten, or for anything that is not a plain count, it is the exact
 * figure. It is only ever used by `HeroFigure`; every other place shows
 * the exact figure from `formatKeyNumber`.
 */
export function heroTarget(n: Pick<KeyNumber, 'value' | 'format'>): number | null {
  if (n.format !== 'integer' || !Number.isFinite(n.value) || n.value < 10) return null;
  return Math.floor(n.value / 10) * 10;
}

export function formatHeroFigure(n: Pick<KeyNumber, 'value' | 'format' | 'decimals' | 'prefix' | 'suffix'>): string {
  const target = heroTarget(n);
  return target === null ? formatKeyNumber(n) : `${groupFormat(0).format(target)}+`;
}

/** "22 October 2026". */
export function formatAsOf(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
}

/** The latest as-of date among some figures: what "Figures as of" says for a group. */
export function latestAsOf(numbers: KeyNumber[]): string | null {
  return numbers.reduce<string | null>((max, n) => (n.as_of && (!max || n.as_of > max) ? n.as_of : max), null);
}

/** One sentence a tooltip or a screen reader can carry: definition and date. */
export function describeKeyNumber(n: KeyNumber): string {
  const when = n.period ? `${n.period} round` : n.as_of ? `as of ${formatAsOf(n.as_of)}` : '';
  return when ? `${n.definition} Figure ${when}.` : n.definition;
}

/** The pages that end with a stats section, and the heading each one uses. */
export const STATS_SECTION_TITLES: Record<string, string> = {
  home: 'Minerva in numbers',
  about: 'Minerva in numbers',
  'division-equity': 'Equity Research in numbers',
  'division-investment': 'Investment Research in numbers',
  'division-macro': 'Macro Research in numbers',
  'division-portfolio': 'Portfolio Management in numbers',
  'division-quant': 'Quantitative Research in numbers',
  'fund-long-short': 'Long Short Equity in numbers',
  'fund-multi-asset': 'Multi Asset Global Opportunities in numbers',
  'fund-pir': 'Italian Equity PIR in numbers',
  'fund-dps': 'Diversified Passive Selection in numbers',
  members: 'Members in numbers',
  alumni: 'Alumni in numbers',
  events: 'Events in numbers',
  archive: 'The archive in numbers',
  readings: 'Readings in numbers',
  join: 'Join in numbers',
  partnerships: 'Partnerships in numbers',
  'track-record': 'The track record in numbers',
};

/** A line under some headings, saying what kind of figures follow. */
export const STATS_SECTION_SUBTITLES: Record<string, string> = {
  join: 'Acceptance rate by division, latest full recruiting round',
  'fund-long-short': 'A virtual (paper) portfolio, managed by students for education',
  'fund-multi-asset': 'A virtual (paper) portfolio, managed by students for education',
  'fund-pir': 'A virtual (paper) portfolio, now closed',
  'fund-dps': 'A virtual (paper) portfolio, now closed',
};
