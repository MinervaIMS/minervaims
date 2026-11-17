// =====================================================================
// EVENTS > ATTENDANCE AT THE DOOR (Step 106C).
// ---------------------------------------------------------------------
// Scanning tickets, ticking people and adding walk-ins must keep up with a
// queue. This test fails if:
//   * the scanner's own reader (every iPhone uses it) stops reading a
//     ticket held in a dim, grainy room, or far from the camera, or goes
//     back to spending a third of a second failing on a grainy frame;
//   * a tick on one row is again ignored while another row's tick is on
//     its way to the server (half the ticks of a busy door were lost);
//   * "Add guest as present" can again add the same guest twice, or a
//     guest whose address is already on the list fails instead of being
//     ticked;
//   * the scanner and the server stop reading a ticket the same way.
// The tickets here are drawn as the emails draw them (QR version 4,
// error correction M, four-module quiet zone, purple on white).
//
//   node --test scripts/attendance-door.test.mjs
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
const jsQR = require(join(ROOT, 'node_modules', 'jsqr')).default ?? require(join(ROOT, 'node_modules', 'jsqr'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'attendance-door-test');
mkdirSync(CACHE, { recursive: true });
const { build } = require(join(ROOT, 'node_modules', 'esbuild'));
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  await build({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent', alias: { '@': join(ROOT, 'src') }, packages: 'external',
    define: { 'import.meta.env': JSON.stringify({ DEV: false }) },
    // Only pure functions are tested here: the database client is a stub.
    plugins: [{ name: 'no-database', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
    } }],
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

// One ticket: MIMS-CHECKIN:a3f09c1d7be24e6f8c0d5a9b1e2f3c4d
const TEXT = 'MIMS-CHECKIN:a3f09c1d7be24e6f8c0d5a9b1e2f3c4d';
const ROWS = ["111111100010000100110111101111111","100000100110000010101100001000001","101110101101101100010111101011101","101110101101000000100101101011101","101110101001001111001110001011101","100000101011010000110101101000001","111111101010101010101010101111111","000000001100101011011011000000000","101111100100010010111101001111100","001011000110110101000000101001100","000100110010111111001011000101011","110100000111110001110000110101010","111100110101001110011111101011001","110101000101000100100100110100000","011100111100010110101100101011000","100100010100011101000010100100111","001100111111001101101110100011111","000001001011101110110100111101100","011101101010101010111100001111100","001001011110011100000111111111011","101111100100010100100100100001101","110001001111010110001011110110111","100100101100010001110000010001101","101000011110111010011111101110001","101100100100110011110100111110110","000000001101111001110010100010101","111111100100010111001010101010101","100000101010101001110000100011110","101110101110111110011110111111100","101110101011111101100001100000000","101110101010011110101100101001000","100000100110011101000010001100101","111111101111100111100100010110000"];
const N = ROWS.length;

/** A grey camera frame, scaled to the reader's width by averaging, as RGBA. */
function frame({ W = 800, H = 450, size = 190, angle = 0, noise = 0, light = 1, bg = 90, seed = 1 }) {
  const total = N + 8, a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const ink = Math.round(0.299 * 0x1f + 0.587 * 0x0f + 0.114 * 0x4d);
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / size, dy = (y - H / 2) / size;
    const u = ca * dx + sa * dy, v = -sa * dx + ca * dy;
    let val = bg;
    if (u >= -0.5 && u < 0.5 && v >= -0.5 && v < 0.5) {
      const mx = Math.floor((u + 0.5) * total) - 4, my = Math.floor((v + 0.5) * total) - 4;
      val = mx >= 0 && my >= 0 && mx < N && my < N && ROWS[my][mx] === '1' ? ink : 255;
    }
    const g = val * light + (noise ? (rnd() - 0.5) * 2 * noise : 0);
    const i = (y * W + x) * 4; px[i] = px[i + 1] = px[i + 2] = g; px[i + 3] = 255;
  }
  return { px, W, H };
}

test('the scanner reads a ticket in good light, far away, turned, and in a dim grainy room', async () => {
  const { decodePixels } = await load('src/lib/qr-decode.ts', 'qr');
  const cases = [
    ['held up straight', { size: 190 }],
    ['far from the camera (about 2 px a module)', { size: 72 }],
    ['turned 30 degrees', { size: 190, angle: 30 }],
    ['grain of a dim room', { size: 190, noise: 15 }],
    ['darker and grainier', { size: 190, noise: 25, light: 0.8 }],
    ['very dark', { size: 190, noise: 25, light: 0.3 }],
  ];
  for (const [label, o] of cases) {
    for (const seed of [1, 2]) {
      const { px, W, H } = frame({ ...o, seed });
      assert.equal(decodePixels(jsQR, px, W, H), TEXT, `${label} (seed ${seed})`);
    }
  }
});

test('a grainy frame with no ticket is given up quickly, so the phone does not stall', async () => {
  const { decodePixels } = await load('src/lib/qr-decode.ts', 'qr-time');
  const { px, W, H } = frame({ size: 1, noise: 25, light: 0.8 });
  decodePixels(jsQR, px, W, H); // warm up
  const times = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); assert.equal(decodePixels(jsQR, frame({ size: 1, noise: 25, light: 0.8, seed: i + 3 }).px, W, H), null); times.push(performance.now() - t0); }
  const plain = [];
  for (let i = 0; i < 5; i++) { const f = frame({ size: 1, noise: 25, light: 0.8, seed: i + 3 }); const t0 = performance.now(); jsQR(f.px, W, H, { inversionAttempts: 'dontInvert' }); plain.push(performance.now() - t0); }
  const med = (a) => [...a].sort((x, y) => x - y)[2];
  assert.ok(med(times) < med(plain), `smoothed first: ${med(times).toFixed(0)} ms against ${med(plain).toFixed(0)} ms unsmoothed`);
});

