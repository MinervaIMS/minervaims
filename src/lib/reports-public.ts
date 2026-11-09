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

// =====================================================================
// AN AUTHOR'S REPORTS (Step 105).
// ---------------------------------------------------------------------
// Every author on a report's page now links somewhere: to their Members
// or Alumni profile when exactly one person listed there carries the
// name, and otherwise to the archive filtered to their reports
// ("/archive?author=<name>"), which `public_reports` writes for authors
// who have left, were never members, or are not among the alumni the
// website lists. The archive matches the name the way the database does:
// `personTokens` is `public.person_tokens` (accents dropped, lower case,
// words of two letters or more, each once, sorted), and two names are the
// same author when their words are the same or, for names of two words or
// more, one's words are all in the other's, so a middle name printed on
// one cover and not on another still matches.
// =====================================================================

/** The words of a name, as `public.person_tokens` reads them. */
export function personTokens(name: string | null | undefined): string[] {
  const plain = (name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0131/g, 'i').replace(/\u0142/g, 'l').replace(/\u0111/g, 'd').replace(/\u00f8/g, 'o');
  const words = plain.replace(/[^a-z]+/g, ' ').split(' ').filter((w) => w.length > 1);
  return [...new Set(words)].sort();
}

/** Whether two printed names are the same author, as `public_reports` decides. */
export function sameAuthor(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = personTokens(a);
  const y = personTokens(b);
  if (!x.length || !y.length) return false;
  if (x.length === y.length && x.every((w, i) => w === y[i])) return true;
  if (x.length < 2 || y.length < 2) return false;
  return x.every((w) => y.includes(w)) || y.every((w) => x.includes(w));
}

/** The archive filtered to one author's reports. */
export const authorArchivePath = (name: string) => `/archive?author=${encodeURIComponent(name.trim())}`;
