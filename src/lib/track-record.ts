// =====================================================================
// /track-record: what Minerva has published, run and held, counted from
// its own records (Step 93). The shape of public.public_track_record(),
// and the tables the page and its static copy build from it, so the two
// show the same rows. Relative imports only: the build loads this file.
// =====================================================================

import { REPORT_DIVISION_LABELS, type ReportDivision } from './report-meta';

export interface ResearchRow { year: number; division: string; reports: number; pages: number; pages_known: number }
export interface EventsRow { year: number; events: number; with_guests: number; speakers: number; alumni_calls: number; company_visits: number }
export interface SemesterRow { key: string; label: string; members: number; alumni: number }
export interface AlumniAreaRow { area: string; alumni: number }
export interface TrackFund {
  status: 'active' | 'closed';
  profile: { inception_date: string | null; end_date: string | null } | null;
  record: {
    months_count: number;
    first_month: string | null;
    last_month: string | null;
    itd: number | null;
    ann_return: number | null;
    ann_vol: number | null;
    sharpe: number | null;
    max_drawdown: number | null;
    positive_share: number | null;
  };
}

export interface TrackRecordData {
  computed_at: string | null;
  last_updated: string | null;
  research: ResearchRow[];
  events: EventsRow[];
  company_visits_before_archive: number;
  semesters: SemesterRow[];
  alumni_areas: AlumniAreaRow[];
  alumni_without_area: number;
  funds: Record<string, TrackFund>;
}

export const isTrackRecordData = (v: unknown): v is TrackRecordData =>
  !!v && typeof v === 'object' && Array.isArray((v as TrackRecordData).research) && Array.isArray((v as TrackRecordData).events);

export const TRACK_DIVISIONS: ReportDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
export const trackDivisionLabel = (d: ReportDivision) => REPORT_DIVISION_LABELS[d];

export interface ResearchYear {
  year: number;
  byDivision: Record<ReportDivision, number>;
  total: number;
  pages: number;
  pagesKnown: number;
}

/** Reports per year, split by division, oldest year first. */
export function researchByYear(rows: ResearchRow[]): ResearchYear[] {
  const years = new Map<number, ResearchYear>();
  for (const r of rows) {
    const y = years.get(r.year) ?? {
      year: r.year,
      byDivision: { equity: 0, investment: 0, macro: 0, portfolio: 0, quant: 0 },
      total: 0, pages: 0, pagesKnown: 0,
    };
    if (r.division in y.byDivision) y.byDivision[r.division as ReportDivision] += r.reports;
    y.total += r.reports;
    y.pages += r.pages;
    y.pagesKnown += r.pages_known;
    years.set(r.year, y);
  }
  return [...years.values()].sort((a, b) => a.year - b.year);
}

/** The totals row of the research table. */
export function researchTotals(years: ResearchYear[]): ResearchYear {
  const t: ResearchYear = { year: 0, byDivision: { equity: 0, investment: 0, macro: 0, portfolio: 0, quant: 0 }, total: 0, pages: 0, pagesKnown: 0 };
  for (const y of years) {
    for (const d of TRACK_DIVISIONS) t.byDivision[d] += y.byDivision[d];
    t.total += y.total;
    t.pages += y.pages;
    t.pagesKnown += y.pagesKnown;
  }
  return t;
}

/** The funds the page lists: as on their own pages, a closed fund once its data and dates exist. */
export function trackFunds(data: TrackRecordData): [string, TrackFund][] {
  const order = ['long-short', 'multi-asset', 'dps', 'pir'];
  return order
    .map((f) => [f, data.funds?.[f]] as [string, TrackFund | undefined])
    .filter((x): x is [string, TrackFund] => {
      const e = x[1];
      if (!e || !e.record || e.record.months_count < 1) return false;
      return e.status === 'active' || !!(e.profile?.inception_date && e.profile?.end_date);
    });
}

/** "7 November 2026", from an ISO timestamp. */
export function trackDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
}

/** The page's own definitions, at its foot. */
export const TRACK_METHOD: { term: string; text: string }[] = [
  { term: 'Reports', text: 'Every report published in the archive, by the year on its cover and the division that wrote it. Drafts and deleted reports are not counted.' },
  { term: 'Pages', text: 'The pages of the published PDFs, counted from the files themselves.' },
  { term: 'Funds', text: 'Virtual (paper) portfolios managed by students for educational purposes: no real capital is invested and returns are simulated, net and in EUR. Every figure is computed from the monthly returns by the same function as the fund pages.' },
  { term: 'Events', text: 'Events held, by year: meetings, Association on Display days and events whose date is still to be confirmed are not counted. Speakers are counted once per year, by name.' },
  { term: 'Members and alumni', text: 'The number on the register at the end of each semester, as recorded when the semester closed.' },
  { term: 'Alumni outcomes', text: 'The job area each alumnus has recorded in the alumni directory, as typed; alumni without one are counted separately.' },
];
