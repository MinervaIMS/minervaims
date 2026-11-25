// =====================================================================
// A SHARED LINK SHOWS ITS OWN PAGE, AND WHOSE IT IS (Step 109).
// ---------------------------------------------------------------------
//   node --test scripts/share-previews.test.mjs
//   DIST=dist node --test scripts/share-previews.test.mjs   (also the build)
//   MIMS_PG=<psql connection> ...                           (also the database)
//
// WhatsApp, LinkedIn, iMessage, Telegram, Slack, Teams, Facebook and X read
// a link's card from the HTML the server sends, without running scripts.
// These checks keep every public address's card its own (its title, its
// line, its picture), keep the Society's name on every one, and keep the
// card the build writes identical to the one the app writes.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * A migration by its name, wherever the project keeps it: as delivered
 * (supabase/migrations/<time>_<name>.sql) or as Lovable applies it
 * (drizzle/migrations/<nnnn>_<step>_<name>.sql, since Step 108).
 */
const migrationPath = (name) => {
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    let files = [];
    try { files = readdirSync(join(ROOT, dir)); } catch { continue; }
    const f = files.find((x) => x.endsWith(`_${name}.sql`));
    if (f) return `${dir}/${f}`;
  }
  throw new Error(`migration ${name} not found`);
};
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const require = createRequire(import.meta.url);
const load = async (rel, name) => {
  const { build } = require('esbuild');
  const outDir = join(ROOT, 'node_modules', '.cache', 'share-previews-test');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent',
    alias: { '@': join(ROOT, 'src') }, external: ['react', 'lucide-react'], define: { 'import.meta.env': '{}' },
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const CARDS = await load('src/lib/seo/share-cards.ts', 'share-cards');
const HEAD = await load('src/lib/seo/head-tags.ts', 'head-tags');
const ROUTES = await load('src/lib/seo/routes.ts', 'routes');
const EVENTS = await load('src/lib/event-share.ts', 'event-share');
const FORMS = await load('src/lib/form-share.ts', 'form-share');
const NAV = await load('src/lib/workspace-nav.ts', 'workspace-nav');

const DIST = process.env.DIST ? (process.env.DIST.startsWith('/') ? process.env.DIST : join(ROOT, process.env.DIST)) : join(ROOT, 'dist');
const built = existsSync(join(DIST, 'static-pages.json')) ? JSON.parse(readFileSync(join(DIST, 'static-pages.json'), 'utf8')) : null;
const noBuild = !built || built.link_previews === undefined ? `no build with link previews at ${DIST}` : false;
const PG = process.env.MIMS_PG;

/** A JPEG's size, read from its frame header. */
function jpegSize(buf) {
  assert.equal(buf.readUInt16BE(0), 0xffd8, 'a JPEG');
  let i = 2;
  while (i < buf.length) {
    const marker = buf.readUInt16BE(i);
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xffc0 && marker <= 0xffc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('no frame header');
}

const shareImageAltOf = (k) => CARDS.shareImageAlt(k);
const tagsOf = (html) => {
  const out = {};
  out.title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1] ?? null;
  for (const m of html.matchAll(/<meta(?: data-rh="true")? (name|property)="([^"]+)" content="([^"]*)"/g)) {
    if (/^(og:|twitter:|description$|robots$)/.test(m[2])) (out[m[2]] ||= []).push(m[3]);
  }
  out.canonical = [...html.matchAll(/<link data-rh="true" rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  return out;
};
const unesc = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('every card has its picture: 1200 by 630, a JPEG light enough for WhatsApp, laid out for a square crop', () => {
  const gen = read('scripts/make-share-images.mjs');
  assert.match(gen, /const SAFE = 560;/, 'everything inside the middle square');
  assert.match(gen, /if \(!fit\.inSquare\) throw new Error/, 'a card that does not fit is refused');
  assert.doesNotMatch(gen, /eyebrow|Bocconi/);
  // No coloured field: a card is a photograph, a page's moving background,
  // or its plain white or black ground.
  assert.doesNotMatch(gen, /#2C1B72|radial-gradient\(120% 95%/);
  assert.match(gen, /: white \? '#FFFFFF' : '#05030F'\}\}/);
  for (const c of CARDS.SHARE_CARDS) {
    assert.ok(c.photo || c.scene || c.ground === 'white' || c.ground === 'black', `${c.key}: a photograph, a scene or a white or black ground`);
  }
  for (const k of ['statute', 'terms-of-use', 'privacy-policy', 'cookie-policy', 'disclaimer']) assert.equal(CARDS.SHARE_CARDS.find((c) => c.key === k).ground, 'white', `${k}: white, as the page is`);
  for (const c of CARDS.SHARE_CARDS.filter((x) => x.key.startsWith('ws-') || x.key === 'workspace')) assert.equal(c.scene, 'stage', `${c.key}: the sign-in stage a workspace link opens on`);
  const files = readdirSync(join(ROOT, 'public/share')).sort();
  const keys = CARDS.SHARE_CARDS.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length, 'no card twice');
  assert.deepEqual(files, keys.map((k) => `${k}.jpg`).sort(), 'exactly one picture per card, and no other');
  for (const k of keys) {
    const buf = readFileSync(join(ROOT, 'public/share', `${k}.jpg`));
    assert.deepEqual(jpegSize(buf), { width: 1200, height: 630 }, k);
    assert.ok(buf.length < 200 * 1024, `${k}: ${Math.round(buf.length / 1024)} kB`);
  }
  for (const c of CARDS.SHARE_CARDS) {
    if (c.photo) assert.ok(existsSync(join(ROOT, 'src/assets', c.photo)), `${c.key}: its photograph is the page's own asset`);
    assert.doesNotMatch(c.title, /\u2014/, `${c.key}: no em dash`);
    assert.doesNotMatch(`${c.title} ${shareImageAltOf(c.key)}`, /Bocconi/, `${c.key}: the picture names the Society alone`);
    assert.ok(!('eyebrow' in c), `${c.key}: no line above the title`);
  }
});

test('every public page has a card of its own, and every page that uses a photograph uses its own', () => {
  const indexed = Object.entries(ROUTES.ROUTE_META).filter(([, m]) => !m.noindex).map(([p]) => p).sort();
  assert.deepEqual(Object.keys(CARDS.ROUTE_SHARE_CARD).sort(), indexed, 'the registry names every public page');
  const used = Object.values(CARDS.ROUTE_SHARE_CARD);
  assert.equal(new Set(used).size, used.length, 'no two pages share a picture');
  for (const k of used) assert.ok(CARDS.SHARE_CARDS.some((c) => c.key === k), k);
  for (const d of ['equity', 'investment', 'macro', 'portfolio', 'quant']) {
    assert.equal(CARDS.shareCardForPath(`/divisions/${d}`), `division-${d}`);
    assert.equal(CARDS.reportShareCard(d), `report-${d}`);
  }
  for (const f of ['long-short', 'multi-asset', 'dps', 'pir']) assert.equal(CARDS.shareCardForPath(`/funds/${f}`), `fund-${f}`);
  assert.equal(CARDS.reportShareCard('board'), 'report', 'an unknown division falls back to the archive');
  assert.equal(CARDS.eventShareCard('company_visit'), 'event-company-visit');
  assert.equal(CARDS.eventShareCard('meeting'), 'event');
  // The photograph on a page's card is the one the page imports.
  const imports = (file, asset) => assert.match(read(file), new RegExp(`@/assets/${asset.replace(/[.]/g, '\\.')}`), `${file} shows ${asset}`);
  const photo = (key) => CARDS.SHARE_CARDS.find((c) => c.key === key).photo;
  imports('src/pages/About.tsx', photo('about'));
  imports('src/pages/Archive.tsx', photo('archive'));
  imports('src/pages/Events.tsx', photo('events'));
  imports('src/pages/Readings.tsx', photo('readings'));
  imports('src/pages/Team.tsx', photo('members'));
  imports('src/pages/Alumni.tsx', photo('alumni'));
  imports('src/pages/Contacts.tsx', photo('contacts'));
  imports('src/pages/Partnerships.tsx', photo('partnerships'));
  imports('src/pages/DivisionFit.tsx', photo('division-fit'));
  imports('src/pages/Sitemap.tsx', photo('sitemap'));
  for (const f of ['long-short', 'multi-asset', 'dps', 'pir']) imports('src/pages/FundDetail.tsx', photo(`fund-${f}`));
  for (const d of ['equity', 'investment', 'macro', 'portfolio', 'quant']) imports('src/pages/DivisionDetail.tsx', photo(`division-${d}`));
});

test('every card says it is the Society\'s, and its title and line are the page\'s own', () => {
  const seen = new Map();
  for (const [path, meta] of Object.entries(ROUTES.ROUTE_META)) {
    if (meta.noindex) continue;
    const t = HEAD.headTags({ path, title: meta.title, description: meta.description, socialTitle: meta.socialTitle });
    const get = (k) => t.meta.find((m) => m.key === k)?.content;
    assert.match(get('og:title'), /Minerva|MIMS/, `${path}: the title names the Society`);
    // The homepage's title is the Society's full name; every other line names it.
    if (path !== '/') assert.match(get('og:description'), /Minerva/, `${path}: the line names the Society`);
    assert.equal(get('og:site_name'), 'Minerva Investment Management Society');
    assert.equal(get('og:url'), `https://minervaims.org${path === '/' ? '/' : path}`);
    assert.match(get('og:image'), /^https:\/\/minervaims\.org\/share\/[a-z0-9-]+\.jpg$/);
    assert.equal(get('og:image:width'), '1200');
    assert.equal(get('og:image:height'), '630');
    assert.equal(get('twitter:card'), 'summary_large_image');
    assert.equal(t.canonical, get('og:url'));
    assert.ok(!seen.has(get('og:description')), `${path}: its line is not ${seen.get(get('og:description'))}'s`);
    seen.set(get('og:description'), path);
    assert.doesNotMatch(JSON.stringify(t), /\u2014/, `${path}: no em dash`);
  }
  for (const [f, m] of Object.entries(ROUTES.FUND_META)) assert.match(m.description, /Minerva/, `fund ${f}`);
  for (const [d, m] of Object.entries(ROUTES.DIVISION_META)) assert.match(m.description, /Minerva/, `division ${d}`);
  // A page not to be indexed has no canonical, and says so.
  const n = HEAD.headTags({ path: '/workspace/career', title: 'Career | Workspace', description: 'x', noindex: true });
  assert.equal(n.canonical, null);
  assert.equal(n.robots, 'noindex, nofollow');
});

test('the homepage\'s own HTML carries the very tags the app writes there', () => {
  const html = read('index.html');
  const meta = ROUTES.ROUTE_META['/'];
  const t = HEAD.headTags({ path: '/', title: meta.title, description: meta.description, socialTitle: meta.socialTitle });
  const tags = tagsOf(html);
  assert.equal(unesc(tags.title), t.title);
  assert.deepEqual(tags.description.map(unesc), [t.description]);
  assert.deepEqual(tags.robots, [t.robots]);
  assert.deepEqual(tags.canonical, [t.canonical]);
  for (const m of t.meta) assert.deepEqual((tags[m.key] || []).map(unesc), [m.content], m.key);
  assert.doesNotMatch(html, /<meta property="og:image:(width|height)"/, 'the size is the app\'s tag, not a second one');
});

test('the Seo component and the build both write the head through headTags', () => {
  const seo = code('src/components/shared/Seo.tsx');
  assert.match(seo, /const tags = headTags\(\{/);
  assert.match(seo, /tags\.meta\.map\(/);
  assert.doesNotMatch(seo, /property="og:title"|name="twitter:title"/, 'no tag written by hand beside them');
  const build = code('vite.static-pages.ts');
  assert.match(build, /let html = applyHeadTags\(base, headTags\(\{/, 'the full pages');
  assert.match(build, /const shellHtml = \(base: string, input: HeadInput\): string => applyHeadTags\(base, headTags\(input\)\);/, 'the link previews');
  assert.match(build, /socialDescription: reportShareDescription\(r\),\s*card: reportShareCard\(r\.division\),/);
  const report = code('src/pages/ReportPage.tsx');
  assert.match(report, /socialDescription=\{reportShareDescription\(r\)\}\s*card=\{reportShareCard\(r\.division\)\}/, 'the report page writes the card the build writes');
  const register = code('src/pages/EventRegister.tsx');
  assert.match(register, /const head = event \? eventShareHead\(event\) : undefined;/);
  assert.equal((register.match(/<Shell head=\{head\}>/g) || []).length, 4, 'every view of a found event carries its head');
  assert.match(code('src/components/events/EventCardShell.tsx'), /<Seo page=\{head\.path\} title=\{head\.title\} description=\{head\.description\} card=\{head\.card\} noindex \/>/);
});

test('an event\'s card: its own title, when and where, and whose; an alumni call keeps its date private', () => {
  const ev = { id: 'a2a68828-3e68-4a19-960c-c26a1c3ba29b', title: 'Inside Private Banking', event_type: 'guest', date: '2026-11-18', start_at: '2026-11-18T17:15:00+00:00', end_at: '2026-11-18T19:00:00+00:00', place: 'Aula Zappa, Bocconi University', online: false, description: 'Three senior practitioners discuss the job.' };
  const h = EVENTS.eventShareHead(ev);
  assert.equal(h.path, `/events/${ev.id}/register`);
  assert.equal(h.title, 'Inside Private Banking');
  assert.equal(h.card, 'event-guest');
  assert.equal(h.noindex, true);
  assert.equal(h.description, 'Wednesday 18 November 2026, 6:15 pm to 8:00 pm CET, Aula Zappa, Bocconi University. An event of Minerva Investment Management Society. Three senior practitioners discuss the job.');
  const call = EVENTS.eventShareDescription({ ...ev, event_type: 'alumni_call', date: '2026-12-01', start_at: '2026-12-01T18:00:00Z', place: 'https://teams.microsoft.com/l/meetup-join/abc', online: true });
  assert.doesNotMatch(call, /2026|December|pm/, 'no date for an alumni call');
  assert.doesNotMatch(call, /teams\.microsoft|https?:/, 'never the meeting link');
  assert.match(call, /^Online\. An event of Minerva Investment Management Society\./);
  const long = EVENTS.eventShareDescription({ ...ev, description: 'word '.repeat(100) });
  assert.ok(long.length <= 223 && long.endsWith('...'), 'cut at a word');
});

test('a form\'s card: its own title, whose it is, and the form picture', () => {
  const h = FORMS.formShareHead({ id: '7d2f3a10-1111-4c2a-9a55-0f5c1a2b3c4d', title: 'Semester Commitment', audience: 'internal' });
  assert.deepEqual(h, { path: '/forms/7d2f3a10-1111-4c2a-9a55-0f5c1a2b3c4d', title: 'Semester Commitment', description: 'A form for the members of Minerva Investment Management Society.', card: 'form', noindex: true });
  assert.equal(FORMS.formShareDescription({ id: 'x', title: 't', audience: 'both' }), 'A form from Minerva Investment Management Society.');
  assert.equal(CARDS.shareCardForPath('/f/F7KQ2M'), 'form');
  assert.equal(CARDS.shareCardForPath('/forms/7d2f3a10-1111-4c2a-9a55-0f5c1a2b3c4d'), 'form');
  const page = code('src/pages/InternalFormPage.tsx');
  assert.match(page, /<EventCardShell head=\{formShareHead\(form\)\}>/, 'the form writes the head the build writes');
  assert.match(page, /<EventCardShell head=\{formShareHead\(\{ id: id \?\? '', title: mode\.title, audience: 'internal' \}\)\}>/, 'and so does its members-only notice');
  const m = read(migrationPath('share_links'));
  assert.match(m, /RETURNS TABLE \(id uuid, short_code text, title text, audience text\)/, 'the address, the code, the title and the audience: nothing else of a form');
  assert.match(m, /WHERE f\.status = 'open'\s+OR \(f\.status = 'closed' AND/, 'never a draft');
});

test('the workspace\'s cards follow its navigation, page for page', () => {
  const merged = new Set(Object.keys(NAV.MERGED_SUBSECTIONS));
  const fromNav = (sections) => sections.map((s) => ({ slug: s.slug, label: s.label, subs: s.subItems.filter((si) => !merged.has(si.key)).map((si) => [si.slug, si.label]) }));
  const strip = (sections) => sections.map((s) => ({ slug: s.slug, label: s.label, subs: s.subs }));
  assert.deepEqual(strip(CARDS.WORKSPACE_SHARE_SECTIONS), fromNav(NAV.NAV), 'the member\'s navigation');
  const applicant = fromNav(NAV.CANDIDATE_NAV).filter((s) => s.slug !== 'my-profile');
  assert.deepEqual(strip(CARDS.WORKSPACE_APPLICANT_SHARE_SECTIONS), applicant, 'the applicant\'s navigation');
  const pages = CARDS.workspaceSharePages();
  assert.equal(new Set(pages.map((p) => p.path)).size, pages.length);
  const bt = pages.find((p) => p.path === '/workspace/career/brainteasers');
  assert.equal(bt.documentTitle, 'Brainteasers | Workspace | MIMS', 'the tab title the workspace writes');
  assert.match(bt.description, /Minerva Investment Management Society/);
  for (const p of pages) assert.ok(CARDS.SHARE_CARDS.some((c) => c.key === p.card), p.path);
  // The workspace still writes its own tab title the same way.
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /\$\{activeSub\.label\} \| Workspace \| MIMS/);
});

test('the build writes each address\'s card, and changes nothing else on the page', { skip: noBuild }, () => {
  const shellPaths = [
    ...Object.keys(CARDS.ROUTE_SHARE_CARD).filter((p) => p !== '/' && !built.hidden.includes(p.slice(1))),
    ...Object.keys(CARDS.SHARE_ALIASES),
    ...CARDS.workspaceSharePages().map((p) => p.path),
  ];
  const root = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const p of shellPaths) {
    const file = join(DIST, p.slice(1), 'index.html');
    assert.ok(existsSync(file), `${p} has its own HTML`);
    const html = readFileSync(file, 'utf8');
    const t = tagsOf(html);
    for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:title', 'twitter:image', 'description', 'robots']) {
      assert.equal((t[k] || []).length, 1, `${p}: one ${k}`);
    }
    const img = t['og:image'][0].replace('https://minervaims.org', '');
    assert.ok(existsSync(join(DIST, img)), `${p}: ${img} is in the build`);
    assert.match(unesc(t['og:title'][0]), /Minerva|MIMS/, p);
    assert.match(unesc(t['og:description'][0]), /Minerva/, p);
    assert.doesNotMatch(html, /id="mims-home"/, `${p}: never the homepage's first screen`);
    // A page the build writes in full (the archive, the track record) is
    // checked by static-pages.test.mjs; the rest are previews only.
    if (html.includes('id="mims-page-data"')) continue;
    assert.doesNotMatch(html, /#root\{display:none\}/, `${p}: the app draws the page, as at any address`);
    assert.match(html, /<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/, `${p}: the app starts as it always did`);
    if (p.startsWith('/workspace')) assert.deepEqual(t.robots, ['noindex, nofollow'], `${p}: never indexed`);
    // The body is the app's own: everything after </head> but the homepage's template.
    const body = (h) => h.slice(h.indexOf('</head>')).replace(/<template id="mims-home">[\s\S]*?<\/template>\s*/, '').replace(/<script>\(function\(\)\{var d=document,(de|b)=[\s\S]*?<\/script>\s*/g, '');
    assert.ok(body(html).includes('<div id="root"><div id="initial-loader"'), `${p}: the loader, as everywhere`);
    assert.ok(body(root).includes('<div id="root"><div id="initial-loader"'));
  }
  assert.equal(tagsOf(readFileSync(join(DIST, 'people/index.html'), 'utf8')).canonical[0], 'https://minervaims.org/people/members', 'an old address shares the page it opens');
  // Each public event's registration and short link.
  const eventDirs = existsSync(join(DIST, 'events')) ? readdirSync(join(DIST, 'events'), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(DIST, 'events', d.name, 'register/index.html'))).map((d) => d.name) : [];
  if (built.event_previews) assert.equal(eventDirs.length, built.event_previews, 'one per public event');
  for (const id of eventDirs) {
    const t = tagsOf(readFileSync(join(DIST, 'events', id, 'register/index.html'), 'utf8'));
    assert.deepEqual(t.robots, ['noindex, nofollow'], id);
    assert.deepEqual(t.canonical, [], `${id}: no canonical on a page not indexed`);
    assert.equal(t['og:url'][0], `https://minervaims.org/events/${id}/register`);
    assert.match(t['og:image'][0], /\/share\/event(-[a-z-]+)?\.jpg$/);
    assert.match(unesc(t['og:description'][0]), /An event of Minerva Investment Management Society\./);
  }
  const formDirs = existsSync(join(DIST, 'forms')) ? readdirSync(join(DIST, 'forms')) : [];
  if (built.form_previews !== null && built.form_previews !== undefined) assert.equal(formDirs.length, built.form_previews, 'one per published form');
  for (const id of formDirs) {
    const t = tagsOf(readFileSync(join(DIST, 'forms', id, 'index.html'), 'utf8'));
    assert.deepEqual(t.robots, ['noindex, nofollow'], id);
    assert.equal(t['og:url'][0], `https://minervaims.org/forms/${id}`);
    assert.match(t['og:image'][0], /\/share\/form\.jpg$/);
    assert.match(unesc(t['og:description'][0]), /Minerva Investment Management Society\.$/);
  }
  for (const c of existsSync(join(DIST, 'f')) ? readdirSync(join(DIST, 'f')) : []) {
    assert.match(tagsOf(readFileSync(join(DIST, 'f', c, 'index.html'), 'utf8'))['og:url'][0], /\/forms\/[0-9a-f-]{36}$/, `${c}: the card of the form it opens`);
  }
  const codes = existsSync(join(DIST, 'e')) ? readdirSync(join(DIST, 'e')) : [];
  assert.equal(codes.length, built.event_short_links ?? 0);
  for (const c of codes) {
    assert.match(c, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    const t = tagsOf(readFileSync(join(DIST, 'e', c, 'index.html'), 'utf8'));
    assert.match(t['og:url'][0], /\/events\/[0-9a-f-]{36}\/register$/, `${c}: the card of the page it opens`);
  }
});

test('the build reads only the public events\' short codes', { skip: !PG && 'MIMS_PG not set' }, () => {
  const sql = (q) => execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).trim();
  assert.equal(sql("select prosecdef from pg_proc where proname = 'public_event_share_codes'"), 't');
  assert.equal(sql("select has_function_privilege('anon', 'public.public_event_share_codes()', 'execute')"), 't');
  const out = sql(`begin;
    insert into events (title, date, place, event_type, show_on_website, registration_enabled, registration_audience) values ('S109 members only', current_date + 5, 'Room 1', 'meeting', false, true, 'members');
    insert into events (title, date, place, event_type, show_on_website, registration_enabled, registration_audience) values ('S109 open', current_date + 5, 'Room 2', 'guest', false, true, 'public');
    select string_agg(e.title || '=' || (c.id is not null), ',' order by e.title) from events e left join public_event_share_codes() c on c.id = e.id where e.title like 'S109%';
    rollback;`).split('\n').filter((l) => l.includes('='))[0];
  assert.equal(out, 'S109 members only=false,S109 open=true');
  // Forms: the published ones, never a draft nor one closed long ago.
  assert.equal(sql("select has_function_privilege('anon', 'public.public_form_share_links()', 'execute')"), 't');
  const forms = sql(`begin;
    insert into internal_forms (title, status, audience) values ('S109F draft', 'draft', 'internal'), ('S109F open', 'open', 'internal'), ('S109F guests', 'open', 'external');
    insert into internal_forms (title, status, audience, closed_at) values ('S109F closed long ago', 'closed', 'internal', now() - interval '200 days'), ('S109F closed lately', 'closed', 'both', now() - interval '5 days');
    select string_agg(title, ',' order by title) from public_form_share_links() where title like 'S109F%';
    rollback;`).split('\n').filter((l) => l.startsWith('S109F'))[0];
  assert.equal(forms, 'S109F closed lately,S109F guests,S109F open');
});

test('the migration only reads, and is safe to run twice', () => {
  const m = read(migrationPath('share_links'));
  assert.match(m, /CREATE OR REPLACE FUNCTION public\.public_event_share_codes\(\)/);
  assert.match(m, /SECURITY DEFINER/);
  assert.match(m, /\(e\.show_on_website\s+OR \(e\.registration_enabled AND e\.registration_audience <> 'members'\)\)/, 'the events a visitor can read');
  assert.doesNotMatch(m.replace(/--.*$/gm, ''), /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER TABLE)\b/i);
});

test('robots.txt lets the link-preview fetchers read a workspace card, and nobody index one', () => {
  const groups = read('public/robots.txt').replace(/#.*$/gm, '').split(/\n\s*\n/).map((g) => g.trim()).filter((g) => /User-agent:/i.test(g));
  const rules = (g) => ({ agents: [...g.matchAll(/User-agent:\s*(\S+)/gi)].map((m) => m[1]), disallow: [...g.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]) });
  const all = groups.map(rules);
  const star = all.find((g) => g.agents.includes('*'));
  const preview = all.find((g) => g.agents.includes('Twitterbot'));
  assert.ok(star.disallow.includes('/workspace'), 'search engines still never crawl the workspace');
  for (const a of ['Twitterbot', 'LinkedInBot', 'facebookexternalhit', 'WhatsApp', 'TelegramBot', 'Slackbot-LinkExpanding', 'SkypeUriPreview', 'Discordbot']) {
    assert.ok(preview.agents.includes(a), a);
  }
  assert.ok(!preview.disallow.includes('/workspace'), 'a workspace link shows its card');
  assert.deepEqual(preview.disallow, star.disallow.filter((d) => d !== '/workspace'), 'every other path stays closed to them');
  assert.ok(!all.some((g) => g.disallow.includes('/share') || g.disallow.includes('/share/')), 'the pictures are never closed');
});
