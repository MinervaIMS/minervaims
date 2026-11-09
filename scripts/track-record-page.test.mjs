// =====================================================================
// MINERVA'S TRACK RECORD, ONE PAGE (Step 105).
// ---------------------------------------------------------------------
// /numbers and /track-record are one page, "Minerva's Track Record", at
// /track-record: by topic, with the legal pages' index, every figure
// numbered and defined once in the notes at its foot, the introduction
// saying once when the figures are true, and every past semester's
// members and alumni. Its structure is one file
// (src/lib/track-record-page.ts) that the page and its static copy for
// machines both build from. This test fails if any of that comes undone.
//
//   node --test scripts/track-record-page.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'track-record-page-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const fig = (label, value, extra = {}) => ({
  label, value, format: 'integer', decimals: 0, prefix: '', suffix: '', kind: 'count',
  definition: `${label}: the definition.`, as_of: '2026-10-30', period: null, ...extra,
});
const SNAP = {
  computed_at: '2026-10-30T03:00:00Z',
  pages: {
    'numbers-people': ['active_members', 'alumni', 'missing_slug'],
    'numbers-reports': ['reports_published', 'funds_run', 'readings'],
    'numbers-events': ['events_held', 'joined'],
  },
  numbers: {
    active_members: fig('Active members', 64),
    alumni: fig('Alumni', 166),
    reports_published: fig('Research reports published', 213),
    readings: fig('Readings recommended', 48, { as_of: '2026-10-24' }),
    funds_run: fig('Funds run since 2017', 4),
    events_held: fig('Events held', 120),
    joined: fig('Members who joined', 30, { period: 'Fall 2026' }),
  },
};

test('one page at one address, reached the same ways as before', () => {
  const app = read('src/App.tsx');
  assert.match(app, /<Route path="\/numbers" element=\{<RouteRedirect to="\/track-record" \/>\} \/>/, '/numbers sends to the merged page');
  assert.match(app, /<Route path="\/track-record" element=\{<Suspense fallback=\{<PageLoader \/>\}><TrackRecord \/><\/Suspense>\} \/>/);
  assert.doesNotMatch(app, /import\("\.\/pages\/Numbers"\)/);
  assert.ok(!existsSync(join(ROOT, 'src/pages/Numbers.tsx')), 'the old page is gone');
  assert.match(read('src/components/layout/Header.tsx'), /const HERO_ROUTES_EXACT = new Set\(\[[^\]]*"\/track-record"[^\]]*\]\);/, 'a clear navigation bar over the hero');
  for (const p of ['src/components/layout/Footer.tsx', 'src/pages/Sitemap.tsx']) {
    const s = read(p);
    assert.match(s, /\{ label: "Minerva's Track Record", href: '\/track-record' \}/, p);
    assert.doesNotMatch(s, /'\/numbers'/, p);
  }
  const routes = read('src/lib/seo/routes.ts');
  assert.doesNotMatch(routes, /'\/numbers':/);
  assert.match(routes, /'\/track-record': \{\s*title: "Minerva's Track Record",/);
  assert.match(read('src/components/numbers/NumbersSection.tsx'), /<Link to="\/track-record"[^>]*>Minerva&apos;s Track Record<\/Link>/);
  const xml = read('public/sitemap.xml');
  assert.ok(!xml.includes('minervaims.org/numbers<'), 'the sitemap no longer lists /numbers');
  assert.ok(xml.includes('<loc>https://minervaims.org/track-record</loc>'));
  assert.ok(!read('public/llms.txt').includes('minervaims.org/numbers'));
  assert.match(read('vite.key-numbers.ts'), /url: 'https:\/\/minervaims\.org\/track-record',/);
  assert.match(read('src/lib/static/render.ts'), /const nav = \[\['\/about', 'About'\], \['\/archive', 'Archive'\], \['\/track-record', 'Track Record'\], \['\/events', 'Events'\], \['\/join', 'Join'\]\]/);
});

test('the words the page was asked to say', async () => {
  const t = await load('src/lib/track-record-page.ts', 'page');
  assert.equal(t.TRACK_PAGE_TITLE, "Minerva's Track Record");
  assert.equal(t.TRACK_INTRO_HEADING, 'Our Achievements, quantified');
  assert.equal(t.trackIntroText('30 October 2026'),
    "Numbers and statistics on this page are computed on a daily basis from Minerva's own records. Figures as of 30 October 2026.");
  assert.deepEqual(t.TRACK_INDEX.map((s) => s.id), ['overview', 'people', 'research', 'funds', 'events', 'notes']);
  assert.ok(!t.TRACK_FUNDS_STATEMENT.includes('(paper)'));
  for (const topic of t.TRACK_TOPICS) assert.ok(topic.link.href.startsWith('/') && topic.link.label, `${topic.id}: one button to another page`);
  const page = read('src/pages/TrackRecord.tsx');
  assert.doesNotMatch(page, /The track record in numbers|NumbersSection|The society, counted/);
  assert.doesNotMatch(page, /Figure as of/, 'no date under each figure');
});

