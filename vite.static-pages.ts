import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { fullTitle } from './src/lib/seo/head';
import { SITE_URL, absoluteUrl } from './src/lib/seo/site';
import { DIVISION_META, FUND_META, ROUTE_META } from './src/lib/seo/routes';
import {
  breadcrumbSchema, fundDatasetSchema, fundSchema, graph, reportListSchema, reportSchema, type JsonLd,
} from './src/lib/seo/structured-data';
import {
  isPublicReport, relatedReports, reportMetaDescription, reportPath, toListItem, type PublicReport,
} from './src/lib/reports-public';
import { SOCIETY } from './src/lib/report-meta';
import {
  RECORD_FUNDS, VIRTUAL_PORTFOLIO_STATEMENT, fundCsv, fundRecordShown, isFundsSnapshot, type FundsSnapshot,
} from './src/lib/fund-record';
import { isTrackRecordData, type TrackRecordData } from './src/lib/track-record';
import { DIVISION_CONTENT, FUND_CONTENT, type ContentDivision, type ContentFund } from './src/lib/public-content';
import {
  archiveBody, divisionBody, esc, fileIdRedirectScript, frame, fundBody, llmsFullText, reportBody, trackRecordBody,
  type StaticDivisionPage,
} from './src/lib/static/render';
import { PAGE_DATA_ELEMENT_ID, STATIC_STYLE_ELEMENT_ID } from './src/lib/page-data';

// =====================================================================
// THE PAGES WORTH CITING, AS REAL HTML (Step 93).
// ---------------------------------------------------------------------
// Part of the ordinary `vite build` Lovable runs on Publish, like the key
// numbers (vite.key-numbers.ts). It reads the published records once,
// with the public key, through the same database functions the site
// reads, and writes:
//
//   archive/<address>/index.html    one per published report
//   archive/index.html              the archive, and the redirect of old
//                                   "/archive?fileId=" links
//   funds/<fund>/index.html         the four funds
//   divisions/<division>/index.html the five divisions
//   track-record/index.html
//   data/funds.json, data/funds-<fund>.csv
//   llms-full.txt                   every report, as plain text
//   sitemap.xml                     every page, with its real last change
//
// Each page is the app's own index.html with the page's title, its
// description, its canonical address and its structured data in <head>,
// the page itself as HTML in <body>, and the data the app needs to draw
// the same page (lib/page-data.ts). The host serves /x from x/index.html,
// so a crawler that does not run JavaScript reads the page; a person sees
// it until the app has drawn the same page over it.
//
// THE BUILD NEVER FAILS BECAUSE OF DATA. Anything that cannot be read in
// time is simply not written, and that page stays what it was: the app,
// reading its data live.
// =====================================================================

const TIMEOUT_MS = 15000;

interface Env { url: string; anonKey: string; root: string }

interface Data {
  reports: PublicReport[] | null;
  funds: FundsSnapshot | null;
  track: TrackRecordData | null;
  divisions: Record<string, StaticDivisionPage & { updated_at?: string }> | null;
  hidden: Set<string>;
}

