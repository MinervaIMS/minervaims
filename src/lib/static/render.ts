// =====================================================================
// THE STATIC PAGES, AS HTML (Step 93).
// ---------------------------------------------------------------------
// The pages an assistant is most likely to cite are written by the build
// as real HTML (vite.static-pages.ts): every report, the archive, the
// four funds, the five divisions and /track-record. This file turns the
// data into that HTML. It uses the same words (public-content.ts), the
// same formatting (fund-record.ts, report-meta.ts, track-record.ts) and
// the same structured data (seo/structured-data.ts) as the React pages,
// so what a crawler reads is what a person sees, value for value.
//
// The classes are the site's own, so the page reads as the site while
// the app starts. Relative imports only: the build loads this file.
// =====================================================================

import { SITE_NAME, absoluteUrl } from '../seo/site';
import {
  SOCIETY, clip, reportCitation, reportDivisionLabel, reportFundLabel, reportTypeLabel, type ReportDivision,
} from '../report-meta';
import {
  reportDate, reportKicker, reportPath, type PublicReport, type ReportListItem,
} from '../reports-public';
import {
  MONTH_SHORT, VIRTUAL_PORTFOLIO_STATEMENT, fmtMonth, fmtPct, fmtRatio, fmtSignedPct, fundNotes, fundRecordShown,
  fundStats, shownReferences, type FundEntry,
} from '../fund-record';
import {
  TRACK_DIVISIONS, TRACK_METHOD, researchByYear, researchTotals, trackDate, trackDivisionLabel, trackFunds,
  type TrackRecordData,
} from '../track-record';
import {
  DIVISION_CONTENT, FUND_CONTENT, FUND_DESCRIPTIONS, type ContentDivision, type ContentFund,
} from '../public-content';

/** Text for HTML. */
export const esc = (s: unknown): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const h2 = (t: string) => `<h2 class="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">${esc(t)}</h2>`;
const section = (inner: string, id?: string) =>
  `<section class="py-8 md:py-10"${id ? ` id="${esc(id)}"` : ''}>${inner}</section>`;
const link = (href: string, text: string, cls = 'underline underline-offset-4') => `<a href="${esc(href)}" class="${cls}">${esc(text)}</a>`;
const paras = (text: string | null | undefined, cls = 'font-body text-body-lg text-muted-foreground mb-4 max-w-3xl') =>
  String(text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p class="${cls}">${esc(p)}</p>`).join('');

/** The frame every static page shares: a header, the page, a footer. */
export function frame(main: string, crumbs: { name: string; path: string }[]): string {
  const trail = crumbs.length
    ? `<nav aria-label="Breadcrumb" class="font-body text-small text-muted-foreground mb-6">${[{ name: 'Home', path: '/' }, ...crumbs]
      .map((c, i, all) => (i === all.length - 1 ? `<span>${esc(c.name)}</span>` : link(c.path, c.name, 'hover:text-accent')))
      .join(' <span aria-hidden="true">/</span> ')}</nav>`
    : '';
  const nav = [['/about', 'About'], ['/archive', 'Archive'], ['/track-record', 'Track Record'], ['/events', 'Events'], ['/numbers', 'Numbers'], ['/join', 'Join']]
    .map(([href, text]) => link(href, text, 'hover:text-accent')).join('');
  return `<div id="mims-static" class="bg-background text-foreground min-h-screen">
<header class="border-b border-separator"><div class="container py-5 flex flex-wrap items-center justify-between gap-4">
<a href="/" class="font-serif text-xl text-accent">${esc(SITE_NAME)}</a>
<nav class="font-body text-small flex flex-wrap gap-x-5 gap-y-2">${nav}</nav>
</div></header>
<main class="container py-10 md:py-14">${trail}${main}</main>
<footer class="border-t border-separator"><div class="container py-6 font-body text-xs text-muted-foreground">
<p>${esc(SOCIETY)}, a student association of Università Bocconi, Milan. Research is produced by students for educational purposes and is not investment advice.</p>
<p class="mt-2">${[['/divisions/equity', 'Equity Research'], ['/divisions/investment', 'Investment Research'], ['/divisions/macro', 'Macro Research'], ['/divisions/portfolio', 'Portfolio Management'], ['/divisions/quant', 'Quantitative Research'], ['/funds/long-short', 'Long Short Equity'], ['/funds/multi-asset', 'Multi Asset Global Opportunities'], ['/llms-full.txt', 'llms-full.txt'], ['/data/funds.json', 'funds.json']].map(([h, t]) => link(h, t)).join(' · ')}</p>
</div></footer>
</div>`;
}

// ── A report ─────────────────────────────────────────────────────────

/** The two addresses the report's buttons use: the PDF under its own title. */
export function reportFileUrls(r: Pick<PublicReport, 'id' | 'title' | 'file_url'>, supabaseUrl: string) {
  if (!supabaseUrl) return { view: r.file_url, download: r.file_url };
  // The file name rule of open-report.ts (that file reads the browser's
  // environment, so the build cannot import it): no reserved or control characters.
  const clean = [...String(r.title || 'Report')].filter((c) => c >= ' ' && !'<>:"/\\|?*'.includes(c)).join('');
  const name = encodeURIComponent(`${clean.replace(/\s+/g, ' ').trim() || 'Report'}.pdf`);
  const base = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/report-file/${name}?id=${encodeURIComponent(r.id)}`;
  return { view: base, download: `${base}&download=1` };
}