test('every figure numbered once, in the order shown, and defined once in the notes', async () => {
  const t = await load('src/lib/track-record-page.ts', 'page');
  const f = t.trackFigures(SNAP);
  assert.deepEqual(f.people.map((x) => [x.slug, x.note]), [['active_members', 1], ['alumni', 2]], 'a slug with no figure is left out');
  assert.deepEqual(f.research.map((x) => [x.slug, x.note]), [['reports_published', 3], ['readings', 4]], 'research without the funds');
  assert.deepEqual(f.funds.map((x) => [x.slug, x.note]), [['funds_run', 5]]);
  assert.deepEqual(f.events.map((x) => [x.slug, x.note]), [['events_held', 6], ['joined', 7]]);
  assert.deepEqual(t.allTrackFigures(f).map((x) => x.note), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(t.trackAsOf(f), '2026-10-30');
  const asOf = t.trackAsOf(f);
  assert.equal(t.trackNoteText(SNAP.numbers.alumni, asOf), 'Alumni: the definition.', 'the page date is not repeated');
  assert.equal(t.trackNoteText(SNAP.numbers.readings, asOf), 'Readings recommended: the definition. Figure as of 24 October 2026.', 'another date says so');
  assert.equal(t.trackNoteText(SNAP.numbers.joined, asOf), 'Members who joined: the definition. Figure for the Fall 2026 round.');
  assert.deepEqual(t.trackFigures(null), { people: [], research: [], funds: [], events: [] });
  const ds = t.trackDatasetJsonLd(t.allTrackFigures(f), asOf);
  assert.equal(ds['@type'], 'Dataset');
  assert.ok(Array.isArray(ds.distribution) && ds.distribution[0].contentUrl.endsWith('/data/key-numbers.json'));
  assert.equal(ds.variableMeasured.length, 7);
});

test('the page: the legal index, the superscripts, the exact figures and the semesters', () => {
  const page = read('src/pages/TrackRecord.tsx');
  assert.match(page, /<div className="legal-doc">\s*<PageIndex sections=\{TRACK_INDEX\}>/);
  assert.match(page, /<ApplyBackground \/>/, 'the dark dot field of /numbers');
  assert.match(page, /import heroLogo from '@\/assets\/footer-logo\.svg';/, 'the full white logo on the right of the title');
  assert.match(page, /<sup[^>]*>\s*<a href=\{`#note-\$\{f\.note\}`\} id=\{`ref-\$\{f\.note\}`\}/);
  assert.match(page, /<li key=\{f\.slug\} id=\{`note-\$\{f\.note\}`\}/);
  assert.match(page, /<KeyFigureValue figure=\{f\} \/>/, 'the exact figure, not the band\'s rounded one');
  assert.match(page, /semesters\.map\(\(s\) => \(/);
  const index = read('src/components/shared/PageIndex.tsx');
  for (const piece of ['className="lp-body"', 'className="lp-toc"', 'In this page', 'className="lp-toc-collapse"', 'Reading progress']) assert.ok(index.includes(piece), piece);
});

test('the static copy for machines says what the page says', async () => {
  const r = await load('src/lib/static/render.ts', 'render');
  const t = await load('src/lib/track-record-page.ts', 'page');
  const data = {
    research: [{ year: 2025, division: 'equity', reports: 3, pages: 40, pages_known: 3 }],
    funds: {}, events: [{ year: 2025, events: 10, with_guests: 6, speakers: 8, alumni_calls: 2, company_visits: 1 }],
    semesters: [{ key: '2025-fall', label: 'Fall 2025', members: 90, alumni: 230 }, { key: '2026-spring', label: 'Spring 2026', members: 91, alumni: 257 }],
    alumni_areas: [{ area: 'Hedge Fund', alumni: 9 }], alumni_without_area: 2, company_visits_before_archive: 0, last_updated: '2026-10-30',
  };
  const html = r.trackRecordBody(data, SNAP);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  assert.ok(text.includes("Minerva's Track Record"));
  assert.ok(text.includes(t.trackIntroText('30 October 2026')));
  assert.equal((html.match(/id="ref-\d+"/g) || []).length, 7, 'one superscript per figure');
  assert.equal((html.match(/id="note-\d+"/g) || []).length, 7, 'one note per figure');
  assert.ok(text.includes('Fall 2025 90 230') && text.includes('Spring 2026 91 257'), 'every past semester');
  for (const s of t.TRACK_INDEX) assert.ok(html.includes(`href="#${s.id}"`) && html.includes(`id="${s.id}"`), `index entry ${s.id}`);
  assert.doesNotMatch(html, /\/numbers"|Figure as of 30 October/);
  const vite = read('vite.static-pages.ts');
  assert.match(vite, /const snap = embeddedKeyNumbers\(base\);/, 'the figures the app itself embeds');
  assert.match(vite, /body: trackRecordBody\(d\.track, snap\),/);
});

test('the wording asked for is changed in the registry, with the old words kept', () => {
  const sql = read('supabase/migrations/20261109090600_track_record_one_page.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.key_number_wording_backup/);
  assert.match(sql, /ON CONFLICT \(slug, reason\) DO NOTHING;/, 'a second run keeps the first backup');
  assert.ok(sql.indexOf('INSERT INTO public.key_number_wording_backup') < sql.indexOf('UPDATE public.key_numbers'), 'backed up before it is changed');
  assert.match(sql, /replace\(definition_template, ' Internal meetings and recruitment stands are not counted\.', ''\)/);
  assert.match(sql, /replace\(definition_template, 'virtual \(paper\) portfolios', 'virtual portfolios'\)/);
  assert.match(sql, /WHERE r\.o < public\.semester_ordinal\(public\.current_semester_key\(\)\)/, 'every past semester, the current one in the figures');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.public_track_record\(\) TO anon, authenticated;/);
});
