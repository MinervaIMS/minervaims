// =====================================================================
// MINERVA'S TRACK RECORD, AS ONE PAGE (Step 105).
// ---------------------------------------------------------------------
// /numbers ("Minerva in Numbers") and /track-record ("Track Record") are
// one page now, at /track-record. This file is the page's structure: its
// title and introduction, its topics in order, which figures each topic
// shows, and the numbered notes the figures point to. The app's page
// (src/pages/TrackRecord.tsx) and its static copy for machines
// (src/lib/static/render.ts) both build from it, so the two can never say
// different things (AGENTS.md). Relative imports only: the build loads it.
//
// THE NOTES. A figure no longer repeats "Figure as of ..." under itself:
// the introduction says once when the figures are true, each figure
// carries a superscript number, and the notes at the foot of the page give
// that number's definition. A figure true at another date than the page's
// (a recruiting round, a fund's last month) says so in its own note only.
// =====================================================================

import { formatAsOf, formatKeyNumber, latestAsOf, type KeyNumber, type KeyNumbersSnapshot } from './key-numbers';
import { SITE_URL } from './seo/site';
import { ORGANIZATION_ID, type JsonLd } from './seo/structured-data';

export const TRACK_PAGE_TITLE = "Minerva's Track Record";
export const TRACK_INTRO_HEADING = 'Our Achievements, quantified';

/** The introduction, with the date the figures are true at. */
export function trackIntroText(asOf: string): string {
  return `Numbers and statistics on this page are computed on a daily basis from Minerva's own records.${asOf ? ` Figures as of ${asOf}.` : ''}`;
}

/** The funds, on this page: virtual portfolios, said once, plainly. */
export const TRACK_FUNDS_STATEMENT =
  'Virtual portfolios managed by students for educational purposes. No real capital is invested. Returns are simulated, net and in EUR.';

export type TrackTopicId = 'people' | 'research' | 'funds' | 'events';

export interface TrackTopic {
  id: TrackTopicId;
  title: string;
  intro: string;
  /** The registry's placement the figures come from, and which of them. */
  figures: { page: string; only?: string[]; except?: string[] };
  /** The page of the site the topic leads on to: one button per topic. */
  link: { href: string; label: string };
}

/** The topics, in the order of the page and of its index. */
export const TRACK_TOPICS: TrackTopic[] = [
  {
    id: 'people',
    title: 'People',
    intro: 'The students who run Minerva today, the alumni network they join when they graduate, and every semester since the first.',
    figures: { page: 'numbers-people' },
    link: { href: '/people/alumni', label: 'Meet the alumni' },
  },
  {
    id: 'research',
    title: 'Research',
    intro: 'The research the divisions publish in the public archive, year by year.',
    figures: { page: 'numbers-reports', except: ['funds_run'] },
    link: { href: '/archive', label: 'Browse the archive' },
  },
  {
    id: 'funds',
    title: 'Funds',
    intro: TRACK_FUNDS_STATEMENT,
    figures: { page: 'numbers-reports', only: ['funds_run'] },
    link: { href: '/divisions/portfolio', label: 'See the funds' },
  },
  {
    id: 'events',
    title: 'Events',
    intro: 'Talks with professionals, alumni calls, company visits and the events of the association and its divisions.',
    figures: { page: 'numbers-events' },
    link: { href: '/events', label: 'See the events' },
  },
];

/** The page index: the introduction, the topics, and the notes. */
export const TRACK_INDEX: { id: string; title: string }[] = [
  { id: 'overview', title: TRACK_INTRO_HEADING },
  ...TRACK_TOPICS.map((t) => ({ id: t.id, title: t.title })),
  { id: 'notes', title: 'Notes and method' },
];

/** A section's number, as the index gives it: "01". */
export const trackIndexNumber = (id: string): string =>
  String(TRACK_INDEX.findIndex((s) => s.id === id) + 1).padStart(2, '0');

export type TrackFigure = KeyNumber & { slug: string; note: number };