export function reportBody(r: PublicReport, related: ReportListItem[], supabaseUrl: string, origin: string): string {
  const files = reportFileUrls(r, supabaseUrl);
  const division = reportDivisionLabel(r.division);
  const fund = reportFundLabel(r.fund);
  const meta = [
    `<time datetime="${esc(r.date)}">${esc(reportDate(r.date))}</time>`,
    link(`/divisions/${r.division}`, division),
    ...(fund && r.fund ? [link(`/funds/${r.fund}`, fund)] : []),
  ].join(' · ');
  const authors = r.authors.length
    ? section(`${h2('Authors')}<ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">${r.authors.map((a) => `<li class="font-body">${a.link ? link(a.link, a.name, 'text-foreground underline underline-offset-4') : `<span class="text-foreground">${esc(a.name)}</span>`}${a.role ? `<span class="block text-small text-muted-foreground">${esc(a.role)}</span>` : ''}</li>`).join('')}</ul>`)
    : '';
  const tags = r.tags.length
    ? section(`${h2('Tags')}<ul class="flex flex-wrap gap-2">${r.tags.map((t) => `<li class="font-body text-small border border-separator px-3 py-1">${esc(t)}</li>`).join('')}</ul>`)
    : '';
  const facts: [string, string][] = [
    ['Published', reportDate(r.date)], ['Division', division], ...(fund ? [['Fund', fund] as [string, string]] : []),
    ['Type', reportTypeLabel(r.report_type)], ...(r.page_count != null ? [['Pages', String(r.page_count)] as [string, string]] : []),
    ...(r.authors.length ? [['Authors', String(r.authors.length)] as [string, string]] : []),
  ];
  const relatedList = related.length
    ? section(`${h2('Related reports')}<ul>${related.map((x) => `<li class="py-3 border-b border-separator"><p class="font-body text-xs uppercase tracking-wider text-muted-foreground">${esc(reportDate(x.date))} · ${esc(reportFundLabel(x.fund) || reportDivisionLabel(x.division))}</p>${link(reportPath(x.slug), x.title, 'font-serif text-subheading text-foreground')}</li>`).join('')}</ul>`)
    : '';
  return `<article>
<p class="font-body text-xs uppercase tracking-wider text-primary">${esc(reportKicker(r))}</p>
<h1 class="font-serif text-[2.5rem] md:text-[3.5rem] leading-tight text-accent mt-2">${esc(r.title)}</h1>
<p class="font-body text-small text-muted-foreground mt-3">${meta}</p>
<p class="mt-6 flex flex-wrap gap-3">${link(files.view, 'Open the PDF', 'cta-link-invert')} ${link(files.download, 'Download', 'cta-link')}</p>
${r.description ? section(`${h2('Summary')}${paras(r.description)}`) : ''}
${authors}${tags}
${section(`${h2('Details')}<dl class="font-body text-small grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 max-w-md">${facts.map(([k, v]) => `<dt class="text-muted-foreground">${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`)}
${section(`${h2('Cite this report')}<p class="font-body text-body bg-muted border-l-2 border-primary p-4 break-words">${esc(reportCitation(r, origin))}</p>`)}
${relatedList}
</article>`;
}

// ── The archive ──────────────────────────────────────────────────────

export function archiveBody(reports: PublicReport[]): string {
  const byYear = new Map<string, PublicReport[]>();
  for (const r of reports) {
    const y = r.date.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), r]);
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a));
  return `<h1 class="font-serif text-[2.5rem] md:text-[3.5rem] text-accent">Archive</h1>
${h2('Browse all research reports and publications')}
${years.map((y) => section(`<h3 class="font-serif text-subheading text-accent mb-3">${esc(y)}</h3><ul>${byYear.get(y)!.map((r) => `<li class="py-2 border-b border-separator"><span class="font-body text-xs uppercase tracking-wider text-muted-foreground">${esc(reportDate(r.date))} · ${esc(reportFundLabel(r.fund) || reportDivisionLabel(r.division))}</span><br>${link(reportPath(r.slug), r.title, 'font-serif text-body-lg text-foreground')}</li>`).join('')}</ul>`)).join('')}`;
}

/** Old "/archive?fileId=<id>" links, sent to the report's page before anything else loads. */
export function fileIdRedirectScript(reports: Pick<PublicReport, 'id' | 'slug'>[]): string {
  const map = Object.fromEntries(reports.map((r) => [r.id.toLowerCase(), r.slug]));
  return `<script>(function(){try{var m=/[?&]fileId=([0-9a-fA-F-]{36})/.exec(location.search);if(!m)return;var s=${JSON.stringify(map).replace(/</g, '\\u003c')}[m[1].toLowerCase()];if(s)location.replace('/archive/'+s);}catch(e){}})();</script>`;
}

// ── A fund ───────────────────────────────────────────────────────────

const lightList = (items: { href: string; title: string; date: string }[]) =>
  `<ul>${items.map((x) => `<li class="py-2 border-b border-separator"><span class="font-body text-xs uppercase tracking-wider text-muted-foreground">${esc(reportDate(x.date))}</span><br>${link(x.href, x.title, 'font-serif text-body-lg text-foreground')}</li>`).join('')}</ul>`;

export function fundBody(fund: ContentFund, entry: FundEntry | null, reports: PublicReport[]): string {
  const c = FUND_CONTENT[fund];
  const closed = fund === 'dps' || fund === 'pir';
  let record = '';
  if (entry && fundRecordShown(entry)) {
    const r = entry.record;
    const head = `<tr class="bg-accent text-background"><th scope="col" class="py-2 px-2">Year</th><th scope="col" class="py-2 px-2">ITD</th>${MONTH_SHORT.map((m) => `<th scope="col" class="py-2 px-2 font-normal">${m}</th>`).join('')}<th scope="col" class="py-2 px-2">YTD</th><th scope="col" class="py-2 px-2">Vol</th><th scope="col" class="py-2 px-2">Sharpe</th></tr>`;
    const rows = r.years.map((y) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 font-normal text-accent">${y.year}</th><td class="py-2 px-2 text-center">${esc(fmtPct(y.itd))}</td>${y.months.map((v) => `<td class="py-2 px-2 text-center">${esc(fmtSignedPct(v))}</td>`).join('')}<td class="py-2 px-2 text-center">${esc(fmtSignedPct(y.ytd))}</td><td class="py-2 px-2 text-center">${esc(fmtPct(y.vol))}</td><td class="py-2 px-2 text-center">${esc(fmtRatio(y.sharpe))}</td></tr>`).join('');
    const refs = shownReferences(r);
    record = `<p class="p-4 bg-muted border-l-2 border-primary font-body text-body text-muted-foreground">${esc(VIRTUAL_PORTFOLIO_STATEMENT)}</p>
${section(`${h2('Monthly returns')}<div class="overflow-x-auto"><table class="w-full text-sm font-body border-collapse"><thead>${head}</thead><tbody>${rows}</tbody></table></div>${c.benchmarkNote ? `<p class="mt-6 font-body text-sm text-muted-foreground italic">${esc(c.benchmarkNote)}</p>` : ''}<ul class="mt-4 font-body text-xs text-muted-foreground">${fundNotes(entry).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`)}
${section(`${h2('Statistics')}<dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">${fundStats(entry).map((s) => `<div><dt class="font-body text-small text-muted-foreground">${esc(s.label)}</dt><dd class="font-serif text-subheading text-accent mt-1">${esc(s.value)}</dd>${s.note ? `<dd class="font-body text-xs text-muted-foreground mt-1">${esc(s.note)}</dd>` : ''}</div>`).join('')}</dl>`)}
${refs.length ? section(`${h2('Market references')}<table class="w-full text-sm font-body border-collapse"><thead><tr class="bg-accent text-background"><th scope="col" class="py-2 px-2 text-left">Index</th><th scope="col" class="py-2 px-2 text-left font-normal">Series</th><th scope="col" class="py-2 px-2">Months</th><th scope="col" class="py-2 px-2">Beta</th><th scope="col" class="py-2 px-2">Correlation</th></tr></thead><tbody>${refs.map((x) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 text-left font-normal">${esc(x.label)}</th><td class="py-2 px-2">${esc(`${x.variant}, ${x.currency}`)}</td><td class="py-2 px-2 text-center">${esc(`${x.months} (${fmtMonth(x.from)} to ${fmtMonth(x.to)})`)}</td><td class="py-2 px-2 text-center">${esc(fmtRatio(x.beta))}</td><td class="py-2 px-2 text-center">${esc(fmtRatio(x.correlation))}</td></tr>`).join('')}</tbody></table>`) : ''}
${entry.profile?.methodology || entry.profile?.rebalancing_policy ? section(`${h2('Method')}${entry.profile?.methodology ? `<p class="font-body text-body-lg text-muted-foreground max-w-4xl">${esc(entry.profile.methodology)}</p>` : ''}${entry.profile?.rebalancing_policy ? `<p class="font-body text-body-lg text-muted-foreground max-w-4xl mt-4">Rebalancing. ${esc(entry.profile.rebalancing_policy)}</p>` : ''}`) : ''}
${section(`${h2('Data')}<ul class="font-body text-body"><li>${link(`/data/funds-${fund}.csv`, 'Monthly returns (CSV)')}</li><li>${link('/data/funds.json', 'Every fund\'s figures, with their definitions (JSON)')}</li><li>${link('/track-record', 'Minerva\'s track record')}</li></ul>`)}`;
  }
  return `<h1 class="font-serif text-[2.5rem] md:text-[3.5rem] text-accent">${esc(c.title)}</h1>
${section(`${h2(c.subtitle)}${closed ? '<p class="mb-6 p-4 bg-muted border-l-2 border-primary font-body text-body-lg text-muted-foreground">This fund is now closed. Historical reports are available below.</p>' : ''}<p class="font-body text-body-lg text-muted-foreground max-w-4xl">${esc(c.description)}</p>`)}
${record}
${reports.length ? section(`${h2(c.sectionTitle)}${lightList(reports.map((r) => ({ href: reportPath(r.slug), title: r.title, date: r.date })))}<p class="mt-6">${link(`/archive?fund=${fund}`, 'Browse the full archive', 'cta-link')}</p>`) : ''}`;
}

