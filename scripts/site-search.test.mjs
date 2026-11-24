// =====================================================================
// THE WEBSITE'S SEARCH (Step 107).
// ---------------------------------------------------------------------
// The engine reads a query as a reader expects (accents, typing, typos,
// short forms), ranks what matters first and stays fast; the documents
// show nothing the pages do not; an alumnus is found only through the
// reports that carry their name, never with an employer, a city or a
// profile; and the search costs the first screen nothing.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const load = async (rel, name) => {
  const { build } = require('esbuild');
  const outDir = join(ROOT, 'node_modules', '.cache', 'site-search-test');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.mjs`);
  await build({ entryPoints: [join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', alias: { '@': join(ROOT, 'src') } });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const E = await load('src/lib/site-search.ts', 'engine');
const D = await load('src/lib/site-search-data.ts', 'data');

const report = (id, title, extra = {}) => ({
  id, slug: id, title, description: extra.description ?? null, date: extra.date ?? '2025-05-01', division: extra.division ?? 'equity',
  fund: extra.fund ?? null, report_type: extra.type ?? 'equity_report', tags: [], page_count: 10, file_url: '', updated_at: null,
  authors: extra.authors ?? [],
});
const SOURCES = {
  reports: [
    report('nvda', 'NVIDIA Corp - Equity Research', { authors: [{ name: 'Maria Rossi', role: 'Analyst', link: '/people/members?person=m1' }, { name: 'Luca Bianchi', role: 'Analyst', link: '/people/alumni?person=a1' }] }),
    report('ls-25', 'Long Short Equity Fund - May 2025', { division: 'portfolio', fund: 'long-short', type: 'fund_update', authors: [{ name: 'Luca Bianchi', role: 'Portfolio Analyst', link: '/people/alumni?person=a1' }] }),
    report('macro', 'Global Macroeconomic Outlook', { division: 'macro', type: 'macro_report', date: '2023-12-01', description: 'Inflation in the eurozone eased while the ECB kept its deposit rate unchanged through the summer.', authors: [{ name: 'Jürgen Müller', role: 'Analyst', link: '/archive?author=J%C3%BCrgen%20M%C3%BCller' }] }),
    report('ma', 'M&A Deals Update - Intesa San Paolo & UBI Banca', { authors: [] }),
    report('mkt', 'Market Update: US-China Trade War', { authors: [] }),
  ],
  members: [{ id: 'm1', name: 'Maria', surname: 'Rossi', position: 'Analyst', division: 'equity', fund: null, is_board: false }],
  events: [{ id: 'e1', title: 'Inside Private Banking', date: '2026-11-18', place: 'Aula Zappa', moderator: null, guest: ['Anna Verdi, Managing Director, Goldman Sachs'], description: 'Three practitioners discuss the profession.', event_type: 'guest', is_past: true, registration_enabled: false }],
  readings: [{ id: 'r1', title: 'Efficient Capital Markets', author: 'Eugene Fama', description: '', publication_year: 1970, contributor_name: 'Maria', contributor_surname: 'Rossi' }],
  hidden: new Set(),
  eventType: (t) => (t === 'guest' ? 'Guest session' : 'Other'),
  now: Date.parse('2026-11-24T12:00:00Z'),
};
const docs = D.buildSiteDocs(SOURCES);
const index = E.buildIndex(docs);
const top = (q) => E.search(index, q).hits[0]?.doc;
const titles = (q) => E.search(index, q).hits.map((h) => h.doc.title);

test('a query is read as a reader expects', () => {
  assert.equal(E.fold('Société Générale'), 'societe generale');
  assert.equal(E.fold('M&A and L/S'), 'ma and ls');
  assert.equal(top('nvidia').href, '/archive/nvda');
  assert.equal(top('NVIDIA corp equity').href, '/archive/nvda', 'every word, in any field');
  assert.equal(top('nvi').href, '/archive/nvda', 'the last word as it is being typed');
  assert.equal(top('nvidai').href, '/archive/nvda', 'one mistake');
  assert.equal(top('macroeconomik outlok').href, '/archive/macro', 'a mistake in each of two words');
  assert.equal(top('jurgen').title, 'Jürgen Müller', 'no accents needed');
  assert.equal(top('long short').href, '/funds/long-short', 'the fund page before its reports');
  assert.ok(titles('ls').includes('Long Short Equity Fund - May 2025'), 'a short form');
  assert.deepEqual(titles('m&a'), ['M&A Deals Update - Intesa San Paolo & UBI Banca'], '"M&A" is found as it is, not as every word that starts with "ma"');
  assert.ok(titles('2023').includes('Global Macroeconomic Outlook'), 'a year');
  assert.equal(top('privacy').href, '/privacy-policy');
  assert.equal(top('apply').href !== undefined, true);
  assert.equal(top('contact email').href, '/contacts');
  assert.equal(E.search(index, 'the of and').hits.length >= 0, true, 'only small words is still a query');
});

test('the body is searched and quoted where the title does not show why', () => {
  const r = E.search(index, 'deposit rate');
  assert.equal(r.hits[0].doc.href, '/archive/macro');
  assert.match(r.hits[0].snippet, /deposit rate/);
  const ranges = E.highlightRanges('Global Macroeconomic Outlook', ['macro']);
  assert.deepEqual(ranges, [[7, 12]]);
});

test('nothing found says so, and offers the nearest words the site uses', () => {
  const none = E.search(index, 'xyzzyq');
  assert.equal(none.hits.length, 0);
  const typo = E.search(index, 'privatte bankingg sessionx');
  assert.ok(typo.partial || typo.hits.length > 0);
  const sugg = E.search(index, 'qqqq macroeconomic');
  assert.ok(sugg.partial);
});

test('fast enough for every key press', () => {
  const many = [];
  for (let i = 0; i < 900; i++) many.push({ id: `d${i}`, kind: 'report', title: `Report ${i} on equity markets and macro trends`, href: `/archive/d${i}`, fields: [{ text: `Report ${i} on equity markets and macro trends in Europe`, weight: 3 }, { text: 'Analyst Name Surname Another Person', weight: 2 }, { text: 'A long description of the report with many words about inflation rates growth and the outlook for the year ahead '.repeat(3), weight: 0.6 }] });
  const big = E.buildIndex(many);
  const t0 = performance.now();
  for (const q of ['equ', 'equity mark', 'macroo trnds', 'inflation outlook 2025', 'surname']) E.search(big, q);
  const per = (performance.now() - t0) / 5;
  assert.ok(per < 120, `a query took ${per.toFixed(1)} ms over 900 documents`);
});

test('a current member is found as the Members page lists them', () => {
  const m = docs.find((d) => d.id === 'member:m1');
  assert.equal(m.title, 'Maria Rossi');
  assert.equal(m.href, '/people/members?person=m1');
  assert.equal(m.meta, 'Analyst, Equity Research');
  assert.ok(!docs.some((d) => d.id.startsWith('contributor:') && d.title === 'Maria Rossi'), 'once, as a member');
});

test('anybody else, alumni included, is found only through their reports', () => {
  const c = docs.find((d) => d.kind === 'person' && d.title === 'Luca Bianchi');
  assert.equal(c.href, '/archive?author=Luca%20Bianchi', 'to the reports that carry the name');
  assert.equal(c.meta, 'Contributor to 2 reports, 2025 · Equity Research, Portfolio Management');
  assert.doesNotMatch(c.href, /people\/alumni/, 'never to the alumni directory');
  const src = read('src/lib/site-search-data.ts') + read('src/components/search/SiteSearch.tsx') + read('src/components/search/site-search-sources.ts');
  assert.doesNotMatch(src, /from\('alumni'\)|public_alumni_directory|alumni_pending/, 'the alumni directory is not read');
  const selects = [...src.matchAll(/\.select\('([^']*)'\)/g)].map((m) => m[1]);
  assert.equal(selects.length, 3, 'members, events, readings');
  for (const cols of selects) assert.doesNotMatch(cols, /company|city|linkedin|photo|email|phone/, `no employer, city, profile or contact read: ${cols}`);
  const ev = docs.find((d) => d.id === 'event:e1');
  assert.doesNotMatch(`${ev.meta} ${ev.body}`, /Goldman/, 'a guest line is searched but not quoted');
  assert.equal(top('goldman').id, 'event:e1', 'the event is still found by its guest');
});

test('a page hidden from the website is left out, with what lives on it', () => {
  const hidden = D.buildSiteDocs({ ...SOURCES, hidden: new Set(['archive', 'team', 'events', 'readings', 'division-equity', 'fund-pir', 'contacts']) });
  assert.ok(!hidden.some((d) => d.kind === 'report' || d.kind === 'event' || d.kind === 'reading'));
  assert.ok(!hidden.some((d) => d.kind === 'person'), 'no members, and no contributors without the archive');
  for (const p of ['/archive', '/people/members', '/events', '/readings', '/divisions/equity', '/funds/pir', '/contacts']) {
    assert.ok(!hidden.some((d) => d.href === p), `${p} is hidden`);
  }
  assert.ok(hidden.some((d) => d.href === '/join'));
});

test('a past event opens the Events page filtered to it, an open one its registration', () => {
  const ev = docs.find((d) => d.id === 'event:e1');
  assert.equal(ev.href, '/events?q=Inside%20Private%20Banking');
  const open = D.buildSiteDocs({ ...SOURCES, events: [{ ...SOURCES.events[0], id: 'e2', date: '2026-12-10', is_past: false, registration_enabled: true }] }).find((d) => d.id === 'event:e2');
  assert.equal(open.href, '/events/e2/register');
  const page = read('src/pages/Events.tsx');
  assert.match(page, /const qParam = \(searchParams\.get\("q"\) \?\? ""\)\.slice\(0, 200\);/);
  assert.match(page, /<section id="past-events" className="scroll-mt-\[112px\]/);
});

test('the header offers it everywhere on the website, and the first screen pays nothing for it', () => {
  const h = read('src/components/layout/Header.tsx');
  assert.match(h, /const loadSiteSearch = \(\) => import\("@\/components\/search\/SiteSearch"\);/);
  assert.doesNotMatch(h, /^import .*SiteSearch/m, 'never imported up front');
  assert.match(h, /\{searchUsed && \(\s*<Suspense fallback=\{null\}>\s*<SiteSearch open=\{searchOpen\} onOpenChange=\{setSearchOpen\} \/>/);
  assert.equal((h.match(/aria-label="Search the website"/g) || []).length, 2, 'a magnifier on a computer and on a phone');
  assert.match(h, />\s*Search the website\s*<\/button>/, 'and a row at the top of the phone menu');
  assert.match(h, /if \(path\.startsWith\(WORKSPACE_BASE\) \|\| path\.startsWith\(LEGACY_WORKSPACE_BASE\)\) return;/, 'the workspace keeps its own search');
  const ui = read('src/components/search/SiteSearch.tsx');
  assert.match(ui, /role="combobox"/);
  assert.match(ui, /aria-activedescendant=\{activeId\}/);
  assert.match(ui, /role="listbox"/);
  assert.match(ui, /try \{ localStorage\.setItem\(RECENT_KEY/, 'the recent searches never break the page');
  assert.match(h, /import\("@\/components\/search\/site-search-sources"\)/, 'the reads, also only when reached for');
  for (const f of ['src/lib/site-search.ts', 'src/lib/site-search-data.ts', 'src/components/search/SiteSearch.tsx', 'src/components/search/site-search-sources.ts']) {
    assert.ok(!read(f).includes('\u2014'), `${f}: no em dash`);
  }
});
