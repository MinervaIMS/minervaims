// =====================================================================
// A published report, as its page (/archive/<address>), its static copy,
// llms-full.txt and the archive read it (Step 93).
// ---------------------------------------------------------------------
// The shape of public.public_reports(), and the few things worked out from
// it the same way everywhere: the sentence under a search result, the
// related reports, the link to an author's entry. Relative imports only,
// so the build's static pages load this file too.
// =====================================================================

import {
  clip, reportDivisionLabel, reportFundLabel, reportTypeLabel, reportYear, SOCIETY,
} from './report-meta';

export interface PublicAuthor {
  name: string;
  role: string | null;
  /** "/people/members?person=<id>" or "/people/alumni?person=<id>", when the person is listed. */
  link: string | null;
}

export interface PublicReport {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  date: string;
  division: string;
  fund: string | null;
  report_type: string;
  tags: string[];
  page_count: number | null;
  file_url: string;
  updated_at: string | null;
  authors: PublicAuthor[];
}

export const isPublicReport = (v: unknown): v is PublicReport =>
  !!v && typeof v === 'object' && typeof (v as PublicReport).slug === 'string' && typeof (v as PublicReport).title === 'string';

/** The report page's own address. */
export const reportPath = (slug: string) => `/archive/${slug}`;

/** "26 June 2020". */
export function reportDate(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** The sentence under a search result: the summary, or what the report is. */
export function reportMetaDescription(r: PublicReport): string {
  const summary = clip(String(r.description ?? ''), 160);
  if (summary) return summary;
  const year = reportYear(r.date);
  return `${reportTypeLabel(r.report_type) || 'Report'} by the ${reportDivisionLabel(r.division)} division of the ${SOCIETY}${year ? `, ${year}` : ''}.`;
}

/** What sits above the title: the type, and the fund when there is one. */
export function reportKicker(r: PublicReport): string {
  return [reportTypeLabel(r.report_type), reportFundLabel(r.fund)].filter(Boolean).join(' · ');
}

/**
 * Up to `n` reports to read next: the same fund first, then the same
 * division with shared tags, then the same division; closest in date
 * first within each group. Never the report itself.
 */
export function relatedReports(r: PublicReport, all: PublicReport[], n = 3): PublicReport[] {
  const tags = new Set((r.tags || []).map((t) => t.toLowerCase()));
  const when = Date.parse(r.date) || 0;
  const score = (x: PublicReport) => {
    if (r.fund && x.fund === r.fund) return 0;
    if (x.division === r.division && (x.tags || []).some((t) => tags.has(t.toLowerCase()))) return 1;
    if (x.division === r.division) return 2;
    return 3;
  };
  return all
    .filter((x) => x.slug !== r.slug)
    .map((x) => ({ x, s: score(x), d: Math.abs((Date.parse(x.date) || 0) - when) }))
    .filter((c) => c.s < 3)
    .sort((a, b) => a.s - b.s || a.d - b.d || a.x.slug.localeCompare(b.x.slug))
    .slice(0, n)
    .map((c) => c.x);
}

/** A slim entry for lists: what the archive and related lists need. */
export type ReportListItem = Pick<PublicReport, 'id' | 'slug' | 'title' | 'date' | 'division' | 'fund' | 'report_type'>;

export const toListItem = (r: PublicReport): ReportListItem =>
  ({ id: r.id, slug: r.slug, title: r.title, date: r.date, division: r.division, fund: r.fund, report_type: r.report_type });

/** The data a report page embeds (and reads back): the report and its related reports. */
export interface ReportPageData {
  report: PublicReport;
  related: ReportListItem[];
}