// ── A division ───────────────────────────────────────────────────────

export interface StaticDivisionPage { standards: string; review: string; tools: string; flagship_ids: string[] }

export function divisionBody(division: ContentDivision, page: StaticDivisionPage | null, flagship: PublicReport[], reports: PublicReport[]): string {
  const c = DIVISION_CONTENT[division];
  const parts = ([['standards', 'Standards'], ['review', 'Review'], ['tools', 'Tools and data']] as const)
    .filter(([k]) => (page?.[k] ?? '').trim());
  const funds = division === 'portfolio'
    ? section(`${h2('MIMS Virtual Funds')}<ul>${(Object.keys(FUND_DESCRIPTIONS) as ContentFund[]).map((f) => `<li class="py-3 border-b border-separator">${link(`/funds/${f}`, FUND_CONTENT[f].title, 'font-serif text-subheading text-foreground')}<p class="font-body text-body text-muted-foreground">${esc(FUND_DESCRIPTIONS[f])}</p></li>`).join('')}</ul>`)
    : '';
  return `<h1 class="font-serif text-[2.5rem] md:text-[3.5rem] text-accent">${esc(c.title)}</h1>
${section(`${h2(c.subtitle)}<p class="font-body text-body-lg text-muted-foreground max-w-3xl">${esc(c.description)}</p><p class="mt-6">${link(`/people/members?division=${division}`, 'Meet the Team', 'cta-link')}</p>`)}
${funds}
${parts.length ? section(`${h2('How we work')}<div class="grid grid-cols-1 md:grid-cols-3 gap-8">${parts.map(([k, t]) => `<div><h3 class="font-serif text-subheading text-foreground mb-3">${esc(t)}</h3><p class="font-body text-body text-muted-foreground">${esc(page![k])}</p></div>`).join('')}</div>`) : ''}
${flagship.length ? section(`${h2('Flagship work')}<ul class="grid grid-cols-1 md:grid-cols-3 gap-6">${flagship.map((f) => `<li class="bg-muted p-6"><p class="font-body text-xs uppercase tracking-wider text-muted-foreground">${esc(reportDate(f.date))}</p><h3 class="font-serif text-subheading text-foreground mt-2 mb-3">${link(reportPath(f.slug), f.title, '')}</h3>${f.description ? `<p class="font-body text-small text-muted-foreground">${esc(clip(f.description, 220))}</p>` : ''}</li>`).join('')}</ul>`) : ''}
${reports.length ? section(`${h2(c.sectionTitle)}${lightList(reports.map((r) => ({ href: reportPath(r.slug), title: r.title, date: r.date })))}<p class="mt-6">${link(`/archive?division=${division}`, 'Browse the full archive', 'cta-link')}</p>`) : ''}`;
}

