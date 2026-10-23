// =====================================================================
// report-meta.ts: WHAT A REPORT SAYS ABOUT ITSELF, in one place.
// ---------------------------------------------------------------------
// The report page (/archive/<address>), its static copy, the citation,
// llms-full.txt and the metadata written into the PDF itself all describe
// a report with the same words: its type, its division, its fund, its
// authors and its tags. This file is those words and the two sentences
// built from them (the citation and the PDF's own metadata), so the page
// a person reads and the file a machine indexes cannot drift apart.
//
// Plain data and pure functions, no imports, so Deno and the browser load
// the same code. Mirrored, identical, in src/lib/report-meta.ts;
// scripts/report-meta.test.mjs fails if the two differ.
// =====================================================================

export const SOCIETY = 'Minerva Investment Management Society';

export type ReportType = 'equity_report' | 'investment_outlook' | 'macro_report' | 'fund_update' | 'quant_paper';
export type ReportDivision = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';
export type ReportFund = 'long-short' | 'multi-asset' | 'dps' | 'pir';

export const REPORT_TYPES: ReportType[] = ['equity_report', 'investment_outlook', 'macro_report', 'fund_update', 'quant_paper'];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  equity_report: 'Equity Research Report',
  investment_outlook: 'Investment Outlook',
  macro_report: 'Macro Research Report',
  fund_update: 'Fund Update',
  quant_paper: 'Quantitative Research Paper',
};

export const REPORT_DIVISION_LABELS: Record<ReportDivision, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
};

export const REPORT_FUND_LABELS: Record<ReportFund, string> = {
  'long-short': 'Long Short Equity Fund',
  'multi-asset': 'Multi Asset Global Opportunities Fund',
  'dps': 'Diversified Passive Selection Fund',
  'pir': 'Italian Equity PIR Fund',
};

/** The type a report gets from its division until somebody changes it (archive_default_type in SQL). */
export const DEFAULT_REPORT_TYPE: Record<ReportDivision, ReportType> = {
  equity: 'equity_report',
  investment: 'investment_outlook',
  macro: 'macro_report',
  portfolio: 'fund_update',
  quant: 'quant_paper',
};

// The limits the database enforces (archive_tags_ok, archive_files_authors_check).
export const TAGS_MAX = 12;
export const TAG_LENGTH_MAX = 40;
export const AUTHORS_MAX = 40;
export const AUTHOR_NAME_MAX = 120;
export const AUTHOR_ROLE_MAX = 120;

export interface ReportAuthor {
  name: string;
  role?: string | null;
  /** A Members entry (team_members.id), when picked from the list. */
  member_id?: string | null;
  /** An Alumni entry (alumni.id), when picked from the list. */
  alumni_id?: string | null;
}

/**
 * Tags as stored: trimmed, inner spaces collapsed, the first spelling of a
 * tag kept when it is typed twice in another case, at most TAGS_MAX, each
 * at most TAG_LENGTH_MAX characters. Empty entries are dropped.
 */
export function normaliseTags(tags: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags ?? []) {
    const t = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, TAG_LENGTH_MAX).trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === TAGS_MAX) break;
  }
  return out;
}

/** Authors as stored: names and roles trimmed, empty names dropped, a name listed once. */
export function normaliseAuthors(authors: readonly ReportAuthor[] | null | undefined): ReportAuthor[] {
  const out: ReportAuthor[] = [];
  const seen = new Set<string>();
  for (const a of authors ?? []) {
    const name = String(a?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, AUTHOR_NAME_MAX).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const role = String(a?.role ?? '').replace(/\s+/g, ' ').trim().slice(0, AUTHOR_ROLE_MAX).trim();
    const entry: ReportAuthor = { name };
    if (role) entry.role = role;
    if (a?.member_id) entry.member_id = a.member_id;
    else if (a?.alumni_id) entry.alumni_id = a.alumni_id;
    out.push(entry);
    if (out.length === AUTHORS_MAX) break;
  }
  return out;
}