async function call(env: Env, pathPart: string, init?: RequestInit): Promise<unknown> {
  if (!env.url || !env.anonKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${env.url.replace(/\/$/, '')}${pathPart}`, {
      ...init,
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}`, 'Content-Type': 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const rpc = (env: Env, fn: string) => call(env, `/rest/v1/rpc/${fn}`, { method: 'POST', body: '{}' });

async function readData(env: Env): Promise<Data> {
  const [reports, funds, track, divisions, visibility] = await Promise.all([
    rpc(env, 'public_reports'),
    rpc(env, 'public_fund_track_records'),
    rpc(env, 'public_track_record'),
    call(env, '/rest/v1/division_pages?select=division,standards,review,tools,flagship_ids,updated_at'),
    call(env, '/rest/v1/page_visibility?select=page_key,is_hidden'),
  ]);
  return {
    reports: Array.isArray(reports) ? reports.filter(isPublicReport) : null,
    funds: isFundsSnapshot(funds) ? funds : null,
    track: isTrackRecordData(track) ? track : null,
    divisions: Array.isArray(divisions)
      ? Object.fromEntries((divisions as (StaticDivisionPage & { division: string })[]).map((d) => [d.division, d]))
      : null,
    hidden: new Set(Array.isArray(visibility)
      ? (visibility as { page_key: string; is_hidden: boolean }[]).filter((v) => v.is_hidden).map((v) => v.page_key)
      : []),
  };
}

/** JSON that is safe inside a <script> element. */
const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  .split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

interface PageSpec {
  path: string;
  title: string;
  description: string;
  socialTitle?: string;
  breadcrumbs: { name: string; path: string }[];
  nodes: (JsonLd | null | undefined)[];
  dataKey: string;
  data: unknown;
  body: string;
  head?: string;
}

/** The app's index.html, made into one page (see the comment at the top). */
function pageHtml(base: string, p: PageSpec): string {
  const canonical = absoluteUrl(p.path);
  const title = fullTitle(p.title);
  const social = fullTitle(p.socialTitle ?? p.title);
  const trail = [{ name: 'Home', path: '/' }, ...p.breadcrumbs];
  const ld = graph([breadcrumbSchema(trail), ...p.nodes]);
  const setMeta = (html: string, attr: 'name' | 'property', key: string, value: string) => {
    const re = new RegExp(`<meta data-rh="true" ${attr}="${key.replace(/:/g, '\\:')}" content="[^"]*"\\s*/?>`);
    const tag = `<meta data-rh="true" ${attr}="${key}" content="${esc(value)}" />`;
    return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
  };
  let html = base.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name', 'description', p.description);
  html = html.replace(/<link data-rh="true" rel="canonical" href="[^"]*"\s*\/?>/, `<link data-rh="true" rel="canonical" href="${esc(canonical)}" />`);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'property', 'og:title', social);
  html = setMeta(html, 'property', 'og:description', p.description);
  html = setMeta(html, 'name', 'twitter:title', social);
  html = setMeta(html, 'name', 'twitter:description', p.description);
  const head = [
    `<script type="application/ld+json" data-rh="true">${ld.replace(/</g, '\\u003c')}</script>`,
    `<script type="application/json" id="${PAGE_DATA_ELEMENT_ID}">${scriptJson({ key: p.dataKey, data: p.data })}</script>`,
    `<style id="${STATIC_STYLE_ELEMENT_ID}">#root{display:none}</style>`,
    p.head ?? '',
  ].filter(Boolean).join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  // The site summary for readers without JavaScript is the page itself
  // here, so the generic one is left out.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
  return html.replace('<div id="root">', `${frame(p.body, p.breadcrumbs)}\n    <div id="root">`);
}

const day = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10) : '');
const latest = (...isos: (string | null | undefined)[]) => isos.map(day).filter(Boolean).sort().pop() ?? '';

/** Rows of the reports a page lists, in the shape the app's lists read. */
const asRows = (rs: PublicReport[]) => rs.map((r) => ({
  id: r.id, slug: r.slug, title: r.title, description: r.description, file_url: r.file_url, date: r.date, division: r.division, fund: r.fund,
}));