// ── The track record ─────────────────────────────────────────────────

export function trackRecordBody(data: TrackRecordData): string {
  const years = researchByYear(data.research);
  const totals = researchTotals(years);
  const funds = trackFunds(data);
  const th = (t: string, cls = '') => `<th scope="col" class="py-2 px-2 ${cls}">${esc(t)}</th>`;
  const td = (t: string | number) => `<td class="py-2 px-2 text-center">${esc(t)}</td>`;
  const research = years.length ? section(`${h2('Research')}<div class="overflow-x-auto"><table class="w-full text-sm font-body border-collapse"><thead><tr class="bg-accent text-background">${th('Year', 'text-left')}${TRACK_DIVISIONS.map((d) => th(trackDivisionLabel(d as ReportDivision))).join('')}${th('Reports')}${th('Pages')}</tr></thead><tbody>${years.map((y) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 text-left font-normal text-accent">${y.year}</th>${TRACK_DIVISIONS.map((d) => td(y.byDivision[d])).join('')}${td(y.total)}${td(y.pagesKnown ? y.pages : '')}</tr>`).join('')}<tr class="bg-muted"><th scope="row" class="py-2 px-2 text-left">Total</th>${TRACK_DIVISIONS.map((d) => td(totals.byDivision[d])).join('')}${td(totals.total)}${td(totals.pagesKnown ? totals.pages : '')}</tr></tbody></table></div>${totals.pagesKnown < totals.total ? `<p class="mt-3 font-body text-xs text-muted-foreground">Pages are counted for the ${totals.pagesKnown} of ${totals.total} reports whose PDF has been counted so far.</p>` : ''}`, 'research') : '';
  const fundTable = funds.length ? section(`${h2('Funds')}<p class="font-body text-body text-muted-foreground max-w-4xl mb-6">${esc(VIRTUAL_PORTFOLIO_STATEMENT)}</p><div class="overflow-x-auto"><table class="w-full text-sm font-body border-collapse"><thead><tr class="bg-accent text-background">${th('Fund', 'text-left')}${th('Record', 'text-left')}${th('Since inception')}${th('Annualised return')}${th('Annualised volatility')}${th('Sharpe (€STR)')}${th('Maximum drawdown')}</tr></thead><tbody>${funds.map(([k, f]) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 text-left font-normal">${link(`/funds/${k}`, reportFundLabel(k))}${f.status === 'closed' ? ' <span class="text-xs text-muted-foreground">Closed</span>' : ''}</th><td class="py-2 px-2">${esc(`${f.record.months_count} months, ${fmtMonth(f.record.first_month)} to ${fmtMonth(f.record.last_month)}`)}</td>${td(fmtPct(f.record.itd))}${td(fmtPct(f.record.ann_return))}${td(fmtPct(f.record.ann_vol))}${td(fmtRatio(f.record.sharpe))}${td(fmtPct(f.record.max_drawdown))}</tr>`).join('')}</tbody></table></div>`, 'funds') : '';
  const events = data.events.length ? section(`${h2('Events and speakers')}<table class="w-full text-sm font-body border-collapse"><thead><tr class="bg-accent text-background">${th('Year', 'text-left')}${th('Events held')}${th('With guest speakers')}${th('Speakers')}${th('Alumni calls')}${th('Company visits')}</tr></thead><tbody>${data.events.map((e) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 text-left font-normal text-accent">${e.year}</th>${td(e.events)}${td(e.with_guests)}${td(e.speakers)}${td(e.alumni_calls)}${td(e.company_visits)}</tr>`).join('')}</tbody></table>${data.company_visits_before_archive > 0 ? `<p class="mt-3 font-body text-xs text-muted-foreground">${data.company_visits_before_archive} company visits took place before the events archive begins; they are not shown by year.</p>` : ''}`, 'events') : '';
  const people = data.semesters.length ? section(`${h2('Members and alumni')}<table class="text-sm font-body border-collapse"><thead><tr class="bg-accent text-background">${th('Semester', 'text-left')}${th('Members')}${th('Alumni')}</tr></thead><tbody>${data.semesters.map((s) => `<tr class="border-b border-separator"><th scope="row" class="py-2 px-2 text-left font-normal text-accent">${esc(s.label)}</th>${td(s.members)}${td(s.alumni)}</tr>`).join('')}</tbody></table>`, 'people') : '';
  const alumni = data.alumni_areas.length ? section(`${h2('Where alumni work')}<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 font-body text-body">${data.alumni_areas.map((a) => `<li class="flex justify-between gap-4 border-b border-separator py-2"><span>${esc(a.area)}</span><span class="text-muted-foreground">${a.alumni}</span></li>`).join('')}</ul>${data.alumni_without_area > 0 ? `<p class="mt-3 font-body text-xs text-muted-foreground">${data.alumni_without_area} alumni in the directory have not recorded a job area.</p>` : ''}`, 'alumni') : '';
  return `<h1 class="font-serif text-[2.5rem] md:text-[3.5rem] text-accent">Track Record</h1>
${section(`${h2('What Minerva has published, run and held')}<p class="font-body text-body-lg text-muted-foreground max-w-4xl">The research, the funds, the events and the people of the Minerva Investment Management Society, year by year, counted automatically from the association's own records. The definitions are at the foot of the page.</p>${data.last_updated ? `<p class="mt-4 font-body text-small text-muted-foreground">Last updated ${esc(trackDate(data.last_updated))}.</p>` : ''}`)}
${research}${fundTable}${events}${people}${alumni}
${section(`${h2('Method')}<dl class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">${TRACK_METHOD.map((m) => `<div><dt class="font-serif text-subheading">${esc(m.term)}</dt><dd class="font-body text-body text-muted-foreground mt-1">${esc(m.text)}</dd></div>`).join('')}</dl>`, 'method')}`;
}

/** A plain-text line per report, for llms-full.txt. */
export function llmsFullText(reports: PublicReport[], origin: string, builtAt: string): string {
  const head = `# ${SOCIETY}: every published report

> The full research archive of the ${SOCIETY}, the student investment society of Università Bocconi, one entry per report: title, date, division, fund, type, authors, tags, summary and the report's permanent address. Generated from the same records as the website on ${builtAt.slice(0, 10)}. Research is produced by students for educational purposes and is not investment advice.

Archive: ${absoluteUrl('/archive')}
Track record: ${absoluteUrl('/track-record')}
Citation form: ${SOCIETY} (year). Title. Division. URL

`;
  const body = reports.map((r) => {
    const lines = [
      `## ${r.title}`,
      '',
      `- Address: ${origin.replace(/\/+$/, '')}${reportPath(r.slug)}`,
      `- Date: ${r.date}`,
      `- Division: ${reportDivisionLabel(r.division)}`,
      ...(r.fund ? [`- Fund: ${reportFundLabel(r.fund)}`] : []),
      `- Type: ${reportTypeLabel(r.report_type)}`,
      ...(r.authors.length ? [`- Authors: ${r.authors.map((a) => (a.role ? `${a.name} (${a.role})` : a.name)).join('; ')}`] : []),
      ...(r.tags.length ? [`- Tags: ${r.tags.join(', ')}`] : []),
      ...(r.page_count != null ? [`- Pages: ${r.page_count}`] : []),
      `- PDF: ${r.file_url}`,
      `- Cite as: ${reportCitation(r, origin)}`,
    ];
    const summary = String(r.description ?? '').replace(/\s*\n\s*\n\s*/g, '\n\n').trim();
    return `${lines.join('\n')}${summary ? `\n\n${summary}` : ''}\n`;
  }).join('\n');
  return `${head}${body}`;
}