export interface ReportFacts {
  title: string;
  date?: string | null;
  division?: string | null;
  fund?: string | null;
  report_type?: string | null;
  description?: string | null;
  tags?: readonly string[] | null;
  authors?: readonly ReportAuthor[] | null;
  slug?: string | null;
}

const label = <K extends string>(map: Record<K, string>, key: string | null | undefined): string =>
  key && key in map ? map[key as K] : '';

export const reportTypeLabel = (t: string | null | undefined) => label(REPORT_TYPE_LABELS, t);
export const reportDivisionLabel = (d: string | null | undefined) => label(REPORT_DIVISION_LABELS, d);
export const reportFundLabel = (f: string | null | undefined) => label(REPORT_FUND_LABELS, f);

/** The year of a "YYYY-MM-DD" date, or ''. */
export function reportYear(date: string | null | undefined): string {
  const m = /^(\d{4})-/.exec(String(date ?? ''));
  return m ? m[1] : '';
}

/** The report's permanent address, on the given site origin. */
export function reportUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/archive/${slug}`;
}

/**
 * "Minerva Investment Management Society (2026). Title. Equity Research. URL"
 * The title keeps its own final punctuation when it has one.
 */
export function reportCitation(r: ReportFacts, origin: string): string {
  const year = reportYear(r.date);
  const title = String(r.title ?? '').trim();
  const parts = [
    `${SOCIETY}${year ? ` (${year})` : ''}.`,
    /[.!?]$/.test(title) ? title : `${title}.`,
  ];
  const division = reportDivisionLabel(r.division);
  if (division) parts.push(`${division}.`);
  if (r.slug) parts.push(reportUrl(r.slug, origin));
  return parts.join(' ');
}

/** At most `max` characters, cut after a sentence or at a word, never inside one. */
export function clip(text: string, max: number): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('? '), head.lastIndexOf('! '));
  if (sentence >= max * 0.5) return head.slice(0, sentence + 1);
  const space = head.lastIndexOf(' ');
  return `${(space > 0 ? head.slice(0, space) : t.slice(0, max)).replace(/[\s,;:.]+$/, '')}...`;
}

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

/** The longest Subject written into a PDF; the full summary is on the report page. */
export const PDF_SUBJECT_MAX = 600;

/**
 * What the PDF itself says (Title, Author, Subject, Keywords, Creator):
 * the page's title, the page's authors in the page's order, the summary
 * (or, without one, what the report is), and the page's tags with the
 * type, the division and the fund. Built here and nowhere else, so the
 * file and the page cannot disagree.
 */
export function reportPdfMetadata(r: ReportFacts): PdfMetadata {
  const type = reportTypeLabel(r.report_type);
  const division = reportDivisionLabel(r.division);
  const fund = reportFundLabel(r.fund);
  const year = reportYear(r.date);
  const names = normaliseAuthors(r.authors).map((a) => a.name);
  const summary = clip(String(r.description ?? ''), PDF_SUBJECT_MAX);
  const what = [type || 'Report', division ? `by the ${division} division` : '', `of the ${SOCIETY}`, year ? `(${year})` : '']
    .filter(Boolean).join(' ');
  const keywords: string[] = [];
  for (const k of [...normaliseTags(r.tags), type, division, fund, SOCIETY]) {
    if (k && !keywords.some((x) => x.toLowerCase() === k.toLowerCase())) keywords.push(k);
  }
  return {
    title: String(r.title ?? '').replace(/\s+/g, ' ').trim(),
    author: names.length ? names.join(', ') : SOCIETY,
    subject: summary || `${what}.`,
    keywords: keywords.join(', '),
    creator: SOCIETY,
  };
}

/** Whether two metadata records say the same thing (a report whose PDF needs no update). */
export function sameMetadata(a: Partial<PdfMetadata> | null | undefined, b: PdfMetadata): boolean {
  if (!a) return false;
  return (['title', 'author', 'subject', 'keywords', 'creator'] as const).every((k) => (a[k] ?? '') === b[k]);
}