export function staticPagesPlugin(env: Env): Plugin {
  let data: Data | null = null;
  let builtAt = '';
  return {
    name: 'mims-static-pages',
    apply: 'build',
    enforce: 'post',
    async buildStart() {
      builtAt = new Date().toISOString();
      data = await readData(env);
      this.info?.(`static pages: ${data.reports ? `${data.reports.length} reports` : 'reports unavailable'}, `
        + `${data.funds ? 'funds' : 'funds unavailable'}, ${data.track ? 'track record' : 'track record unavailable'}`);
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const index = bundle['index.html'];
        if (!data || !index || index.type !== 'asset') return;
        const base = String(index.source);
        const d = data;
        const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source });
        const lastmod = new Map<string, string>();
        const reports = d.reports ?? [];
        const archiveHidden = d.hidden.has('archive');

        // ── Reports ─────────────────────────────────────────────────
        if (d.reports && !archiveHidden) {
          for (const r of reports) {
            const related = relatedReports(r, reports).map(toListItem);
            emit(`archive/${r.slug}/index.html`, pageHtml(base, {
              path: reportPath(r.slug),
              title: r.title,
              description: reportMetaDescription(r),
              breadcrumbs: [{ name: 'Archive', path: '/archive' }, { name: r.title, path: reportPath(r.slug) }],
              nodes: [reportSchema(r, absoluteUrl(reportPath(r.slug)))],
              dataKey: `report:${r.slug}`,
              data: { report: r, related },
              body: reportBody(r, related, env.url, SITE_URL),
            }));
            lastmod.set(reportPath(r.slug), day(r.updated_at) || r.date);
          }
          const meta = ROUTE_META['/archive'];
          emit('archive/index.html', pageHtml(base, {
            path: '/archive',
            title: meta?.title ?? 'Archive',
            description: meta?.description ?? '',
            socialTitle: meta?.socialTitle,
            breadcrumbs: [{ name: meta?.title ?? 'Archive', path: '/archive' }],
            nodes: [reportListSchema(reports.slice(0, 40).map((f) => ({
              id: f.id, title: f.title, date: f.date, description: f.description, url: f.file_url, division: f.division,
            })), `Research published by ${SOCIETY}`)],
            dataKey: 'archive',
            data: null,
            body: archiveBody(reports),
            head: fileIdRedirectScript(reports),
          }));
          lastmod.set('/archive', latest(...reports.map((r) => r.updated_at)));
          emit('llms-full.txt', llmsFullText(reports, SITE_URL, builtAt));
        }

        // ── Funds ───────────────────────────────────────────────────
        if (d.funds) {
          const machine = {
            name: `${SOCIETY}: fund track records`,
            url: absoluteUrl('/track-record'),
            description: `${VIRTUAL_PORTFOLIO_STATEMENT} Only the monthly returns are typed; every other figure is computed from them by one function (public.fund_track_record): the year-to-date and inception-to-date returns compounded, the volatility as the sample standard deviation of monthly returns times the square root of twelve, the Sharpe ratio on the euro short-term rate (EONIA less 8.5 basis points before October 2019), the maximum drawdown of the compounded value, and beta and correlation to market indices over shared months.`,
            built_at: builtAt,
            computed_at: d.funds.computed_at,
            units: { returns: 'percent', volatility: 'percent a year', sharpe: 'ratio', beta: 'ratio', correlation: 'ratio' },
            funds: Object.fromEntries(RECORD_FUNDS.map((f) => {
              const e = d.funds!.funds[f];
              const shown = fundRecordShown(e);
              return [f, {
                name: FUND_CONTENT[f as ContentFund].title,
                url: absoluteUrl(`/funds/${f}`),
                status: e?.status ?? (f === 'dps' || f === 'pir' ? 'closed' : 'active'),
                csv: shown ? absoluteUrl(`/data/funds-${f}.csv`) : null,
                profile: e?.profile ?? null,
                record: shown ? e!.record : null,
              }];
            })),
          };
          emit('data/funds.json', `${JSON.stringify(machine, null, 2)}\n`);
          for (const f of RECORD_FUNDS) {
            const e = d.funds.funds[f];
            if (fundRecordShown(e)) emit(`data/funds-${f}.csv`, fundCsv(f, e!));
          }
          for (const f of RECORD_FUNDS) {
            if (d.hidden.has(`fund-${f}`)) continue;
            const e = d.funds.funds[f] ?? null;
            const c = FUND_CONTENT[f as ContentFund];
            const fundReports = reports.filter((r) => r.fund === f).slice(0, 9);
            emit(`funds/${f}/index.html`, pageHtml(base, {
              path: `/funds/${f}`,
              title: FUND_META[f]?.title ?? c.title,
              description: FUND_META[f]?.description ?? c.subtitle,
              socialTitle: c.title,
              breadcrumbs: [{ name: 'About', path: '/about' }, { name: c.title, path: `/funds/${f}` }],
              nodes: [fundSchema(f), e && fundRecordShown(e) ? fundDatasetSchema(f, e, c.title) : null],
              dataKey: `fund:${f}`,
              data: { entry: e, reports: asRows(fundReports) },
              body: fundBody(f as ContentFund, e, fundReports),
            }));
            lastmod.set(`/funds/${f}`, latest(d.funds.updated_at, ...fundReports.map((r) => r.updated_at)));
          }
        }

        // ── Divisions ───────────────────────────────────────────────
        if (d.reports && d.divisions) {
          for (const dv of Object.keys(DIVISION_CONTENT) as ContentDivision[]) {
            if (d.hidden.has(`division-${dv}`)) continue;
            const page = d.divisions[dv] ?? null;
            const c = DIVISION_CONTENT[dv];
            const divReports = reports.filter((r) => r.division === dv).slice(0, 9);
            const flagship = (page?.flagship_ids ?? []).map((id) => reports.find((r) => r.id === id)).filter((r): r is PublicReport => !!r && r.division === dv);
            emit(`divisions/${dv}/index.html`, pageHtml(base, {
              path: `/divisions/${dv}`,
              title: DIVISION_META[dv]?.title ?? c.title,
              description: DIVISION_META[dv]?.description ?? c.subtitle,
              socialTitle: c.title,
              breadcrumbs: [{ name: 'About', path: '/about' }, { name: c.title, path: `/divisions/${dv}` }],
              nodes: [],
              dataKey: `division:${dv}`,
              data: {
                reports: asRows(divReports),
                page: page ? { division: dv, standards: page.standards, review: page.review, tools: page.tools, flagship_ids: page.flagship_ids } : null,
                flagship: asRows(flagship),
              },
              body: divisionBody(dv, page, flagship, divReports),
            }));
            lastmod.set(`/divisions/${dv}`, latest(page?.updated_at, ...divReports.map((r) => r.updated_at)));
          }
        }

        // ── The track record ────────────────────────────────────────
        if (d.track) {
          const meta = ROUTE_META['/track-record'];
          emit('track-record/index.html', pageHtml(base, {
            path: '/track-record',
            title: meta?.title ?? 'Track Record',
            description: meta?.description ?? '',
            breadcrumbs: [{ name: 'About', path: '/about' }, { name: 'Track Record', path: '/track-record' }],
            nodes: [],
            dataKey: 'track-record',
            data: d.track,
            body: trackRecordBody(d.track),
          }));
          lastmod.set('/track-record', day(d.track.last_updated));
        }

        // ── The sitemap: every page, with its real last change ──────
        try {
          const xml = readFileSync(path.join(env.root, 'public/sitemap.xml'), 'utf8');
          const entries = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>\s*<changefreq>([^<]*)<\/changefreq>\s*<priority>([^<]*)<\/priority>\s*<\/url>/g)]
            .map((m) => ({ loc: m[1], lastmod: m[2], changefreq: m[3], priority: m[4] }));
          if (entries.length >= 15) {
            const pathOf = (loc: string) => loc.replace(SITE_URL, '') || '/';
            const seen = new Set(entries.map((e) => pathOf(e.loc)));
            for (const e of entries) {
              const lm = lastmod.get(pathOf(e.loc));
              if (lm) e.lastmod = lm;
            }
            if (!seen.has('/track-record') && lastmod.has('/track-record')) {
              entries.push({ loc: absoluteUrl('/track-record'), lastmod: lastmod.get('/track-record')!, changefreq: 'weekly', priority: '0.8' });
            }
            if (d.reports && !archiveHidden) {
              for (const r of reports) {
                entries.push({ loc: absoluteUrl(reportPath(r.slug)), lastmod: lastmod.get(reportPath(r.slug)) ?? r.date, changefreq: 'yearly', priority: '0.6' });
              }
            }
            const body = entries.map((e) => `  <url>\n    <loc>${esc(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join('\n');
            emit('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Written by the build (vite.static-pages.ts) from public/sitemap.xml and the\n  published records: every report's page, and each page's real last change.\n-->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
          }
        } catch {
          // public/sitemap.xml stays as it is.
        }

        // When the build ran, and what each page could be written from.
        emit('static-pages.json', `${JSON.stringify({
          built_at: builtAt,
          reports: d.reports && !archiveHidden ? reports.length : 0,
          funds: d.funds ? RECORD_FUNDS.filter((f) => !d.hidden.has(`fund-${f}`)).length : 0,
          divisions: d.reports && d.divisions ? Object.keys(DIVISION_CONTENT).filter((x) => !d.hidden.has(`division-${x}`)).length : 0,
          track_record: !!d.track,
          hidden: [...d.hidden],
        }, null, 2)}\n`);
      },
    },
  };
}