/** Each topic's figures, numbered for the notes in the order the page shows them. */
export function trackFigures(snap: KeyNumbersSnapshot | null): Record<TrackTopicId, TrackFigure[]> {
  const out = { people: [], research: [], funds: [], events: [] } as Record<TrackTopicId, TrackFigure[]>;
  if (!snap) return out;
  let n = 0;
  for (const t of TRACK_TOPICS) {
    for (const slug of snap.pages[t.figures.page] ?? []) {
      if (t.figures.only && !t.figures.only.includes(slug)) continue;
      if (t.figures.except && t.figures.except.includes(slug)) continue;
      const k = snap.numbers[slug];
      if (!k) continue;
      n += 1;
      out[t.id].push({ ...k, slug, note: n });
    }
  }
  return out;
}

/** Every figure of the page, in order. */
export const allTrackFigures = (f: Record<TrackTopicId, TrackFigure[]>): TrackFigure[] =>
  TRACK_TOPICS.flatMap((t) => f[t.id]);

/** The date the page's figures are true at: the latest of them. */
export function trackAsOf(f: Record<TrackTopicId, TrackFigure[]>): string | null {
  return latestAsOf(allTrackFigures(f));
}

/**
 * A figure's note: its definition, then its round or its date only when
 * that is not the page's own date.
 */
export function trackNoteText(fig: KeyNumber, pageAsOf: string | null): string {
  const def = String(fig.definition ?? '').trim();
  const when = fig.period
    ? `Figure for the ${fig.period} round.`
    : fig.as_of && pageAsOf && fig.as_of.slice(0, 10) !== pageAsOf.slice(0, 10)
      ? `Figure as of ${formatAsOf(fig.as_of)}.`
      : '';
  return [def, when].filter(Boolean).join(' ');
}

/** The notes on the tables, after the figures' own. */
export const TRACK_TABLE_NOTES: { term: string; text: string }[] = [
  { term: 'Members and alumni by semester', text: "Every past semester from the roster history the association keeps. Members: the people on the semester's roster, those on a semester break left out. Alumni: the people who had served in an earlier semester and are not on this one. The current semester is in the figures above." },
  { term: 'Where alumni work', text: 'The job area each alumnus has recorded in the alumni directory, as typed; alumni without one are counted separately.' },
  { term: 'Reports and pages', text: 'Every report published in the archive, by the year on its cover and the division that wrote it, with the pages of its PDF counted from the file itself. Drafts and deleted reports are not counted.' },
  { term: 'Funds', text: 'Every figure is computed from the monthly returns by the same function as the fund pages. An empty cell is a figure that cannot be computed yet: annualised figures need twelve months, the Sharpe ratio the euro short-term rate (\u20acSTR) for every month.' },
  { term: 'Events', text: 'Events held, by year: meetings, Association on Display days and events whose date is still to be confirmed are not counted. Speakers are counted once per year, by name.' },
];

/** The data files that carry the same figures. */
export const TRACK_DATA_FILES: { href: string; label: string }[] = [
  { href: '/data/key-numbers.json', label: 'key-numbers.json' },
  { href: '/data/funds.json', label: 'funds.json' },
  { href: '/llms-full.txt', label: 'llms-full.txt' },
];

/** The page's figures as a schema.org Dataset: the same values and notes the page shows. */
export function trackDatasetJsonLd(figures: TrackFigure[], asOf: string | null): JsonLd | null {
  if (figures.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${SITE_URL}/track-record#dataset`,
    name: TRACK_PAGE_TITLE,
    description: "Figures about Minerva Investment Management Society, the Bocconi student association founded in 2017: people, research, funds and events, computed automatically from the association's records.",
    url: `${SITE_URL}/track-record`,
    creator: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    ...(asOf ? { dateModified: asOf } : {}),
    distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE_URL}/data/key-numbers.json` }],
    variableMeasured: figures.map((n) => ({
      '@type': 'PropertyValue',
      name: n.label,
      value: n.value,
      valueReference: formatKeyNumber(n),
      description: trackNoteText(n, asOf),
    })),
  };
}
