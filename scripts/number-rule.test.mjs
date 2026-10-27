// =====================================================================
// THE NUMBER RULE, TESTED (Step 92; AGENTS.md).
// ---------------------------------------------------------------------
// A number on the public website has its final value in the page text
// from the first frame: the text never counts up, never shows a zero
// placeholder, and is never swapped for another value. The homepage and
// /join hero figures still count up for people (Step 93): the moving
// digits are drawn by an aria-hidden overlay from a data attribute, never
// written to the text, which holds the final "250+" throughout.
// This test fails if public code animates the TEXT of a number, if the
// shared formatters change what a figure looks like, or if a page is
// given a figure the registry does not define.
//
//   node --test scripts/number-rule.test.mjs
//
// The workspace (src/components/admin, the workspace page) may keep its
// own counters: it is not public.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const WORKSPACE = [/^src\/components\/admin\//, /^src\/pages\/MinervaWorkspace\.tsx$/, /^src\/hooks\/useAnimatedCounter\.ts$/];
const publicFiles = walk(SRC)
  .map((p) => relative(ROOT, p).split('\\').join('/'))
  .filter((p) => !WORKSPACE.some((re) => re.test(p)));

test('no public file imports a count-up hook', () => {
  const bad = publicFiles.filter((p) => /useAnimatedCounter|useKeyFigures/.test(readFileSync(join(ROOT, p), 'utf8').replace(/\/\/.*$/gm, '')));
  assert.deepEqual(bad, [], `count-up hooks used in public code: ${bad.join(', ')}`);
});

test('no public file defines a counter that animates a number', () => {
  const bad = publicFiles.filter((p) => /\b(function|const)\s+(CountUp|AnimatedFigure|AnimatedNumber|AnimatedCounter)\b/.test(readFileSync(join(ROOT, p), 'utf8')));
  assert.deepEqual(bad, [], `counter components in public code: ${bad.join(', ')}`);
});

