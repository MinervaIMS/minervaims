// =====================================================================
// The static pages a build writes (Step 93), checked as a crawler reads
// them: without running any JavaScript.
//
//   DIST=dist node --test scripts/static-pages.test.mjs
//
// Skipped when there is no build. For every report: one page, its title
// in <title> and <h1>, its permanent address as canonical, its citation,
// valid structured data, its place in the sitemap and in llms-full.txt.
// For the funds and the track record: the same figures in the HTML as in
// the data the app reads, and valid Dataset nodes. Everywhere: no em dash,
// no text hidden for machines only.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const DIST = process.env.DIST ? (process.env.DIST.startsWith('/') ? process.env.DIST : join(ROOT, process.env.DIST)) : join(ROOT, 'dist');
const SITE = 'https://minervaims.org';
// A build that could not read the database writes no pages (the app then
// reads everything live), and there is nothing here to check.
const built = existsSync(join(DIST, 'static-pages.json')) ? JSON.parse(readFileSync(join(DIST, 'static-pages.json'), 'utf8')) : null;
const have = Boolean(built && built.reports > 0 && built.track_record);
const skip = !have && (built ? `the build at ${DIST} could not read the database, so it wrote no pages` : `no build with static pages at ${DIST}`);
const read = (p) => readFileSync(join(DIST, p), 'utf8');

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const staticBlock = (html) => {
  const at = html.indexOf('<div id="mims-static"');
  const end = html.indexOf('<div id="root">');
  assert.ok(at > 0 && end > at, 'a static block before the app root');
  return html.slice(at, end);
};
const pageData = (html) => JSON.parse(/<script type="application\/json" id="mims-page-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const jsonLd = (html) => JSON.parse(/<script type="application\/ld\+json" data-rh="true">([\s\S]*?)<\/script>/.exec(html)[1]);
const head = (html, re) => (re.exec(html) || [])[1];

/** schema.org rules that matter for the search features in play. */
function validateNode(n, where) {
  const t = n['@type'];
  assert.ok(t, `${where}: a node without @type`);
  if (t === 'BreadcrumbList') {
    n.itemListElement.forEach((li, i) => {
      assert.equal(li['@type'], 'ListItem', `${where}: crumb type`);
      assert.equal(li.position, i + 1, `${where}: crumb position`);
      assert.ok(li.name && /^https:\/\//.test(li.item), `${where}: crumb name and absolute item`);
    });
  } else if (t === 'Report' || t === 'ScholarlyArticle') {
    assert.ok(n.headline && n.headline.length <= 110, `${where}: headline present, at most 110 characters`);
    assert.match(n.datePublished, /^\d{4}-\d{2}-\d{2}$/, `${where}: datePublished`);
    if (n.dateModified) assert.match(n.dateModified, /^\d{4}-\d{2}-\d{2}$/, `${where}: dateModified`);
    const authors = Array.isArray(n.author) ? n.author : [n.author];
    assert.ok(authors.length && authors.every((a) => a.name || a['@id']), `${where}: every author named or referenced`);
    assert.ok(authors.every((a) => !a.url || /^https:\/\//.test(a.url)), `${where}: author urls absolute`);
    assert.equal(n.publisher?.['@id'], `${SITE}/#organization`, `${where}: publisher is the society`);
    assert.ok(/^https:\/\//.test(n.url) && n.mainEntityOfPage === n.url, `${where}: url and mainEntityOfPage`);
    assert.equal(n.encoding?.encodingFormat, 'application/pdf', `${where}: the PDF as encoding`);
    assert.ok(/^https?:\/\//.test(n.encoding?.contentUrl || ''), `${where}: the PDF address`);
    assert.ok(n.image, `${where}: an image`);
  } else if (t === 'Dataset') {
    assert.ok(n.name, `${where}: dataset name`);
    assert.ok(n.description.length >= 50 && n.description.length <= 5000, `${where}: dataset description length`);
    assert.ok(Array.isArray(n.distribution) && n.distribution.every((d) => d['@type'] === 'DataDownload' && d.encodingFormat && /^https:\/\//.test(d.contentUrl)), `${where}: downloads`);
    if (n.temporalCoverage) assert.match(n.temporalCoverage, /^\d{4}-\d{2}\/\d{4}-\d{2}$/, `${where}: temporal coverage`);
  } else if (t === 'ItemList') {
    n.itemListElement.forEach((li, i) => assert.equal(li.position, i + 1, `${where}: list position`));
  }
}

let reportDirs = [];
if (have) reportDirs = readdirSync(join(DIST, 'archive'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

test('every published report has its own page, readable without JavaScript', { skip }, () => {
  const meta = JSON.parse(read('static-pages.json'));
  assert.equal(reportDirs.length, meta.reports, 'one folder per report');
  for (const slug of reportDirs) {
    const html = read(`archive/${slug}/index.html`);
    const data = pageData(html);
    assert.equal(data.key, `report:${slug}`, `${slug}: page data key`);
    const r = data.data.report;
    assert.equal(r.slug, slug, `${slug}: slug`);
    const block = staticBlock(html);
    const h1 = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(block)[1]);
    assert.equal(h1, r.title.replace(/\s+/g, ' ').trim(), `${slug}: h1 is the title`);
    assert.ok(decode(head(html, /<title>([^<]*)<\/title>/)).startsWith(r.title.trim()), `${slug}: <title> starts with the title`);
    assert.equal(head(html, /<link data-rh="true" rel="canonical" href="([^"]+)"/), `${SITE}/archive/${slug}`, `${slug}: canonical`);
    assert.equal(head(html, /<meta data-rh="true" property="og:url" content="([^"]+)"/), `${SITE}/archive/${slug}`, `${slug}: og:url`);
    const body = text(block);
    assert.ok(body.includes(`Minerva Investment Management Society (${r.date.slice(0, 4)}).`) && body.includes(`${SITE}/archive/${slug}`), `${slug}: citation`);
    for (const a of r.authors) assert.ok(body.includes(a.name), `${slug}: author ${a.name}`);
    const ld = jsonLd(html);
    assert.equal(ld['@context'], 'https://schema.org');
    ld['@graph'].forEach((n, i) => validateNode(n, `${slug} node ${i}`));
    const main = ld['@graph'].find((n) => n['@type'] === 'Report' || n['@type'] === 'ScholarlyArticle');
    assert.equal(main['@type'], r.report_type === 'quant_paper' ? 'ScholarlyArticle' : 'Report', `${slug}: type follows the report type`);
    assert.equal(main.name, r.title, `${slug}: structured name is the title`);
    assert.ok(!html.includes('<noscript>'), `${slug}: no text kept for machines only`);
  }
});

test('llms-full.txt lists every report, with its address and citation', { skip }, () => {
  const llms = read('llms-full.txt');
  for (const slug of reportDirs) {
    const r = pageData(read(`archive/${slug}/index.html`)).data.report;
    assert.ok(llms.includes(`- Address: ${SITE}/archive/${slug}\n`), `${slug}: address in llms-full.txt`);
    assert.ok(llms.includes(`## ${r.title}\n`), `${slug}: title in llms-full.txt`);
  }
  assert.equal((llms.match(/^- Address: /gm) || []).length, reportDirs.length, 'one entry per report, no more');
});

test('the sitemap holds every report with its last change', { skip }, () => {
  const xml = read('sitemap.xml');
  for (const slug of reportDirs) {
    assert.match(xml, new RegExp(`<loc>${SITE}/archive/${slug}</loc>\\s*<lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod>`), `${slug}: in the sitemap`);
  }
  assert.ok(xml.includes(`<loc>${SITE}/track-record</loc>`), 'the track record in the sitemap');
});

test('old "/archive?fileId=" links are sent to the report page', { skip }, () => {
  const html = read('archive/index.html');
  const script = /<script>(\(function\(\)\{try\{var m=\/\[\?&\]fileId[\s\S]*?)<\/script>/.exec(html);
  assert.ok(script, 'the redirect script is in the archive page');
  for (const slug of reportDirs) {
    const id = pageData(read(`archive/${slug}/index.html`)).data.report.id.toLowerCase();
    assert.ok(script[1].includes(`"${id}":"${slug}"`), `${slug}: its id redirects to it`);
  }
  // Run it, as a browser would, against one id.
  const [slug] = reportDirs;
  const id = pageData(read(`archive/${slug}/index.html`)).data.report.id;
  let went = null;
  const location = { search: `?fileId=${id.toUpperCase()}`, replace: (u) => { went = u; } };
  new Function('location', script[1])(location);
  assert.equal(went, `/archive/${slug}`);
});

test('fund pages: the HTML shows the figures the app reads, with valid datasets', { skip }, () => {
  const funds = JSON.parse(read('data/funds.json'));
  for (const fund of ['long-short', 'multi-asset', 'dps', 'pir']) {
    if (!existsSync(join(DIST, `funds/${fund}/index.html`))) continue;
    const html = read(`funds/${fund}/index.html`);
    const data = pageData(html);
    assert.equal(data.key, `fund:${fund}`);
    const rec = funds.funds[fund].record;
    const ld = jsonLd(html);
    ld['@graph'].forEach((n, i) => validateNode(n, `${fund} node ${i}`));
    if (!rec) {
      assert.ok(!ld['@graph'].some((n) => n['@type'] === 'Dataset'), `${fund}: no dataset without a record`);
      continue;
    }
    assert.deepEqual(rec, data.data.entry.record, `${fund}: funds.json and the page data agree`);
    const body = text(staticBlock(html));
    assert.ok(body.includes('Virtual (paper) portfolio managed by students for educational purposes. No real capital is invested. Returns are simulated, net and in EUR.'), `${fund}: the statement`);
    const itd = `${rec.itd < 0 ? '-' : ''}${Math.abs(rec.itd).toFixed(1)}%`;
    assert.ok(body.includes(itd), `${fund}: cumulative return ${itd} in the HTML`);
    assert.ok(ld['@graph'].some((n) => n['@type'] === 'Dataset'), `${fund}: a Dataset node`);
    const csv = read(`data/funds-${fund}.csv`).trim().split('\n');
    assert.equal(csv.length - 1, rec.months_count, `${fund}: one CSV line per month`);
  }
});

test('the track record page carries its data and its tables', { skip }, () => {
  const html = read('track-record/index.html');
  const data = pageData(html).data;
  const body = text(staticBlock(html));
  const total = data.research.reduce((a, r) => a + r.reports, 0);
  assert.ok(new RegExp(`Total( \\d+){5} ${total}`).test(body), `the research total ${total} in the table`);
  assert.ok(!/(best|leading|top|premier|world-class|unrivalled)/i.test(body.replace(/Best month/g, '')), 'no superlatives');
  jsonLd(html)['@graph'].forEach((n, i) => validateNode(n, `track node ${i}`));
});

// The society's own wording carries no em dash. What members typed (a
// title, a summary, a name) is shown exactly as typed, so it is taken out
// before the search: every string in the pages' own data.
test('no em dash in the wording of any static page or text file', { skip }, () => {
  const files = ['llms-full.txt', 'archive/index.html', 'track-record/index.html', ...reportDirs.map((s) => `archive/${s}/index.html`)];
  const typed = new Set();
  const collect = (v) => {
    if (typeof v === 'string') { const s = v.replace(/\s+/g, ' ').trim(); if (s.includes('\u2014')) typed.add(s); }
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  for (const f of files.filter((f) => f.endsWith('.html'))) collect(pageData(read(f)).data);
  const longestFirst = [...typed].sort((a, b) => b.length - a.length);
  for (const f of files) {
    const raw = read(f);
    let t = (raw.includes('<div id="mims-static"') ? text(staticBlock(raw)) : raw).replace(/\s+/g, ' ');
    for (const s of longestFirst) t = t.split(s).join(' ');
    assert.ok(!t.includes('\u2014'), `${f}: em dash in "${t.slice(Math.max(0, t.indexOf('\u2014') - 60), t.indexOf('\u2014') + 60)}"`);
  }
});
