// =====================================================================
// A REPORT'S PAGE ON THE LIGHT DOT FIELD, AND THE PORTFOLIO PAGE ORDER
// (Step 105).
// ---------------------------------------------------------------------
// A report's own page (/archive/<address>) opens on the light version of
// the /join dot field, under a clear header with dark type, with its
// title in the accent colour. The dark field is untouched: same colours,
// same callers. On Portfolio Management, "How we work" comes before the
// funds. This test fails if any of that comes undone.
//
//   node --test scripts/report-page-light.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('the report page draws the light field, a clear header and an accent title', () => {
  const page = read('src/pages/ReportPage.tsx');
  assert.match(page, /<div data-page-hero className="relative border-b border-separator">\s*<LightDotBackground \/>/);
  assert.match(page, /<PageIntroduction title=\{r\.title\} transparentBackground tone="light" \/>/);
  assert.doesNotMatch(page, /archiveBgAsset|useImagePreload/, 'no picture to wait for');
  const intro = read('src/components/shared/PageIntroduction.tsx');
  assert.match(intro, /light \? 'text-accent' : 'text-background drop-shadow/);
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /const LIGHT_HERO_PATTERNS = \[\/\^\\\/archive\\\/\[\^\/\]\+\\\/\?\$\/\];/);
  assert.match(header, /const clearBar = transparent \|\| \(lightHero && !scrolled && !mobileOpen\);/);
  // Dark type over the light hero: `transparent` (white type) never includes it.
  assert.match(header, /const transparent = \(\(hasHero && !scrolled\) \|\| isCardRoute\) && !mobileOpen;/);
  assert.match(header, /!\(hasHero \|\| isCardRoute \|\| lightHero\) && \(/, 'no spacer under a light hero');
});

test('the light field is built like the dark one, and the dark one is untouched', () => {
  const light = read('src/components/shared/LightDotBackground.tsx');
  assert.match(light, /const DotField = lazy\(\(\) => import\('@\/components\/shared\/DotField'\)\);/);
  assert.match(light, /onReady=\{\(\) => setFieldPainted\(true\)\}/, 'the lattice hands over on the first painted frame');
  assert.match(light, /prefers-reduced-motion: reduce/);
  assert.match(light, /perfMode\(\) === 'lite'/);
  assert.match(light, /export const LIGHT_DOTS = \{ from: '#4A3290', to: '#7A66BE', radius: 1\.25 \} as const;/);
  const field = read('src/components/shared/DotField.tsx');
  assert.match(field, /gradientFrom = '#7E5BC2',\s*gradientTo = '#B0A2DA',\s*glowColor = '#2A1A5C',/);
  assert.match(field, /dotRadius = 1,\s*dotSpacing = 17,/);
  for (const p of ['src/components/shared/ApplyBackground.tsx', 'src/components/join/JoinHeroStage.tsx']) {
    assert.match(read(p), /<DotField glowRadius=\{0\} onReady=\{\(\) => setFieldPainted\(true\)\} \/>/, `${p} keeps the dark field`);
  }
});

test('Portfolio Management says how it works before it shows its funds', () => {
  const src = read('src/pages/DivisionDetail.tsx');
  const how = src.indexOf('{isPortfolio && <DivisionWork page={work} flagship={[]} />}');
  const chart = src.indexOf('<FundPerformanceChart');
  const funds = src.indexOf('MIMS Virtual Funds');
  const rest = src.indexOf('<DivisionWork page={isPortfolio ? null : work} flagship={flagship} />');
  assert.ok(how > 0 && how < chart && chart < funds && funds < rest, 'How we work, the chart, the funds, then Flagship work');
});
