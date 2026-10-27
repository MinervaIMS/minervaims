// =====================================================================
// THE PAGE-SPEED WORK OF STEP 102, TESTED.
// ---------------------------------------------------------------------
// What made the homepage fast must stay true, and what it must not have
// changed must stay unchanged:
//
//   * the homepage's first screen is drawn by the app's own hero
//     (components/home/HomeHero) and written into the HTML by the build
//     (vite.prerender.ts, vite.prerender-page.ts), only at its own address;
//   * its count and its phone intro are HeroFigure's and Preloader's, to
//     the millisecond and the curve;
//   * pictures are asked for at the size they are drawn;
//   * the carousel dots are one control large enough for a finger;
//   * live updates and below-the-fold weight wait for the reader.
//
//   node --test scripts/page-speed.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildSync, transformSync } from 'esbuild';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

async function load(path) {
  const { code: js } = transformSync(read(path), { loader: 'ts', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
async function bundle(path) {
  const out = buildSync({ entryPoints: [join(ROOT, path)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

// ---------------------------------------------------------------------
// Pictures at the size they are drawn.
// ---------------------------------------------------------------------

test('a hosted picture is asked for at a width, and nothing else is touched', async () => {
  const { sizedAsset, assetSrcSet, LOADER_LOGO_WIDTH } = await load('src/lib/asset-image.ts');
  assert.equal(sizedAsset('/__l5e/assets-v1/x/a.webp', 1920), '/__l5e/assets-v1/x/a.webp?w=1920');
  assert.equal(sizedAsset('/__l5e/assets-v1/x/a.webp?w=10', 1280.4), '/__l5e/assets-v1/x/a.webp?w=1280');
  assert.equal(sizedAsset('/assets/logo.svg', 100), '/assets/logo.svg');
  assert.equal(sizedAsset('https://example.org/a.png', 100), 'https://example.org/a.png');
  assert.equal(assetSrcSet('/__l5e/assets-v1/x/a.webp', [1280, 1920]), '/__l5e/assets-v1/x/a.webp?w=1280 1280w, /__l5e/assets-v1/x/a.webp?w=1920 1920w');
  assert.equal(assetSrcSet('/assets/a.png', [1]), undefined);
  assert.equal(LOADER_LOGO_WIDTH, 196);
});

test('the loading mark is one download: the page and both loaders ask for the same size', () => {
  const html = read('index.html');
  assert.equal(html.match(/loader\.webp\?w=196"/g)?.length, 4, 'two preloads and two pictures in index.html');
  assert.doesNotMatch(html, /loader\.webp"/, 'no loader picture at its stored size');
  for (const p of ['src/components/shared/PageLoader.tsx', 'src/components/admin/WorkspaceLoader.tsx']) {
    const src = code(p);
    assert.doesNotMatch(src, /src=\{logo(Color|White)Asset\.url\}/, `${p} asks for the stored size`);
    assert.match(src, /sizedAsset\(logo(Color|White)Asset\.url, LOADER_LOGO_WIDTH\)/, `${p} asks for the loader size`);
  }
});

test('the division photographs are asked for at the width they are drawn', () => {
  // The division page's hero: every background through sizedAsset, which
  // the preload and the CSS background then share.
  const detail = code('src/pages/DivisionDetail.tsx');
  const assets = [...detail.matchAll(/import (\w+) from '@\/assets\/[^']+\.webp\.asset\.json'/g)].map((m) => m[1]);
  assert.equal(assets.length, 5, 'five divisions');
  for (const a of assets) assert.match(detail, new RegExp(`sizedAsset\\(${a}\\.url, 1920\\)`), a);
  // The homepage's stack keeps the addresses and sizes them at the picture.
  const stack = code('src/components/shared/DivisionScrollStack.tsx');
  assert.match(stack, /src=\{sizedAsset\(background, 1920\)\}/);
  assert.match(stack, /srcSet=\{assetSrcSet\(background, \[1280, 1920\]\)\}/);
  assert.match(stack, /width=\{1920\}\s+height=\{900\}/);
});

test('every ticker logo carries the size of its own file, and arrives when the reader comes near', () => {
  const src = read('src/components/shared/AlumniTicker.tsx');
  const table = Object.fromEntries([...src.matchAll(/'([a-z0-9-]+)': \[(\d+), (\d+)\]/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
  const files = readdirSync(join(ROOT, 'public/logos')).filter((f) => f.endsWith('.svg'));
  assert.equal(Object.keys(table).length, files.length, 'one entry per file');
  for (const f of files) {
    const svg = read(`public/logos/${f}`).slice(0, 800).match(/<svg[^>]*>/)[0];
    const w = svg.match(/ width="([\d.]+)"/);
    const h = svg.match(/ height="([\d.]+)"/);
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const size = w && h ? [Math.trunc(Number(w[1])), Math.trunc(Number(h[1]))] : [Math.trunc(vb[2]), Math.trunc(vb[3])];
    assert.deepEqual(table[f.slice(0, -4)], size, f);
  }
  for (const [, file] of src.matchAll(/file: '([a-z0-9-]+)'/g)) assert.ok(table[file], `${file} has a size`);
  assert.match(src, /width=\{LOGO_SIZES\[logo\.file\]\?\.\[0\]\}/);
  assert.match(src, /height=\{LOGO_SIZES\[logo\.file\]\?\.\[1\]\}/);
  assert.match(src, /new IntersectionObserver\([\s\S]*?rootMargin: '150% 0px'/);
  assert.match(src, /\{near && tripled\.map/);
});

test('the logos drawn at a fixed height say how large they are', () => {
  assert.match(code('src/components/home/HomeHero.tsx'), /src=\{logoWhite\}[\s\S]{0,200}width=\{2300\}\s+height=\{2300\}/);
  assert.equal(code('src/components/layout/Header.tsx').match(/width=\{2000\}\s+height=\{2000\}/g)?.length, 2);
  assert.match(code('src/components/shared/ReportsSection.tsx'), /className="rc-mark"[^>]*width=\{2000\} height=\{2000\}/);
  // The mark behind the funds chart is the reduced copy, lazy and sized.
  const chart = code('src/components/shared/FundPerformanceChart.tsx');
  assert.match(chart, /from '@\/assets\/full-logo-color-mark\.svg'/);
  assert.match(chart, /src=\{fullLogoColorMark\}[\s\S]{0,80}width=\{2300\}\s+height=\{2300\}\s+loading="lazy"/);
});

// ---------------------------------------------------------------------
// The carousel dots: one control a finger can press.
// ---------------------------------------------------------------------

test('the dots under every carousel are one control, at least 24px tall, and the layout does not move', () => {
  for (const p of ['src/components/shared/ReportsSection.tsx', 'src/components/alumni/AlumniCallsCarousel.tsx', 'src/components/shared/CarouselScrollIndicator.tsx']) {
    const src = code(p);
    assert.match(src, /<DotPager\b/, `${p} uses DotPager`);
    assert.doesNotMatch(src, /className=\{`(r|m)dot\$\{/, `${p} still draws one button per dot`);
    assert.doesNotMatch(src, /role="tab"/, `${p} still has dot tabs`);
  }
  const pager = code('src/components/shared/DotPager.tsx');
  assert.match(pager, /role="slider"/);
  assert.match(pager, /aria-valuenow=\{active \+ 1\}/);
  assert.match(pager, /aria-valuetext=/);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.match(pager, new RegExp(key));
  assert.match(pager, /aria-hidden="true"/, 'the dots themselves are pictures');
  const css = read('src/index.css');
  const rule = css.match(/\.dot-pager \{([^}]*)\}/)[1];
  assert.match(rule, /min-height:24px/);
  assert.match(rule, /margin-block:-9px/, '24px tall, 6px drawn: 9px taken back each side');
  assert.match(rule, /padding-inline:9px; margin-inline:-9px/);
  assert.match(css, /\.dot-pager:focus-visible \{ outline:2px solid hsl\(var\(--accent\)\)/);
});

// ---------------------------------------------------------------------
// What waits for the reader.
// ---------------------------------------------------------------------

test('live updates open on the first interaction, and only once', async () => {
  for (const p of ['src/components/shared/TestimonialsSection.tsx', 'src/hooks/usePageVisibility.ts']) {
    assert.match(code(p), /whenEngaged\(\(\) => \{[\s\S]*?\.channel\(/, `${p} subscribes inside whenEngaged`);
  }
  const listeners = {};
  globalThis.window = {
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f); },
    removeEventListener: (t, f) => { listeners[t] = (listeners[t] || []).filter((x) => x !== f); },
  };
  try {
    const { whenEngaged } = await load('src/lib/when-engaged.ts');
    let a = 0; let b = 0;
    whenEngaged(() => { a += 1; });
    const cancel = whenEngaged(() => { b += 1; });
    cancel();
    assert.equal(a, 0, 'nothing before the reader does anything');
    assert.deepEqual(Object.keys(listeners).sort(), ['keydown', 'pointerdown', 'scroll', 'touchstart', 'wheel']);
    listeners.pointerdown[0]();
    assert.equal(a, 1);
    assert.equal(b, 0, 'a cancelled start never runs');
    assert.ok(Object.values(listeners).every((l) => l.length === 0), 'listeners removed after the first interaction');
    let c = 0;
    whenEngaged(() => { c += 1; });
    assert.equal(c, 1, 'after engagement a start runs at once');
  } finally {
    delete globalThis.window;
  }
});

test('the funds chart and the phone intro are fetched only when needed', () => {
  const index = code('src/pages/Index.tsx');
  assert.doesNotMatch(index, /import \{ FundPerformanceChart \}/, 'no static import of the chart on the homepage');
  assert.match(index, /import\("@\/components\/shared\/FundPerformanceChart"\)/);
  assert.match(index, /!firstScreen && \(isCarouselLoading \|\| !imagesLoaded \|\| !chartReady\)/, 'the loader waits for the chart as for the reports');
  assert.match(index, /const restReady = !isCarouselLoading && chartReady;/);
  const app = code('src/App.tsx');
  assert.doesNotMatch(app, /import \{ Preloader \}/);
  assert.match(app, /lazy\(\(\) => import\("@\/components\/shared\/Preloader"\)/);
  assert.match(app, /<Suspense fallback=\{<PreloaderGround \/>\}>/);
  assert.match(app, /fixed inset-0 z-\[9999\] flex items-center justify-center" style=\{\{ backgroundColor: "#1F0F4D"/, 'the stand-in is the intro\'s own first frame');
});

// ---------------------------------------------------------------------
// The homepage's first screen.
// ---------------------------------------------------------------------

test('the first screen is the app\'s own hero, in the app\'s own frame', () => {
  assert.match(code('src/pages/Index.tsx'), /<HomeHero\b/);
  const entry = code('src/prerender/first-screen.tsx');
  for (const piece of ['<Header />', '<HomeHero', 'className={LAYOUT_FRAME_CLASS}', 'className={LAYOUT_MAIN_CLASS}', '<StaticRouter location="/">', '<AuthProvider>']) {
    assert.ok(entry.includes(piece), `first-screen.tsx: ${piece}`);
  }
  const layout = code('src/components/layout/Layout.tsx');
  assert.match(layout, /<div className=\{LAYOUT_FRAME_CLASS\}>/);
  assert.match(layout, /<main className=\{LAYOUT_MAIN_CLASS\}>/);
  const hero = code('src/components/home/HomeHero.tsx');
  for (const piece of ['data-page-hero', 'data-nav-flip', 'data-hero-keepout="logo"', '<HeroMarketBackground />', '<h1 className="sr-only">']) assert.ok(hero.includes(piece), piece);
  assert.match(read('vite.config.ts'), /staticPagesPlugin\([\s\S]*?prerenderPlugin\(/, 'registered after the static pages, which keep the ordinary start');
  assert.match(read('vite.prerender.ts'), /'@\/integrations\/supabase\/client', replacement: path\.join\(root, 'src\/prerender\/supabase-client-stub\.ts'\)/);
});

test('the first screen\'s count and intro are HeroFigure\'s and Preloader\'s', async () => {
  const page = await bundle('vite.prerender-page.ts');
  const figure = read('src/components/numbers/HeroFigure.tsx');
  assert.equal(Number(figure.match(/const DURATION_MS = (\d+);/)[1]), page.COUNT_MS);
  assert.match(figure, /1 - Math\.pow\(1 - progress, 3\)/);
  const pre = read('src/components/shared/Preloader.tsx');
  const dur = [...pre.matchAll(/duration: ([\d.]+)[,\s}]/g)].map((m) => Math.round(Number(m[1]) * 1000));
  assert.deepEqual(dur, [480, 880, 380, 720], 'in, hold, out, contract');
  assert.equal(page.INTRO_REVEAL_MS, 480 + 880 + 380);
  for (const ease of ['power1.out', 'power1.in', 'power2.inOut']) assert.ok(pre.includes(`ease: "${ease}"`), ease);
  assert.match(pre, /width: "clamp\(140px, 16vw, 240px\)"/);
  assert.match(pre, /backgroundColor: "#1F0F4D"/);
  assert.match(pre, /setTimeout\(resolve, 1400\)/);
  const app = read('src/App.tsx');
  assert.equal(app.match(/const PRELOADER_KEY = "([^"]+)"/)[1], page.INTRO_KEY);
  assert.equal(Number(app.match(/const DESKTOP_MIN = (\d+);/)[1]), page.INTRO_MAX_WIDTH);
  assert.match(code('src/App.tsx'), /if \(staticIntroInDocument\(\)\) return false;/, 'the app does not play it a second time');
  const { stamp } = page.pageScripts({ heroLogo: '/assets/h.svg', introLogo: '/assets/i.svg', chrome: { theme: '#000000', base: '#ffffff', bottom: '#ffffff' } }, '/assets/index-x.js', [], []);
  // The Preloader's eases, as cubic-beziers, and its timeline.
  assert.match(stamp, /\{duration:480,easing:'cubic-bezier\(0\.25,0\.46,0\.45,0\.94\)',fill:'forwards'\}/);
  assert.match(stamp, /\{duration:380,delay:1360,easing:'cubic-bezier\(0\.55,0\.085,0\.68,0\.53\)',fill:'forwards'\}/);
  assert.match(stamp, /\{duration:720,delay:1740,easing:'cubic-bezier\(0\.645,0\.045,0\.355,1\)',fill:'forwards'\}/);
  assert.match(stamp, /transform-origin:center center/);
  assert.match(stamp, /setTimeout\(st,1400\)/);
  assert.match(stamp, /\/3200,1\)\),v=1-Math\.pow\(1-p,3\)/, 'the count\'s duration and curve');
  assert.match(stamp, /prefers-reduced-motion: reduce/, 'no count under reduced motion');
  assert.match(stamp, /mims_key_figures/, 'the same figures the app will show, or no first screen');
});

const BUILT = `<!doctype html><html lang="en"><head>
    <script type="module" crossorigin src="/assets/index-AAA.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-react-BBB.js">
    <link rel="modulepreload" crossorigin href="/assets/vendor-ui-CCC.js">
    <link rel="preload" as="image" href="/__l5e/assets-v1/1/logo-color-loader.webp?w=196" fetchpriority="high" media="(max-width: 767px)" />
    <link rel="stylesheet" crossorigin href="/assets/index-DDD.css">
    <!-- <link rel="modulepreload" href="/src/main.tsx"> -->
  </head>
  <body>
    <div id="root"><div id="initial-loader" aria-hidden="true"><img src="/x.webp" /></div></div>
    <noscript><h1>Minerva</h1></noscript>
  </body></html>`;
const FACTS = { heroLogo: '/assets/footer-logo-H.svg', introLogo: '/assets/logo-white-I.svg', chrome: { theme: '#000000', base: '#ffffff', bottom: '#ffffff' } };

test('the built page is rewritten only where it should be, and refused if it is not as expected', async () => {
  const { rewriteIndexHtml } = await bundle('vite.prerender-page.ts');
  const out = rewriteIndexHtml(BUILT, FACTS, '<div class="frame">HERO</div>');
  assert.ok(out);
  assert.doesNotMatch(out, /<script type="module"/, 'the app is started by the page, not by the parser');
  assert.doesNotMatch(out, /<link rel="modulepreload" crossorigin/);
  assert.doesNotMatch(out, /<link rel="preload" as="image" href="\/__l5e/);
  assert.match(out, /<link rel="stylesheet" crossorigin href="\/assets\/index-DDD\.css">/, 'the stylesheet is untouched');
  assert.match(out, /<!-- <link rel="modulepreload" href="\/src\/main\.tsx"> -->/, 'comments are untouched');
  assert.match(out, /<template id="mims-home"><div class="frame">HERO<\/div><\/template>\s*<div id="root"><div id="initial-loader"/);
  assert.match(out, /<\/div><\/div>\s*<script>\(function\(\)\{var d=document,de=d\.documentElement/, 'the stamp follows #root');
  assert.match(out, /<noscript><h1>Minerva<\/h1><\/noscript>/, 'the summary for readers without JavaScript stays');
  assert.match(out, /<script>\(function\(\)\{var d=document,b=window\.__mimsBoot\|\|\{\},on=false;[\s\S]*<\/script>\s*<\/body>/);
  assert.equal(rewriteIndexHtml(BUILT.replace(/<script type="module"[^>]*><\/script>/, ''), FACTS, 'x'), null);
  assert.equal(rewriteIndexHtml(BUILT.replace(/<div id="root">[\s\S]*?<\/div><\/div>/, '<div id="root"></div>'), FACTS, 'x'), null);
});

function sandbox(path, { width = 1350, intro = null } = {}) {
  const head = [];
  const el = (tag) => ({ tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {} });
  const document = {
    head: { appendChild: (n) => head.push(n), querySelector: (sel) => head.find((n) => n.rel === 'modulepreload' && sel.includes(`"${n.href}"`)) || null },
    createElement: el,
    querySelector: () => null,
    getElementById: () => null,
    documentElement: { getAttribute: () => null, setAttribute() {} },
  };
  const window = {};
  const ctx = {
    window, document, location: { pathname: path }, innerWidth: width,
    sessionStorage: { getItem: () => intro },
    matchMedia: (q) => ({ matches: q.includes('max-width: 767px') ? width <= 767 : false }),
    requestAnimationFrame: (f) => f(0), setTimeout: (f) => f(),
  };
  window.matchMedia = ctx.matchMedia;
  vm.createContext(ctx);
  return { ctx, head, run: (src) => vm.runInContext(src, ctx) };
}

test('at every address but the homepage the app starts at once, as it always did', async () => {
  const { pageScripts } = await bundle('vite.prerender-page.ts');
  const s = pageScripts(FACTS, '/assets/index-AAA.js', ['/assets/vendor-react-BBB.js'], ['/__l5e/l.webp?w=196']);
  for (const path of ['/about', '/workspace/dashboard', '/archive/a-report', '/index.html']) {
    const box = sandbox(path, { width: 390 });
    box.run(s.head);
    assert.equal(box.ctx.window.__mimsBoot.home, false, path);
    assert.deepEqual(box.head.filter((n) => n.rel === 'modulepreload').map((n) => n.href), ['/assets/index-AAA.js', '/assets/vendor-react-BBB.js'], `${path}: scripts preloaded from the head`);
    assert.deepEqual(box.head.filter((n) => n.as === 'image').map((n) => n.href), ['/__l5e/l.webp?w=196'], `${path}: the phone loader mark`);
    box.run(s.stamp);
    assert.equal(box.ctx.window.__mimsBoot.stamped, undefined, `${path}: no first screen`);
    box.run(s.boot);
    const scripts = box.head.filter((n) => n.tag === 'script');
    assert.equal(scripts.length, 1, `${path}: the app is started once`);
    assert.equal(scripts[0].src, '/assets/index-AAA.js');
    assert.equal(scripts[0].type, 'module');
    assert.equal(box.head.filter((n) => n.rel === 'modulepreload').length, 2, `${path}: no script fetched twice`);
  }
  const desk = sandbox('/about', { width: 1350 });
  desk.run(s.head);
  assert.equal(desk.head.filter((n) => n.as === 'image').length, 0, 'no loader mark preloaded on a computer');
});

test('on the homepage the head preloads its logo, and the intro\'s only on a phone\'s first visit', async () => {
  const { pageScripts } = await bundle('vite.prerender-page.ts');
  const s = pageScripts(FACTS, '/assets/index-AAA.js', ['/assets/vendor-react-BBB.js'], ['/__l5e/l.webp?w=196']);
  const images = (opts) => { const box = sandbox('/', opts); box.run(s.head); assert.equal(box.ctx.window.__mimsBoot.home, true); assert.equal(box.head.filter((n) => n.rel === 'modulepreload').length, 0, 'no script before the first screen'); return box.head.map((n) => n.href); };
  assert.deepEqual(images({ width: 1350 }), ['/assets/footer-logo-H.svg']);
  assert.deepEqual(images({ width: 390 }), ['/assets/logo-white-I.svg', '/assets/footer-logo-H.svg']);
  assert.deepEqual(images({ width: 390, intro: '1' }), ['/assets/footer-logo-H.svg']);
  // Without its template (or with a failed stamp) the homepage starts the app at once.
  const box = sandbox('/');
  box.run(s.head);
  box.run(s.stamp);
  box.run(s.boot);
  assert.equal(box.head.filter((n) => n.tag === 'script').length, 1);
});

test('the page keeps what machines read: no first screen outside its template, no intro in the HTML', async () => {
  const { rewriteIndexHtml } = await bundle('vite.prerender-page.ts');
  const out = rewriteIndexHtml(BUILT, FACTS, '<div>HERO</div>');
  const outsideTemplate = out.replace(/<template id="mims-home">[\s\S]*?<\/template>/, '');
  assert.doesNotMatch(outsideTemplate, /HERO/);
  assert.doesNotMatch(outsideTemplate, /z-index:9999[^']*'[^<]*<img/, 'the intro is made by the script, never markup');
  assert.match(out, /home:location\.pathname==='\/'/, 'only the homepage\'s own address');
});