test('the scanner and the server read a ticket the same way', async () => {
  const { ticketToken } = await load('src/lib/checkin-queue.ts', 'queue');
  const server = read('supabase/functions/_shared/checkin.ts');
  assert.match(server, /export const CHECKIN_PREFIX = 'MIMS-CHECKIN:';/);
  assert.match(read('src/lib/checkin-queue.ts'), /const PREFIX = 'MIMS-CHECKIN:';/);
  assert.equal(ticketToken(TEXT), 'a3f09c1d7be24e6f8c0d5a9b1e2f3c4d');
  assert.equal(ticketToken('  mims-checkin:A3F09C1D7BE24E6F8C0D5A9B1E2F3C4D '), 'a3f09c1d7be24e6f8c0d5a9b1e2f3c4d');
  for (const bad of ['', 'https://minervaims.org', 'MIMS-CHECKIN:xyz', "MIMS-CHECKIN:' OR 1=1 --", 'a3f09c1d7be24e6f8c0d5a9b1e2f3c4']) assert.equal(ticketToken(bad), null, bad);
});

test('every row ticks on its own, and a guest is added once', () => {
  const page = read('src/components/admin/EventAttendance.tsx');
  assert.ok(!/if \(busy \|\| listClosed\) return;/.test(page), 'one tick in flight no longer blocks the others');
  assert.match(page, /pendingRef\.current\.has\(r\.id\) \|\| listClosed\) return;/, 'only the same row waits for its own tick');
  assert.match(page, /disabled=\{pending\.has\(r\.id\) \|\| listClosed\}/);
  assert.match(page, /if \(addingGuestRef\.current\) return;/, 'a second press while adding is ignored');
  assert.match(page, /disabled=\{!eventId \|\| !ext\.name\.trim\(\) \|\| addingGuest\}/);
  assert.match(page, /res\?\.already_listed/, 'the page says when the guest was already on the list');
});

test('a guest already on the list is ticked, not refused', () => {
  const fn = read('supabase/functions/admin-event-reg/index.ts');
  const at = fn.indexOf("if (action === 'add-external')");
  const block = fn.slice(at, fn.indexOf("if (action === 'members')", at));
  assert.ok(block.indexOf('listedWith()') < block.indexOf(".insert({"), 'the list is checked before inserting');
  assert.match(block, /error\.code === '23505'/, 'two phones adding the same guest at once get the same answer');
  assert.match(block, /already_listed: true/);
  assert.ok(block.indexOf('newsletter_subscribers') > block.indexOf('.insert({'), 'only a guest who was not on the list goes to the newsletter');
});
