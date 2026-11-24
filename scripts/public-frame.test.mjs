// =====================================================================
// THE WEBSITE'S FRAME (Step 107): the footer's two columns, a clear
// navigation bar over the opening of every page, and the figures beside
// the two ways in on the Contacts page.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const links = (src, name) => [...src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/href: '([^']+)'/g)].map((m) => m[1]);

test('the footer: the Track Record in The Society, Contacts in Explore', () => {
  const footer = read('src/components/layout/Footer.tsx');
  assert.deepEqual(links(footer, 'societyLinks'), ['/about', '/people/members', '/people/alumni', '/statute', '/track-record', '/join']);
  assert.deepEqual(links(footer, 'exploreLinks'), ['/events', '/archive', '/readings', '/company-relations', '/partnerships', '/contacts']);
});

test('every page that opens on a picture has the clear bar over it', () => {
  const header = read('src/components/layout/Header.tsx');
  const exact = header.match(/const HERO_ROUTES_EXACT = new Set\(\[([^\]]*)\]\);/)[1];
  for (const r of ['/partnerships', '/company-relations', '/join/division-fit', '/sitemap', '/contacts', '/track-record']) {
    assert.ok(exact.includes(`"${r}"`), `${r} has the clear bar`);
  }
  // Every page component that draws a picture hero is on the list, by its route.
  const ROUTES = { Partnerships: '/partnerships', CompanyRelations: '/company-relations', DivisionFit: '/join/division-fit', Sitemap: '/sitemap', Contacts: '/contacts', Readings: '/readings', About: '/about', Events: '/events', Archive: '/archive' };
  for (const [page, route] of Object.entries(ROUTES)) {
    const src = read(`src/pages/${page}.tsx`);
    assert.match(src, /<div data-page-hero className="relative">/, `${page} marks its hero`);
    assert.ok(exact.includes(`"${route}"`), `${page} (${route}) is a clear-bar route`);
  }
  // The Statute and the policies: clear with dark type over their opening block, the pages untouched.
  assert.match(header, /const CLEAR_LIGHT_ROUTES = new Set\(\["\/statute", "\/privacy-policy", "\/cookie-policy", "\/terms-of-use", "\/disclaimer"\]\);/);
  assert.match(header, /const clearBar = transparent \|\| \(\(lightHero \|\| clearLight\) && !scrolled && !mobileOpen\);/);
  assert.match(header, /document\.querySelector\("main header\.lp-hero"\)/, 'solid again once the opening block has scrolled past');
});

test('the Contacts page shows three key figures beside each way in, from the registry', () => {
  const page = read('src/pages/Contacts.tsx');
  const kn = read('src/lib/key-numbers.ts');
  assert.match(kn, /export const CONTACTS_FIGURES = \{\s*company: \['speakers', 'company_visits', 'alumni_firms'\],\s*partnerships: \['events_held', 'registrations_12m', 'active_members'\],\s*\} as const;/);
  assert.match(page, /<ContactFigures slugs=\{CONTACTS_FIGURES\.company\} label="Company relations in figures" \/>\s*<\/div>\s*<Link to="\/company-relations"/, 'beside Visit Company relations');
  assert.match(page, /<ContactFigures slugs=\{CONTACTS_FIGURES\.partnerships\} label="Partnerships in figures" \/>\s*<\/div>\s*<Link to="\/partnerships"/, 'beside Visit Partnerships');
  // The number rule: the final text from the first frame, exact, never counted up.
  assert.match(page, /<KeyFigureValue figure=\{f\} \/>/);
  assert.doesNotMatch(page, /rounded|useCountUp|setInterval|requestAnimationFrame/);
  // Every slug is a figure the registry defines.
  const seeded = read('supabase/migrations/20261022130000_key_numbers.sql');
  for (const slug of ['speakers', 'company_visits', 'alumni_firms', 'events_held', 'registrations_12m', 'active_members']) {
    assert.ok(seeded.includes(`'${slug}'`), `${slug} is in the registry`);
  }
});

test('no em dash in what this step added', () => {
  for (const f of ['src/components/layout/Footer.tsx', 'src/components/layout/Header.tsx', 'src/pages/Contacts.tsx', 'src/lib/alumni-careers.ts', 'src/pages/TrackRecord.tsx', 'src/pages/Alumni.tsx']) {
    assert.ok(!read(f).includes('\u2014'), f);
  }
});
