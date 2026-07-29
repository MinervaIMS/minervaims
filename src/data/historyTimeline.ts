// =====================================================================
// "Our History" — typed content for the About-page timeline section.
// Seeded from timeline-events.json. Quiet years carry `minor: true` and
// render as a rail marker only (no card, no copy).
// =====================================================================

/** Shape of the archive lookup used to resolve a report cover at runtime. */
export interface ArchiveQuery {
  /** Equality filters applied to `archive_files`. */
  eq?: Record<string, string>;
  /** Column to order by, with direction. */
  order?: { column: string; ascending: boolean };
  limit?: number;
}

export type HistoryMedia =
  | { kind: 'photo'; src?: string | null; alt: string; note?: string }
  | { kind: 'pdf'; url?: string | null; note?: string; title?: string; query?: ArchiveQuery }
  | { kind: 'counter'; label: string };

export interface HistoryMilestone {
  year: number;
  minor?: false;
  title: string;
  href: string;
  /** `[n]` is substituted at render time with the live alumni total. */
  description: string;
  media: HistoryMedia;
}

export interface HistoryQuietYear {
  year: number;
  minor: true;
}

export type HistoryEvent = HistoryMilestone | HistoryQuietYear;

export const isQuietYear = (e: HistoryEvent): e is HistoryQuietYear => 'minor' in e && e.minor === true;

/** Pinned scroll budget = horizontal overflow x SCROLL_PACE. */
export const SCROLL_PACE = 2.5;
/** Used only if the live alumni figure has not resolved yet. */
export const ALUMNI_FALLBACK = 100;

export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    year: 2019,
    title: 'From the idea of five students, Minerva is founded',
    href: '/people/alumni#founders',
    description:
      'In 2019 five students founded a society Bocconi did not have: one devoted entirely to asset management. They built it like the firms they hoped to join, with a board of eight and five divisions. Research was written to feed portfolio decisions, not to sit in a drawer. Minerva has grown since, but it still works that way.',
    media: { kind: 'photo', src: null, alt: 'The founding cohort, 2019', note: 'Photo to be supplied' },
  },
  {
    year: 2020,
    title: 'The virtual funds go live',
    href: '/divisions/portfolio',
    description:
      'The Long-Short Equity Fund had launched in 2019. In 2020 the Multi-Asset Global Opportunities Fund followed, investing across equities, bonds and commodities worldwide, and in the spring the Diversified Passive Selection Fund joined it, built on ETFs. Three funds, three mandates. From that year, research was judged by how the portfolios performed.',
    media: {
      kind: 'pdf',
      url: null,
      note: 'Cover: first Multi-Asset fund report',
      // No hardcoded file id: the earliest Multi-Asset report wins.
      query: { eq: { fund: 'multi-asset' }, order: { column: 'date', ascending: true }, limit: 1 },
    },
  },
  {
    year: 2021,
    title: 'The alumni network passes one hundred',
    href: '/people/alumni',
    description:
      'By 2021 the alumni list had passed one hundred names. They had arrived at Minerva as students with little experience and gone on to trade, invest, advise and teach at some of the strongest institutions in the industry. They still answer when a current member writes. The network now stands at [n], across several continents.',
    media: { kind: 'counter', label: 'Alumni Network' },
  },
  { year: 2022, minor: true },
  {
    year: 2023,
    title: 'Investment Research is introduced',
    href: '/divisions/investment',
    description:
      'The Investment Research Division was created in 2023. It monitors market trends, updates the Society\u2019s view on a regular basis, and recommends how much exposure to hold in each asset class and region. Every exposure is discussed and approved by the whole team. The first Global Outlook came out that December, and one has followed every semester since.',
    media: {
      kind: 'pdf',
      url: null,
      note: 'Cover: Global Outlook, December 2023',
      title: 'Global Outlook - December 2023',
    },
  },
  {
    year: 2024,
    title: 'Quantitative Research steps into ML and neural networks',
    href: '/archive?division=quant',
    description:
      'In 2024 the Quantitative Research Division published Forecasting 101, three papers on the same dataset: median house prices in California. The first used LASSO and Ridge regression, the second a Bayesian framework, the third a neural network. It was the division\u2019s first sustained work in machine learning, and it set the direction for what followed.',
    media: {
      kind: 'pdf',
      url: null,
      note: 'Cover: Forecasting 101',
      title: 'Forecasting 101: Lasso and Ridge Regressions',
    },
  },
  { year: 2025, minor: true },
  {
    year: 2026,
    title: 'The founders return to Bocconi',
    href: '/events',
    description:
      'In the first half of 2026, across four public events and five alumni calls, Minerva welcomed its founders back to Bocconi. They had described a society much like this one back in 2019, at a point when there was very little evidence it would work. Most of the members who came to listen had never met them. All of them had been living inside the idea for years.',
    media: { kind: 'photo', src: null, alt: 'The founders back at Bocconi, 2026', note: 'Photo to be supplied' },
  },
];
