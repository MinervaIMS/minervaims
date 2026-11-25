#!/usr/bin/env node
// =====================================================================
// THE SHARING PICTURES, MADE ONCE (Step 109).
// ---------------------------------------------------------------------
//   node scripts/make-share-images.mjs [key ...]
//
// Writes public/share/<key>.jpg for every card in src/lib/seo/share-cards.ts
// (or only the keys given): 1200 by 630, the page's own hero photograph
// (or its moving background, or its plain white or black ground), the
// seal, the page's name and "Minerva
// Investment Management Society", all inside the middle 630 by 630 square
// (what a chat shows when it crops the picture square): the title is set
// at the largest size that fits there, and a card that does not fit is
// refused.
//
// It is run by hand when a card is added or a page's photograph changes,
// never by the build: the pictures are files like any other in public/,
// so the site's build needs no browser and no image library, and a link
// preview never waits for a picture to be drawn.
//
// It needs Playwright (with its Chromium) and the network: the
// photographs are read from the live site's hosted assets, at the width
// the card needs, and the type from Google Fonts, the site's own two
// faces (EB Garamond and Carlito).
// =====================================================================

import { mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SHARE_PHOTO_ORIGIN || 'https://minervaims.org';
const OUT = join(ROOT, 'public/share');

async function loadCards() {
  const outfile = join(ROOT, 'node_modules/.mims-share-cards.mjs');
  await build({ entryPoints: [join(ROOT, 'src/lib/seo/share-cards.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' });
  const m = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
  rmSync(outfile, { force: true });
  return m;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function photoUrl(assetFile) {
  const rec = JSON.parse(readFileSync(join(ROOT, 'src/assets', assetFile), 'utf8'));
  return `${SITE}${rec.url}?w=1600`;
}

/** The middle square every piece must fit in: what a chat crops to. */
const SAFE = 560;

// =====================================================================
// THE PAGES' OWN MOVING BACKGROUNDS. The homepage's market scene, the
// Join page's field of dots and the stage of beams under every event
// registration and form are drawn live on the page, so they are captured
// from the live site, a few seconds in: the header, the cookie notice and
// the page's own words are hidden, leaving the ground alone, which the
// card then sets the seal and the title on. Captured at the card's size
// and kept only as the card's background.
// =====================================================================
const SCENES = {
  // The homepage is its own first screen, seal and all: only the
  // applications button (which comes and goes) is hidden.
  home: { path: '/', viewport: { width: 1200, height: 1100 }, area: '[data-hero-keepout="logo"]', hide: '[data-hero-keepout="action"]', wait: 7000, centre: true },
  join: { path: '/join', viewport: { width: 1200, height: 1100 }, area: '[data-page-hero]', hide: '[data-page-hero] > :not(:first-child)', wait: 7000 },
  // Any registration address draws the stage; one for no event shows the
  // stage with nothing on it but a short card, which is hidden.
  stage: { path: '/events/00000000-0000-0000-0000-000000000000/register', viewport: { width: 1200, height: 900 }, area: 'main, #root', hide: '.z-\\[55\\]', wait: 6000 },
};

async function captureScene(browser, name) {
  const sc = SCENES[name];
  const page = await browser.newPage({ viewport: sc.viewport, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    try { localStorage.setItem('mims-cookie-consent', JSON.stringify({ preferences: false, analytics: false, media: false })); } catch { /* the notice is hidden below too */ }
  });
  await page.goto(`${SITE}${sc.path}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => undefined);
  await page.addStyleTag({ content: `html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; } header, .ck-banner { display: none !important; } ${sc.hide} { visibility: hidden !important; }` });
  await page.waitForTimeout(sc.wait);
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel.split(',')[0].trim()) || document.querySelector(sel.split(',').pop().trim());
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, sc.area);
  // The card's 1200 by 630: centred on the seal (the homepage), or from
  // the middle of the ground.
  const y = sc.centre
    ? Math.max(0, Math.round(box.y + box.height / 2 - 315))
    : Math.max(0, Math.round(box.y + (Math.min(box.height, sc.viewport.height) - 630) / 2));
  const shot = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 0, y, width: 1200, height: 630 } });
  await page.close();
  return `data:image/jpeg;base64,${shot.toString('base64')}`;
}

function cardHtml(c, seal, scenes, sealColour) {
  // The homepage's card is its first screen as it is, with nothing added.
  if (c.scene === 'home') {
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}img{display:block;width:1200px;height:630px}</style></head>`
      + `<body><div class="card" style="position:relative;width:1200px;height:630px"><img src="${scenes.home}" alt=""><div class="col"><div id="t" style="display:none">${esc(c.title)}</div></div></div></body></html>`;
  }
  const white = !c.photo && !c.scene && c.ground === 'white';
  if (!c.photo && !c.scene && !c.ground) throw new Error(`${c.key}: a card needs a photograph, a scene or a ground`);
  const photo = c.scene
    ? `<img class="photo scene" src="${scenes[c.scene]}" alt="">`
    : c.photo ? `<img class="photo" src="${esc(photoUrl(c.photo))}" alt="">` : '';
  const home = c.key === 'home';
  const foot = c.foot === 'none' ? ''
    : `<div class="rule"></div><div class="foot">Minerva Investment Management Society</div>${c.foot === 'workspace' ? '<div class="sub">Workspace</div>' : ''}`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Carlito:wght@400;700&display=block" rel="stylesheet">
<style>
  html,body{margin:0;padding:0}
  .card{position:relative;width:1200px;height:630px;overflow:hidden;background:${white ? '#FFFFFF' : '#05030F'};color:${white ? '#1B0F4D' : '#fff'};font-family:Carlito,Calibri,Arial,sans-serif}
  .photo{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);object-fit:cover;filter:saturate(0.85) blur(1.6px)}
  .photo.scene{inset:0;width:100%;height:100%;filter:none}
  .veil{position:absolute;inset:0;background:${c.scene
    ? 'radial-gradient(60% 75% at 50% 50%,rgba(5,3,15,.55) 0%,rgba(5,3,15,.2) 70%,rgba(5,3,15,.35) 100%)'
    : c.photo
    ? 'linear-gradient(180deg,rgba(12,7,36,.62) 0%,rgba(20,11,60,.74) 45%,rgba(12,7,36,.90) 100%)'
    // No photograph and no scene: the page's own plain ground, never a
    // coloured field. White as the Statute and the legal pages are, or
    // the near-black of the Track Record and the Application Form.
    : white ? '#FFFFFF' : '#05030F'}}
  .calm{position:absolute;inset:0;background:radial-gradient(42% 70% at 50% 52%,rgba(12,7,36,.6) 0%,rgba(12,7,36,0) 100%)}
  .frame{position:absolute;inset:22px;border:1px solid ${white ? '#D9D9D9' : 'rgba(255,255,255,.22)'}}
  .col{position:absolute;top:0;bottom:0;left:50%;width:${SAFE}px;margin-left:-${SAFE / 2}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .seal{width:${home ? 220 : 150}px;height:${home ? 220 : 150}px;margin-bottom:${home ? 26 : 22}px;flex:none}
  .title{font-family:'EB Garamond','Times New Roman',serif;font-weight:500;line-height:1.04;letter-spacing:-.005em;max-width:${SAFE}px;text-wrap:balance;overflow-wrap:break-word}
  .rule{width:64px;height:1px;background:${white ? 'rgba(27,15,77,.45)' : 'rgba(255,255,255,.55)'};margin:24px 0 18px;flex:none}
  .foot{font-size:20px;letter-spacing:.15em;text-transform:uppercase;color:${white ? '#3E3E3E' : 'rgba(255,255,255,.88)'};white-space:nowrap}
  .sub{margin-top:8px;font-size:15px;letter-spacing:.22em;text-transform:uppercase;color:${white ? '#6B6B6B' : '#C9C1EA'}}
</style></head><body>
<div class="card">${photo}<div class="veil"></div>${c.photo && !c.scene ? '<div class="calm"></div>' : ''}<div class="frame"></div>
<div class="col">
  <img class="seal" src="${white ? sealColour : seal}" alt="">
  <div class="title" id="t">${esc(c.title)}</div>
  ${foot}
</div></div></body></html>`;
}

/**
 * The title at the largest size at which it fits the middle square in at
 * most three lines (two for a short one), never wider than the square.
 */
async function fitTitle(page, home) {
  if (home) return { size: 0, inSquare: true };
  return page.evaluate(({ start, safe }) => {
    const t = document.getElementById('t');
    const words = t.textContent.split(/\s+/).length;
    const maxLines = words <= 2 ? 2 : 3;
    let size = start;
    for (;;) {
      t.style.fontSize = `${size}px`;
      const lines = Math.round(t.getBoundingClientRect().height / (size * 1.04));
      const widest = Math.max(...[...t.getClientRects()].map((r) => r.width), t.scrollWidth);
      if ((lines <= maxLines && widest <= safe) || size <= 40) break;
      size -= 2;
    }
    const col = document.querySelector('.col').getBoundingClientRect();
    const kids = [...document.querySelector('.col').children].map((k) => k.getBoundingClientRect());
    const left = Math.min(...kids.map((r) => r.left));
    const right = Math.max(...kids.map((r) => r.right));
    const top = Math.min(...kids.map((r) => r.top));
    const bottom = Math.max(...kids.map((r) => r.bottom));
    return { size, inSquare: left >= 600 - 315 && right <= 600 + 315 && top >= 0 && bottom <= 630, col: col.width };
  }, { start: home ? 66 : 84, safe: SAFE });
}

async function main() {
  // Required rather than imported: a globally installed Playwright is
  // found by require's search path, not by import's.
  const { chromium } = createRequire(import.meta.url)('playwright');
  const { SHARE_CARDS, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT } = await loadCards();
  const only = new Set(process.argv.slice(2));
  const cards = SHARE_CARDS.filter((c) => !only.size || only.has(c.key));
  const seal = `data:image/svg+xml;base64,${readFileSync(join(ROOT, 'src/assets/footer-logo.svg')).toString('base64')}`;
  // On a white ground, the seal in the Society's purple, as the legal pages show it.
  const sealColour = `data:image/svg+xml;base64,${readFileSync(join(ROOT, 'src/assets/full-logo-color-mark.svg')).toString('base64')}`;
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT }, deviceScaleFactor: 1 });
  const scenes = {};
  for (const name of new Set(cards.map((c) => c.scene).filter(Boolean))) scenes[name] = await captureScene(browser, name);
  for (const c of cards) {
    await page.setContent(cardHtml(c, seal, scenes, sealColour), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    if (!ok) throw new Error(`${c.key}: a picture did not load`);
    const fit = await fitTitle(page, c.key === 'home');
    if (!fit.inSquare) throw new Error(`${c.key}: does not fit the middle square`);
    const file = join(OUT, `${c.key}.jpg`);
    writeFileSync(file, await page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT } }));
    console.log(`${c.key}.jpg ${Math.round(statSync(file).size / 1024)} kB, title ${fit.size}px`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
