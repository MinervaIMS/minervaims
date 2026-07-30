// =====================================================================
// historyTimeline — the Society's story, as shown in "Our History".
// ---------------------------------------------------------------------
// Eight entries, 2019 to 2026. Two of them are quiet years: they carry no
// copy and render as a smaller outlined circle, which keeps the rail
// continuous instead of jumping from 2021 to 2023.
//
// Nothing here hardcodes a file id. A milestone that shows a report cover
// describes WHICH report it wants (the first Multi-Asset fund report, the
// December 2023 Global Outlook, Forecasting 101) and the component
// resolves it from the archive at render time, so the covers keep working
// when the archive is re-uploaded.
// =====================================================================

/** How a milestone's cover is found in the published archive. */
export interface ArchiveLookup {
  /** Restrict to one fund, as stored on archive_files. */
  fund?: string;
  /** Restrict to one division. */
  division?: string;
  /** Case-insensitive fragment of the report title. */
  titleContains?: string;
  /** Restrict to a calendar year of the report date. */
  year?: number;
  /** Oldest first when true (the FIRST report of a fund). */
  oldestFirst?: boolean;
}

export type HistoryMedia =
  | { kind: 'photo'; src?: string | null; alt: string; note?: string }
  | {
      kind: 'pdf';
      url?: string | null;
      note?: string;
      /** Resolve the cover by describing the report it belongs to. */
      lookup?: ArchiveLookup;
      /** Or name the archive file outright, as chosen in the workspace. */
      fileId?: string;
    }
  | { kind: 'counter'; label: string; /** Fixed figure shown by the graphic. */ value: number };

export interface HistoryMilestone {
  year: number;
  minor?: false;
  title: string;
  href: string;
  /** "[n]" is replaced at render time with the live alumni total. */
  description: string;
  media: HistoryMedia;
}

export interface HistoryQuietYear {
  year: number;
  minor: true;
}

export type HistoryEvent = HistoryMilestone | HistoryQuietYear;

export const isQuietYear = (event: HistoryEvent): event is HistoryQuietYear =>
  (event as HistoryQuietYear).minor === true;

/** Scroll distance multiplier for the pinned run: overflow x this. */
export const HISTORY_SCROLL_PACE = 2.5;

/**
 * The figure the 2021 counter graphic shows on the website. It is fixed at
 * one hundred on purpose: the card is about the year the network PASSED a
 * hundred, so a live number that keeps climbing would tell a different
 * story every semester. The sentence underneath still carries [n], which is
 * substituted with the live alumni total, so the copy stays current while
 * the graphic stays historical.
 */
export const HISTORY_COUNTER_VALUE = 100;

/** Alumni total used for [n] until the live figure arrives. */
export const HISTORY_ALUMNI_FALLBACK = 100;

export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    year: 2019,
    title: 'From the idea of five students, Minerva is founded',
    href: '/people/alumni#founders',
    description:
      'In 2019 five students founded a society Bocconi did not have: one devoted entirely to asset management. They built it like the firms they hoped to join, with a board of eight and five divisions. Research was written to feed portfolio decisions, not to sit in a drawer. Minerva has grown since, but it still works that way.',
    media: { kind: 'photo', src: '/history/2019-founding-cohort.jpg', alt: 'The founding cohort, 2019', note: 'The founding cohort, 2019' },
  },
  {
    year: 2020,
    title: 'The virtual funds go live',
    href: '/divisions/portfolio',
    description:
      'The Long-Short Equity Fund had launched in 2019. In 2020 the Multi-Asset Global Opportunities Fund followed, investing across equities, bonds and commodities worldwide, and in the spring the Diversified Passive Selection Fund joined it, built on ETFs. Three funds, three mandates. From that year, research was judged by how the portfolios performed.',
    media: {
      kind: 'pdf',
      note: 'Cover: first Multi-Asset fund report',
      lookup: { fund: 'multi-asset', oldestFirst: true },
    },
  },
  {
    year: 2021,
    title: 'The alumni network passes one hundred',
    href: '/people/alumni',
    description:
      'By 2021 the alumni list had passed one hundred names. They had arrived at Minerva as students with little experience and gone on to trade, invest, advise and teach at some of the strongest institutions in the industry. They still answer when a current member writes. The network now stands at [n], across several continents.',
    media: { kind: 'counter', label: 'Alumni Network', value: HISTORY_COUNTER_VALUE },
  },
  { year: 2022, minor: true },
  {
    year: 2023,
    title: 'Investment Research is introduced',
    href: '/divisions/investment',
    description:
      'The Investment Research Division was created in 2023. It monitors market trends, updates the Society’s view on a regular basis, and recommends how much exposure to hold in each asset class and region. Every exposure is discussed and approved by the whole team. The first Global Outlook came out that December, and one has followed every semester since.',
    media: {
      kind: 'pdf',
      note: 'Cover: Global Outlook, December 2023',
      lookup: { titleContains: 'Global Outlook', year: 2023, oldestFirst: false },
    },
  },
  {
    year: 2024,
    title: 'Quantitative Research steps into ML and neural networks',
    href: '/archive?division=quant',
    description:
      'In 2024 the Quantitative Research Division published Forecasting 101, three papers on the same dataset: median house prices in California. The first used LASSO and Ridge regression, the second a Bayesian framework, the third a neural network. It was the division’s first sustained work in machine learning, and it set the direction for what followed.',
    media: {
      kind: 'pdf',
      note: 'Cover: Forecasting 101',
      lookup: { titleContains: 'Forecasting 101', oldestFirst: true },
    },
  },
  { year: 2025, minor: true },
  {
    year: 2026,
    title: 'The founders return to Bocconi',
    href: '/events',
    description:
      'In the first half of 2026, across four public events and five alumni calls, Minerva welcomed its founders back to Bocconi. They had described a society much like this one back in 2019, at a point when there was very little evidence it would work. Most of the members who came to listen had never met them. All of them had been living inside the idea for years.',
    media: { kind: 'photo', src: '/history/2026-founders-return.jpg', alt: 'The founders back at Bocconi, 2026', note: 'The founders back at Bocconi, 2026' },
  },
];