test('no public file tweens a number into state frame by frame', () => {
  // The shape every count-up has: an animation frame loop, an easing
  // curve, and the eased value written into a value, count or display
  // state. (Layout code that rounds measurements on a frame is fine.)
  const bad = publicFiles.filter((p) => {
    const src = readFileSync(join(ROOT, p), 'utf8');
    return /requestAnimationFrame/.test(src)
      && /(Math\.pow\(\s*1\s*-|easeOut|easing)/i.test(src)
      && /\bset(Value|Count|Counter|Display\w*|Shown|Number\w*|Figure\w*)\(/.test(src);
  });
  assert.deepEqual(bad, [], `frame-by-frame numeric state in public code: ${bad.join(', ')}`);
});

async function load(path) {
  const source = readFileSync(join(ROOT, path), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const kn = await load('src/lib/key-numbers.ts');
const fig = (value, format, decimals = 0, extra = {}) => ({ value, format, decimals, prefix: '', suffix: '', ...extra });

test('figures are exact, in British format, the same everywhere', () => {
  assert.equal(kn.formatKeyNumber(fig(1234, 'integer')), '1,234');
  assert.equal(kn.formatKeyNumber(fig(168, 'integer')), '168');
  assert.equal(kn.formatKeyNumber(fig(2017, 'year')), '2017');
  assert.equal(kn.formatKeyNumber(fig(12.5, 'percent', 1)), '12.5%');
  assert.equal(kn.formatKeyNumber(fig(5, 'percent', 1)), '5.0%');
  assert.equal(kn.formatKeyNumber(fig(-14.3, 'percent', 1)), '-14.3%');
  assert.equal(kn.formatKeyNumber(fig(0.6412, 'ratio', 2)), '0.64');
  assert.equal(kn.formatKeyNumber(fig(4.4, 'years', 1)), '4.4');
  assert.equal(kn.formatKeyNumber(fig(1200, 'eur')), '€1,200');
  assert.equal(kn.formatAsOf('2026-10-22'), '22 October 2026');
});

test('the exact formatter never rounds down or adds a "+"', () => {
  assert.equal(kn.formatKeyNumber(fig(253, 'integer')), '253');
  assert.ok(!kn.formatKeyNumber(fig(253, 'integer')).includes('+'));
});

test('hero figures read as the ten below with a "+", and exactly under ten', () => {
  assert.equal(kn.formatHeroFigure(fig(253, 'integer')), '250+');
  assert.equal(kn.formatHeroFigure(fig(160, 'integer')), '160+');
  assert.equal(kn.formatHeroFigure(fig(1234, 'integer')), '1,230+');
  assert.equal(kn.formatHeroFigure(fig(7, 'integer')), '7');
  assert.equal(kn.formatHeroFigure(fig(12.5, 'percent', 1)), '12.5%');
  assert.equal(kn.heroTarget(fig(253, 'integer')), 250);
  assert.equal(kn.heroTarget(fig(7, 'integer')), null);
});

test('the hero count-up writes only to an aria-hidden attribute, never to the text', () => {
  const src = readFileSync(join(ROOT, 'src/components/numbers/HeroFigure.tsx'), 'utf8');
  assert.match(src, /<span className="kn-count-text">\{text\}<\/span>/, 'the final text is the figure text');
  assert.match(src, /className="kn-count-face" aria-hidden="true"/, 'the moving digits are aria-hidden');
  assert.match(src, /face\.dataset\.count = /, 'the moving digits go to data-count');
  assert.doesNotMatch(src, /\.(textContent|innerText|innerHTML|nodeValue)\s*=/, 'nothing writes page text');
  assert.doesNotMatch(src, /useState/, 'no React state for the moving value');
  const css = readFileSync(join(ROOT, 'src/components/numbers/numbers.css'), 'utf8');
  assert.match(css, /content: attr\(data-count\)/, 'drawn as generated content');
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*kn-count-face \{ display: none; \}/, 'off under reduced motion');
  // The homepage draws its hero through HomeHero (Step 102), which the build
  // also uses for the first screen it writes into the HTML.
  for (const p of ['src/components/home/HomeHero.tsx', 'src/components/join/JoinFigures.tsx']) {
    assert.match(readFileSync(join(ROOT, p), 'utf8'), /<HeroFigure figure=/, `${p} uses HeroFigure`);
  }
  assert.match(readFileSync(join(ROOT, 'src/pages/Index.tsx'), 'utf8'), /<HomeHero\b/, 'the homepage uses HomeHero');
});

test('every page placement names a defined figure, and every page has a heading', () => {
  const sql = readFileSync(join(ROOT, 'supabase/migrations/20261022130000_key_numbers.sql'), 'utf8');
  const seeded = new Set([...sql.matchAll(/^\s*\('([a-z0-9_]+)',\s*'[^']*',\s*'(integer|percent|years|ratio|eur|year)'/gm)].map((m) => m[1]));
  const placements = [...sql.matchAll(/\('([a-z0-9-]+)','([a-z0-9_]+)',(\d+)\)/g)].map((m) => ({ page: m[1], slug: m[2], pos: Number(m[3]) }));
  assert.ok(seeded.size >= 40, `found ${seeded.size} figures`);
  assert.ok(placements.length >= 60, `found ${placements.length} placements`);
  for (const p of placements) assert.ok(seeded.has(p.slug), `${p.page} uses undefined figure ${p.slug}`);
  const pages = new Set(placements.map((p) => p.page));
  for (const page of pages) {
    if (page.startsWith('numbers-')) continue;
    assert.ok(kn.STATS_SECTION_TITLES[page], `no heading for ${page}`);
    const pos = placements.filter((p) => p.page === page).map((p) => p.pos);
    assert.equal(new Set(pos).size, pos.length, `duplicate positions on ${page}`);
  }
});
