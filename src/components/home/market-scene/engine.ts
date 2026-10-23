// =====================================================================
// The homepage scene: a camera travelling past a desk of research.
// ---------------------------------------------------------------------
// WHAT IT IS. A camera moving steadily from left to right past layers of
// material at different depths: the funds' real track records, a DCF, a
// macro monitor, the formulas of each division. Everything streams in
// from the right and away to the left, and near things pass faster than
// far ones, which is what reads as depth rather than as decoration. The
// focus moves from desk to desk every few seconds, so at any moment one
// thing is legible and the rest is atmosphere behind the logo.
//
// THE FUND LINE IS WRITTEN BY A PEN THAT STAYS PUT. As on a chart
// recorder, the pen holds its place on the screen and rises and falls
// with each month's real cumulative return, while the camera's travel
// carries the line it has written away to the left. One fund is written,
// then the other, each with its name, its dates and its figures; the
// record itself comes from fund-series.ts.
//
// WHY IT IS CHEAP. The expensive part of a picture like this is the blur,
// and blurring text every frame would be ruinous. So nothing is blurred
// per frame. Every piece is drawn ONCE into a bitmap, and two defocused
// copies are made from it at build time, at lower resolution because a
// blurred image has no detail to keep. A frame is then a list of image
// copies at fractional positions, with the focus expressed as a
// cross-fade between the sharp and soft copies. Even the fund line is
// drawn once per fund and revealed by clipping, not stroked per frame.
//
// WHAT IT COSTS, IN ORDER:
//   * nothing at all until the hero has painted (see HeroMarketBackground);
//   * a one-off build while the canvas is still invisible, TIME-SLICED:
//     each piece is painted in three separately scheduled steps (sharp,
//     soft, deep), so not even the DCF holds the main thread for its
//     whole build;
//   * then well under a millisecond of script a frame at 60 frames a
//     second; pieces are built a few seconds before they enter and
//     released once they have left, so memory holds what is on screen
//     and what is about to be, not the lot;
//   * and zero whenever the hero is scrolled out of view or the tab is
//     hidden, because the loop stops.
//
// AND IT WATCHES ITS OWN COST. A browser drawing canvases in software
// (some older Android phones, a desktop whose GPU is blocklisted) pays for
// every pixel on the main thread. So the scene measures, frame by frame,
// how long the browser takes to draw it, and steps down when that is
// more than about half of each frame: to 30 frames a second, then to a
// lower resolution, and finally to its still frame, the same composition
// no longer moving. It never disappears; see lib/perf.ts for why that
// matters on this site.
// =====================================================================

import { FORMULAS, GLYPHS, buildMacro, type FormulaTopic, type MacroRow } from './content';
import { monthLabel, type FundSeries } from './fund-series';
import {
  INK, RUN_MARGIN, candlesPainter, dcfPainter, distributionPainter, formulaPainter, fundCaptionPainter,
  glowPainter, glyphPainter, heatmapPainter, macroPainter, networkPainter, ringPainter, runPainter,
  sensitivityPainter, signedPct, yieldCurvePainter, type Painter, type RunScale,
} from './painters';
import { SANS } from './typeset';

/** Something in the hero the legible pieces must stay clear of. */
export interface Obstacle {
  /** 'header', 'logo' or 'action' (the applications button). */
  kind: string;
  /** CSS pixels, relative to the canvas's top left. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SceneOptions {
  /** False draws one composed frame and stops: reduced motion, lite browsers. */
  animate: boolean;
  /** Called once, after the first frame has actually been drawn. */
  onPainted?: () => void;
  /** Where the header, the logo and the button are, measured now. */
  obstacles?: () => Obstacle[];
  /** Elements whose resizing means the obstacles may have moved. */
  watch?: () => Element[];
}

export interface SceneHandle {
  /** Hands over the funds' records; their lines are written from then on. */
  setFunds: (series: FundSeries[]) => void;
  destroy: () => void;
}

type Variant = { c: HTMLCanvasElement; w: number; h: number };
/** The sharp bitmap and its two defocused copies. */
type SpriteSet = [Variant, Variant, Variant];

/** The four desks the focus visits, in the order it visits them. */
const PM = 0;
const ER = 1;
const MR = 2;
const QR = 3;

/** A stream of pieces at one height and one depth. */
interface Lane {
  /** Centre line, as a fraction of the stage's height. */
  y: number;
  /** Depth, 0 far to 1 near: the speed it passes at, and the drawing order. */
  z: number;
  /** Opacity out of focus, and in focus. */
  alpha: number;
  focusAlpha?: number;
  /** Defocus out of focus, and in focus: 0 sharp, 1 soft, 2 deep. */
  rest: number;
  sharp?: number;
  /** What it carries, in order, repeating. */
  ids: string[];
  /** The mean space between pieces, in CSS pixels. */
  gap: number;
  /** Where its first piece starts, as a fraction of the stage's width. */
  lead: number;
  /** Scale of its pieces against the stage's unit. */
  scale?: number;
  /** Slow rotation in radians per second, for the rings. */
  spin?: number;
  /** In focus whatever the desk (the phone's single line of mathematics). */
  always?: boolean;
  /** Fades and softens as it passes behind the logo. */
  occlude?: boolean;
}

interface Layout {
  lanes: Lane[];
  /** The fund chart's plot band and its pen, as fractions of the stage. */
  chart: { y0: number; y1: number; pen: number };
  dust: number;
}

interface Placed {
  id: string;
  /** World position of its left edge, in CSS pixels of its own depth. */
  x: number;
  w: number;
}

interface LaneState {
  lane: Lane;
  index: number;
  placed: Placed[];
  /** The next piece's sequence number, and where it will start. */
  k: number;
  next: number;
}

const TAU = Math.PI * 2;
/** One shot per desk, and the whole visit. */
const SHOT = 4.5;
const CYCLE = SHOT * 4;
/** How long a focus pull takes. */
const PULL = 1.2;
/** Seconds the pen takes to write one fund's whole record. */
const RUN_SECONDS = 20;
/** Where a still frame is taken from: the first fund's line complete. */
const STILL_T = RUN_SECONDS + 0.6;
/** How far past the right edge pieces are built, in seconds of travel. */
const AHEAD_SECONDS = 3;

const FILTER_BLUR =
  typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (v: number) => {
  const x = clamp(v, 0, 1);
  return x * x * (3 - 2 * x);
};

function surface(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Halves `src` with smoothing, the step every downscale below is made of. */
function halve(src: HTMLCanvasElement) {
  const next = surface(src.width / 2, src.height / 2);
  const g = next.getContext('2d');
  if (g) {
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, next.width, next.height);
  }
  return next;
}

/**
 * Blurs `src` into `dst`, placed at (dx, dy, dw, dh), by roughly `radius`
 * device pixels of Gaussian softness.
 *
 * `ctx.filter` does it properly where it exists. Where it does not, which
 * includes Safari and therefore every iPhone, the classic pyramid does
 * it instead: the image is halved and doubled back up with smoothing at
 * each step, each level roughly doubling the softness. Two details make
 * that close to the real thing:
 *
 *   * the source is first brought down to the copy's own resolution in
 *     halving steps too, never in one jump, which is what would otherwise
 *     turn fine lines (the candles, the rings) into blocks;
 *   * the depth of the pyramid is set so that its softness matches the
 *     Gaussian's, level for level (about 0.55px at the first level).
 */
function blurInto(dst: HTMLCanvasElement, src: HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number, radius: number) {
  const out = dst.getContext('2d');
  if (!out) return;
  if (FILTER_BLUR) {
    out.filter = `blur(${radius}px)`;
    out.drawImage(src, dx, dy, dw, dh);
    out.filter = 'none';
    return;
  }
  let scaled = src;
  while (scaled.width / 2 >= dw && scaled.height / 2 >= dh) scaled = halve(scaled);
  const base = surface(dst.width, dst.height);
  const bg = base.getContext('2d');
  if (!bg) return;
  bg.imageSmoothingQuality = 'high';
  bg.drawImage(scaled, dx, dy, dw, dh);
  const levels = Math.max(1, Math.round(Math.log2(Math.max(1.1, radius / 0.55))));
  const chain: HTMLCanvasElement[] = [base];
  for (let k = 0; k < levels && chain[chain.length - 1].width > 2; k += 1) chain.push(halve(chain[chain.length - 1]));
  let cur = chain[chain.length - 1];
  for (let k = chain.length - 2; k >= 1; k -= 1) {
    const g = chain[k].getContext('2d');
    if (!g) break;
    g.clearRect(0, 0, chain[k].width, chain[k].height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, chain[k].width, chain[k].height);
    cur = chain[k];
  }
  out.imageSmoothingQuality = 'high';
  out.drawImage(cur, 0, 0, dst.width, dst.height);
}

const BUILD_PAD = 3;

/** Paints a piece once, sharp, at `res` device pixels per CSS pixel. */
function paintSharp(p: Painter, res: number): Variant {
  const w = p.w + BUILD_PAD * 2;
  const h = p.h + BUILD_PAD * 2;
  const c = surface(w * res, h * res);
  const g = c.getContext('2d');
  if (g) {
    g.scale(res, res);
    g.translate(BUILD_PAD, BUILD_PAD);
    p.paint(g);
  }
  return { c, w, h };
}

/**
 * A defocused copy of `sharp` (painted at `from`), made at `to` device
 * pixels per CSS pixel: a blurred image has no detail to keep, so the
 * copies are made at a fraction of the screen's resolution, which is also
 * what makes them cheap to draw.
 */
function defocus(sharp: Variant, from: number, radius: number, to: number): Variant {
  const margin = radius * 2.4;
  const w = sharp.w + margin * 2;
  const h = sharp.h + margin * 2;
  const c = surface(w * to, h * to);
  blurInto(c, sharp.c, margin * to, margin * to, sharp.w * to, sharp.h * to, radius * to);
  return { c, w, h };
}

// ---------------------------------------------------------------------
// Composition. Two arrangements: a wide stage (tablets and up) and a tall
// one (phones). Heights are fractions of the dark block, depths 0 to 1;
// along the other axis nothing is fixed, because everything travels.
// ---------------------------------------------------------------------

const topicIds = (topic: FormulaTopic) => FORMULAS[topic].map((_, i) => `f:${topic}:${i}`);
const interleave = (...lists: string[][]) => {
  const out: string[] = [];
  const n = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < n; i += 1) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
};
const EXHIBITS = ['heat', 'curve', 'nn', 'dist'];
const PANELS = ['dcf', 'macro', 'sens'];
const GLYPH_IDS = GLYPHS.map((_, i) => `g:${i}`);
const ALL_FORMULAS = interleave(
  topicIds('derivatives'), topicIds('valuation'), topicIds('statistics'),
  topicIds('macro'), topicIds('ml'), topicIds('portfolio'),
);

/** The desk a piece belongs to, for the focus. */
function groupOf(id: string): number | undefined {
  if (id === 'dcf' || id === 'sens' || id.startsWith('f:valuation')) return ER;
  if (id === 'macro' || id.startsWith('f:macro')) return MR;
  if (id.startsWith('f:portfolio')) return PM;
  if (id.startsWith('f:') || EXHIBITS.includes(id)) return QR;
  return undefined;
}

/** Pieces that are only ever seen deeply out of focus. */
const deepOnly = (id: string) => id.startsWith('ring') || id.startsWith('g:') || id.startsWith('candles');

/** A stable number in [0, 1) for piece `k` of lane `i`: uneven, repeatable spacing. */
function jitter(i: number, k: number) {
  const s = Math.sin(i * 78.233 + k * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

const HEADER_FALLBACK = 84;

function headerOf(obs: Obstacle[]) {
  return obs.find((o) => o.kind === 'header')?.bottom ?? HEADER_FALLBACK;
}

/**
 * Tablets and up. Formulas pass just under the header and again along
 * the foot; the panels (the DCF, the macro monitor, the sensitivity grid)
 * pass through the middle, fading behind the logo; the funds' lines are
 * written across the lower third; exhibits and candles drift far behind,
 * rings and large symbols close to the lens.
 */
function wideLayout(obs: Obstacle[], W: number, H: number, u: number): Layout {
  const top = (headerOf(obs) + 30 * u) / H;
  return {
    chart: { y0: 0.64, y1: 0.86, pen: 0.76 },
    dust: 22,
    lanes: [
      { y: 0.64, z: 0.05, alpha: 0.24, rest: 2, ids: ['candles:0', 'candles:1'], gap: 30 * u, lead: -0.4 },
      { y: 0.34, z: 0.16, alpha: 0.22, focusAlpha: 0.4, rest: 1.7, sharp: 0.7, ids: EXHIBITS, gap: 0.42 * W, lead: -0.3 },
      { y: 0.46, z: 0.48, alpha: 0.46, focusAlpha: 0.94, rest: 1, ids: PANELS, gap: 0.26 * W, lead: -0.12, scale: 0.86, occlude: true },
      { y: top, z: 0.64, alpha: 0.42, focusAlpha: 0.94, rest: 1.1, ids: interleave(topicIds('derivatives'), topicIds('portfolio'), topicIds('statistics'), topicIds('ml')), gap: 0.2 * W, lead: -0.2, occlude: true },
      { y: 0.935, z: 0.74, alpha: 0.4, focusAlpha: 0.92, rest: 1.1, ids: interleave(topicIds('valuation'), topicIds('macro')), gap: 0.24 * W, lead: -0.05 },
      { y: 0.22, z: 0.95, alpha: 0.12, rest: 2, ids: GLYPH_IDS, gap: 0.85 * W, lead: 0.3 },
      { y: 0.07, z: 0.92, alpha: 0.24, rest: 2, ids: ['ring:l', 'ring:s'], gap: 0.75 * W, lead: 0.55, spin: 0.05 },
    ],
  };
}

/**
 * Phones, and narrow windows, where the logo and the button take most of
 * the height: the free bands between the header, the logo, the button and
 * the foot are measured, and the pieces go where there is room.
 *
 * One line of mathematics, always in focus and carrying every desk in
 * turn, streams through the first band that can hold it (above the logo
 * when the button is absent, between the logo and the button when it is
 * there). The funds' lines are written in the band at the foot. The
 * panels pass further back, out of focus, behind the logo.
 */
function tallLayout(obs: Obstacle[], W: number, H: number, u: number): Layout {
  const header = headerOf(obs);
  const blocks = obs.filter((o) => o.kind !== 'header').sort((a, b) => a.top - b.top);
  const bands: [number, number][] = [];
  let y = header;
  for (const b of blocks) {
    if (b.top > y) bands.push([y, b.top]);
    y = Math.max(y, b.bottom);
  }
  const footTop = Math.min(y, H - 90);
  // Room for a fraction at this scale, with a little air either side.
  const need = W < 560 ? 46 : 56;
  const band = bands.find(([a, b]) => b - a >= need);
  const between = !!band && band[0] > header + 1;
  // The months are set under the plot, inside the line's own bitmap.
  const plotBottom = H - (RUN_MARGIN.bottom + 2) * u;
  const plotTop = Math.min(Math.max(footTop + 36 * u, H - 160), plotBottom - 60);
  const lanes: Lane[] = [
    { y: 0.52, z: 0.16, alpha: 0.22, rest: 1.7, ids: EXHIBITS, gap: 0.5 * W, lead: -0.2 },
    { y: 0.46, z: 0.4, alpha: 0.32, rest: 1, ids: PANELS, gap: 0.35 * W, lead: -0.3, occlude: true },
  ];
  if (band) {
    lanes.push({
      y: (band[0] + band[1]) / 2 / H, z: 0.8, alpha: between ? 0.68 : 0.9, rest: 0, always: true,
      ids: ALL_FORMULAS, gap: (W < 560 ? 0.2 : 0.42) * W, lead: 0.1,
    });
  }
  lanes.push({ y: 0.9, z: 0.92, alpha: 0.2, rest: 2, ids: ['ring:l'], gap: 1.1 * W, lead: 0.72, spin: 0.05 });
  return { chart: { y0: plotTop / H, y1: plotBottom / H, pen: 0.7 }, dust: 12, lanes };
}

/** Round gridline values covering [lo, hi], as FundPerformanceChart steps them. */
function niceTicks(lo: number, hi: number, n: number): number[] {
  if (!(hi > lo)) return [lo];
  const step0 = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.2 ? 5 : norm >= 1.2 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(6)));
  }
  return out;
}

/** The scale both funds share, so the gridlines hold still as the lines change. */
function scaleFor(series: FundSeries[]): RunScale | null {
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  if (!values.length) return null;
  const lo0 = Math.min(0, ...values);
  const hi0 = Math.max(0, ...values);
  const span = Math.max(1, hi0 - lo0);
  return { lo: lo0 - span * 0.06, hi: hi0 + span * 0.08, ticks: niceTicks(lo0, hi0, 4) };
}

// ---------------------------------------------------------------------

export function startScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setFunds: () => {}, destroy: () => {} };
  const c2d: CanvasRenderingContext2D = ctx;

  let W = 0;
  let H = 0;
  /** The canvas's own resolution, in device pixels per CSS pixel. */
  let dpr = 1;
  /** The sharp bitmaps' resolution: never below 2, so text stays crisp in motion. */
  let res = 2;
  /** The resolution the defocused copies are measured against. */
  let base = 1;
  /** Type and line scale: smaller on a phone, larger on a big monitor. */
  let u = 1;
  /** The camera's speed at the focal plane, in CSS pixels a second. */
  let speed = 48;
  let kind: 'wide' | 'tall' = 'wide';
  let layout: Layout = wideLayout([], 1, 1, 1);
  /** The obstacles the current layout was made for, as a comparable key. */
  let placedKey = '';
  let logo: Obstacle | null = null;

  const cache = new Map<string, SpriteSet>();
  const partial = new Map<string, Variant[]>();
  const queue: string[] = [];
  const painters = new Map<string, Painter>();
  /** How many placed pieces show each bitmap; at zero it is released. */
  const uses = new Map<string, number>();
  /** A lane's scale, applied to the pieces it shows. */
  let scaleOf = new Map<string, number>();
  let lanes: LaneState[] = [];
  let macroRows: MacroRow[] = buildMacro();
  let headGlow: SpriteSet | null = null;
  let dustGlow: SpriteSet | null = null;
  let dust: { x: number; y: number; z: number; r: number; v: number; p: number }[] = [];

  let funds: FundSeries[] = [];
  let scale: RunScale | null = null;
  /** When the pen began the first fund's line, on the scene's clock. */
  let runStart = 0;
  /**
   * The funds' lines, drawn. Each records the resolution it was painted
   * at, because the pen reveals it by cropping its bitmap: a line built
   * after the scene has stepped down for cost is painted at 1.5x, not 2x,
   * and cropped at 2x it would run ahead of the pen.
   */
  const runs = new Map<string, { c: HTMLCanvasElement; w: number; h: number; pad: number; top: number; res: number }>();
  const captions = new Map<string, Variant>();
  /** Funds' lines waiting to be drawn into their bitmaps, one per build step. */
  const runQueue: { key: string; series: FundSeries; L: number; chh: number }[] = [];
  /**
   * The resolution new sharp bitmaps are painted at. It is `res`, until a
   * device shows that drawing the scene genuinely strains it; from then on
   * pieces arriving are painted at 1.5x, which is still sharp and costs
   * little over half as much to paint.
   */
  let paintRes = 2;

  let t = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let painted = false;
  let destroyed = false;
  let visible = true;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let frameInterval = 1000 / 60;
  /** Gaps between drawn frames, sampled once the opening is over. */
  let gaps: number[] = [];
  let lastDrawn = 0;
  /** Set when this browser could not carry the scene even at 30 a second. */
  let settled = false;
  /** 0: 60 a second; 1: 30; 2: 30 at reduced resolution. Then settled. */
  let level = 0;
  /** Set once drawing the scene has been seen to strain this device. */
  let strained = false;
  /**
   * The browser's own drawing time, frame by frame. A message posted at
   * the end of a frame is only answered once the browser has finished
   * drawing it, so the wait is what the frame cost: script, layout, and
   * on a device without a GPU canvas, every pixel of it.
   */
  let costs: number[] = [];
  let probeAt = 0;
  /** How many pacing verdicts have been reached, and frames drawn. */
  let verdicts = 0;
  let drawn = 0;
  /** The step down to 30 was for cost, not for a slow screen. */
  let cutForCost = false;
  const probe = new MessageChannel();
  probe.port1.onmessage = () => {
    if (!probeAt) return;
    costs.push(performance.now() - probeAt);
    probeAt = 0;
  };
  const pointer = { x: 0, tx: 0 };

  const parallax = (z: number) => 0.3 + 1.4 * z;
  const snap = (v: number) => Math.round(v * dpr) / dpr;

  // ---- pieces ------------------------------------------------------

  function painterFor(id: string): Painter | null {
    const known = painters.get(id);
    if (known) return known;
    const k = u * (scaleOf.get(id) ?? 1);
    let p: Painter | null = null;
    if (id === 'dcf') p = dcfPainter(k);
    else if (id === 'sens') p = sensitivityPainter(k);
    else if (id === 'macro') p = macroPainter(macroRows, k);
    else if (id === 'heat') p = heatmapPainter(k);
    else if (id === 'curve') p = yieldCurvePainter(k);
    else if (id === 'nn') p = networkPainter(k);
    else if (id === 'dist') p = distributionPainter(k);
    else if (id.startsWith('candles:')) p = candlesPainter(W * 0.62, H * 0.34, u, Number(id.slice(8)));
    else if (id === 'ring:l') p = ringPainter(150 * u, u);
    else if (id === 'ring:s') p = ringPainter(92 * u, u);
    else if (id.startsWith('f:')) {
      const [, topic, i] = id.split(':');
      const src = FORMULAS[topic as FormulaTopic]?.[Number(i)];
      if (src) p = formulaPainter(src, 17 * u, INK.light);
    } else if (id.startsWith('g:')) p = glyphPainter(GLYPHS[Number(id.slice(2))] ?? 'σ', 170 * u, INK.brand);
    if (p) painters.set(id, p);
    return p;
  }

  /** Blur radii, in CSS pixels, of the soft and deep copies. */
  const softR = () => 2.2 * u;
  const deepR = (id: string) => (deepOnly(id) ? 12 * u : 6.5 * u);

  /**
   * One step of a build. A piece is painted in three separately scheduled
   * steps (sharp, soft, deep) rather than one, so that the DCF, the
   * largest of them, never holds the main thread for its whole build. A
   * piece only ever seen deeply out of focus is painted at low resolution
   * and kept only as its deep copy.
   */
  function buildStep(id: string): boolean {
    const p = painterFor(id);
    if (!p) return true;
    if (deepOnly(id)) {
      const from = base * 0.5;
      const deep = defocus(paintSharp(p, from), from, deepR(id), base * 0.25);
      cache.set(id, [deep, deep, deep]);
      return true;
    }
    const done = partial.get(id) ?? [];
    if (done.length === 0) {
      partial.set(id, [paintSharp(p, paintRes)]);
      return false;
    }
    if (done.length === 1) {
      done.push(defocus(done[0], paintRes, softR(), base * 0.5));
      return false;
    }
    cache.set(id, [done[0], done[1], defocus(done[0], paintRes, deepR(id), base * 0.25)]);
    partial.delete(id);
    return true;
  }

  /** The whole build at once, for the one piece rebuilt outside the queue. */
  function build(id: string) {
    partial.delete(id);
    while (!buildStep(id));
  }

  function want(id: string): SpriteSet | null {
    const s = cache.get(id);
    if (s) return s;
    if (!queue.includes(id)) queue.push(id);
    return null;
  }

  function hold(id: string) {
    uses.set(id, (uses.get(id) ?? 0) + 1);
  }

  function release(id: string) {
    const n = (uses.get(id) ?? 1) - 1;
    if (n > 0) {
      uses.set(id, n);
      return;
    }
    uses.delete(id);
    cache.delete(id);
    partial.delete(id);
    const at = queue.indexOf(id);
    if (at >= 0) queue.splice(at, 1);
  }

  // ---- lanes -------------------------------------------------------

  /**
   * Pieces placed by a layout that has just been replaced. They are let
   * go only after the new layout has placed its own, so a piece on screen
   * in both keeps its bitmap and a resize never makes the scene flicker.
   */
  let stale: string[] = [];

  function resetLanes() {
    for (const st of lanes) for (const it of st.placed) stale.push(it.id);
    lanes = layout.lanes.map((lane, index) => ({ lane, index, placed: [], k: 0, next: lane.lead * W }));
  }

  function flushStale() {
    if (!stale.length) return;
    const ids = stale;
    stale = [];
    for (const id of ids) release(id);
  }

  /**
   * Keeps a lane's pieces laid out from just off the left edge to a few
   * seconds past the right: new ones are placed as the camera brings them
   * near, and the ones it has left behind are released.
   */
  function advance(st: LaneState, off: number) {
    const ahead = W + speed * parallax(st.lane.z) * AHEAD_SECONDS + 40;
    while (st.next - off < ahead) {
      const id = st.lane.ids[st.k % st.lane.ids.length];
      const p = painterFor(id);
      const w = p ? p.w : 0;
      if (p) {
        st.placed.push({ id, x: st.next, w });
        hold(id);
      }
      st.next += w + st.lane.gap * (0.7 + 0.6 * jitter(st.index, st.k));
      st.k += 1;
    }
    while (st.placed.length && st.placed[0].x + st.placed[0].w - off < -60) {
      release((st.placed.shift() as Placed).id);
    }
  }

  // ---- layout ------------------------------------------------------

  /**
   * Sizes the canvas to its box, and says whether the pieces had to be
   * rebuilt from scratch (true) or were kept (false).
   *
   * Only a change of ARRANGEMENT or of scale throws the pieces away: a
   * phone turned on its side, a window dragged across a breakpoint, a
   * move to a screen of different density. An ordinary resize keeps
   * them, so the next frame is complete rather than blank.
   */
  function measure(): boolean {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const ratio = window.devicePixelRatio || 1;
    const nextKind: typeof kind = w < 900 || w / h < 1.3 ? 'tall' : 'wide';
    const nextU = nextKind === 'tall' ? (w < 560 ? 0.72 : 0.86) : w < 1100 ? 0.82 : w < 1700 ? 1 : 1.15;
    // Sharp pieces are painted at twice the screen's resolution on an
    // ordinary monitor and at its own on a dense one, up to 3x: moving
    // type drawn from a bitmap sharper than the screen stays crisp between
    // pixels instead of shimmering.
    const nextRes = Math.min(3, Math.max(2, Math.round(ratio * 2) / 2));
    const nextBase = Math.min(2, Math.max(1, ratio));
    const full = nextKind !== kind || nextU !== u || nextRes !== res || nextBase !== base || !headGlow;
    const obs = opts.obstacles?.() ?? [];
    const key = obs.map((o) => `${o.kind}:${Math.round(o.top)}:${Math.round(o.bottom)}:${Math.round(o.left)}:${Math.round(o.right)}`).join('|');
    const moved = key !== placedKey;
    placedKey = key;
    const resized = Math.abs(w - W) > 1 || Math.abs(h - H) > 1;
    const sized = full || moved || resized;

    W = w;
    H = h;
    logo = obs.find((o) => o.kind === 'logo') ?? null;
    // The camera covers a phone's width in about ten seconds and a wide
    // monitor's in about twenty: the pace of the reference, and slow
    // enough to read a formula as it passes.
    speed = clamp(W / 20, 38, 64);
    // The canvas matches the screen's density up to 3x, within a budget of
    // about 4.5 million pixels, so a 5K monitor does not ask for a surface
    // four times the size of a phone's for a background that is, by
    // design, mostly out of focus.
    dpr = Math.max(0.75, Math.min(ratio, level >= 2 ? 1.25 : 3, Math.sqrt(4.5e6 / (w * h))));
    const bw = Math.round(W * dpr);
    const bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }

    if (full) {
      kind = nextKind;
      u = nextU;
      res = nextRes;
      base = nextBase;
      paintRes = strained ? Math.min(res, 1.5) : res;
    }
    if (sized) {
      layout = kind === 'tall' ? tallLayout(obs, W, H, u) : wideLayout(obs, W, H, u);
      // Painted back to front, so nearer pieces cover farther ones.
      layout.lanes.sort((a, b) => a.z - b.z);
      scaleOf = new Map<string, number>();
      for (const lane of layout.lanes) for (const id of lane.ids) if (lane.scale && !scaleOf.has(id)) scaleOf.set(id, lane.scale);
    }
    if (full) {
      for (const st of lanes) st.placed = [];
      lanes = [];
      stale = [];
      uses.clear();
      cache.clear();
      partial.clear();
      painters.clear();
      queue.length = 0;
      headGlow = [0, 1, 2].map(() => paintSharp(glowPainter(26 * u), res)) as SpriteSet;
      dustGlow = [0, 1, 2].map(() => paintSharp(glowPainter(10), res)) as SpriteSet;
      dust = Array.from({ length: layout.dust }, (_, i) => {
        const r = ((i * 7919) % 1000) / 1000;
        const q = ((i * 104729) % 1000) / 1000;
        return { x: r, y: q, z: 0.3 + ((i * 31) % 70) / 100, r: 0.4 + ((i * 13) % 10) / 10, v: 0.004 + q * 0.01, p: r * TAU };
      });
    }
    if (sized) {
      // Two things are sized to the stage itself: the candle strips and
      // the funds' lines. Both are rebuilt; everything else is kept.
      for (const id of [...painters.keys()]) {
        if (!id.startsWith('candles')) continue;
        painters.delete(id);
        cache.delete(id);
        partial.delete(id);
      }
      runs.clear();
      runQueue.length = 0;
      resetLanes();
    }
    return full;
  }

  // ---- drawing -----------------------------------------------------

  /**
   * How far `group` is in focus at `time`, from 0 to 1.
   *
   * Each desk has one shot of SHOT seconds per visit, and the pull in and
   * out of it takes PULL seconds, centred on the shot's edges. A still
   * frame holds everything at a gentle middle focus.
   */
  function focusOf(group: number | undefined, time: number, still: boolean) {
    if (group === undefined) return 0;
    if (still) return 0.6;
    const d = (((time - group * SHOT) % CYCLE) + CYCLE) % CYCLE;
    if (d < SHOT) return smooth((PULL / 2 + Math.min(d, SHOT - d)) / PULL);
    return smooth((PULL / 2 - Math.min(d - SHOT, CYCLE - d)) / PULL);
  }

  function blit(v: Variant, cx: number, cy: number, a: number) {
    if (a < 0.004) return;
    c2d.globalAlpha = a;
    c2d.drawImage(v.c, cx - v.w / 2, cy - v.h / 2, v.w, v.h);
  }

  /** Draws a piece at defocus `level` (0 to 2) as a cross-fade of copies. */
  function drawSet(set: SpriteSet, cx: number, cy: number, level: number, a: number) {
    const L = clamp(level, 0, 2);
    const i = Math.min(1, Math.floor(L));
    const f = L - i;
    blit(set[i], cx, cy, a * (1 - f));
    blit(set[i + 1], cx, cy, a * f);
  }

  /**
   * How far a piece `w` wide, centred at `cx`, has gone behind the logo,
   * from 0 to 1. It rises as the piece nears the logo's middle and falls
   * as it clears the far side, so the piece passes behind, not under.
   */
  function behindLogo(cx: number, w: number) {
    if (!logo) return 0;
    const half = (logo.right - logo.left) / 2;
    const d = Math.abs(cx - (logo.left + logo.right) / 2) / (half + w * 0.3);
    return smooth((1.1 - d) / 0.45);
  }

  function drawLane(st: LaneState, time: number, still: boolean, cam: number, intro: number) {
    const L = st.lane;
    const p = parallax(L.z);
    const off = cam * p;
    advance(st, off);
    const y = L.y * H;
    const shift = pointer.x * 8 * u * p;
    for (const it of st.placed) {
      const sx = it.x - off + shift;
      if (sx + it.w < -40) continue;
      const set = want(it.id);
      if (sx > W + 20 || !set) continue;
      const cx = sx + it.w / 2;
      const focus = L.always ? 1 : focusOf(groupOf(it.id), time, still);
      let level = L.rest + ((L.sharp ?? 0) - L.rest) * focus + intro * 1.3;
      let alpha = L.alpha + ((L.focusAlpha ?? L.alpha) - L.alpha) * focus;
      if (L.occlude) {
        // Behind the logo a piece dims and softens as well.
        const occ = behindLogo(cx, it.w);
        alpha *= 1 - 0.75 * occ;
        level += 0.9 * occ;
      }
      if (L.spin) {
        c2d.save();
        c2d.translate(cx, y);
        c2d.rotate(time * L.spin);
        drawSet(set, 0, 0, level, alpha);
        c2d.restore();
        continue;
      }
      drawSet(set, cx, y, level, alpha);
    }
  }

  /** The seconds between one fund's line starting and the next one's. */
  const runPeriod = () => RUN_SECONDS + Math.max(2.5, ((RUN_MARGIN.end + 50) * u) / speed);

  /**
   * One fund's whole line (see runPainter), if it has been drawn; if not,
   * it is queued, and drawn in a build step of its own rather than inside
   * whichever frame first asked for it.
   */
  function runSprite(series: FundSeries, L: number, chh: number) {
    const key = `${series.fund}:${Math.round(L)}:${Math.round(chh)}`;
    const known = runs.get(key);
    if (known) return known;
    if (!runQueue.some((q) => q.key === key)) runQueue.push({ key, series, L, chh });
    return null;
  }

  function buildRun(job: { key: string; series: FundSeries; L: number; chh: number }) {
    if (runs.has(job.key) || !scale) return;
    const p = runPainter(job.series, job.L, job.chh, scale, u);
    const v = paintSharp(p, paintRes);
    runs.set(job.key, { c: v.c, w: v.w, h: v.h, pad: p.pad + BUILD_PAD, top: p.top + BUILD_PAD, res: paintRes });
  }

  function captionSprite(series: FundSeries) {
    const known = captions.get(series.fund);
    if (known) return known;
    const v = paintSharp(fundCaptionPainter(series, u), res);
    captions.set(series.fund, v);
    return v;
  }

  /** The fixed scale behind the lines: hairlines, and their values at the right. */
  function drawGrid(y0: number, chh: number, focus: number) {
    if (!scale) return;
    const s = scale;
    const right = W - 46 * u;
    c2d.font = `400 ${8.6 * u}px ${SANS}`;
    c2d.textAlign = 'left';
    for (const v of s.ticks) {
      const y = snap(y0 + chh - ((v - s.lo) / (s.hi - s.lo)) * chh);
      c2d.globalAlpha = (v === 0 ? 0.5 : 0.2) + 0.14 * focus;
      c2d.fillStyle = v === 0 ? INK.mid : INK.low;
      c2d.fillRect(0, y, right, Math.max(1 / dpr, 0.6 * u));
      c2d.globalAlpha = 0.8;
      c2d.fillStyle = INK.low;
      c2d.fillText(`${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`, snap(right + 6 * u), snap(y + 3 * u));
    }
  }

  /** The pen: a guide to the foot, a halo, and the month it has reached. */
  function drawHead(series: FundSeries, progress: number, hx: number, y0: number, chh: number) {
    const s = scale as RunScale;
    const pts = series.points;
    const n = pts.length;
    const idx = clamp(progress, 0, 1) * (n - 1);
    const k = Math.min(n - 2, Math.floor(idx));
    const f = idx - k;
    const v = pts[k].value + (pts[k + 1].value - pts[k].value) * f;
    const hy = y0 + chh - ((v - s.lo) / (s.hi - s.lo)) * chh;

    c2d.globalAlpha = 0.3;
    c2d.fillStyle = INK.brand;
    for (let y = hy + 8 * u; y < y0 + chh; y += 5 * u) c2d.fillRect(hx - 0.5, y, 1, 2 * u);
    if (headGlow) blit(headGlow[0], hx, hy, 0.95);
    c2d.globalAlpha = 1;
    c2d.fillStyle = INK.hi;
    c2d.beginPath();
    c2d.arc(hx, hy, 2.4 * u, 0, TAU);
    c2d.fill();

    // The label names the last month the pen has reached, so its figures
    // step once a month, as the record does, rather than flickering
    // through values nobody published.
    const p = pts[Math.min(n - 1, Math.floor(idx + 1e-6))];
    const lx = snap(hx + 10 * u);
    const ly = snap(hy - 4 * u);
    c2d.textAlign = 'left';
    c2d.lineJoin = 'round';
    c2d.strokeStyle = 'rgba(4, 3, 12, 0.92)';
    c2d.lineWidth = 3.2 * u;
    c2d.font = `700 ${11 * u}px ${SANS}`;
    const value = signedPct(p.value);
    c2d.strokeText(value, lx, ly);
    c2d.fillStyle = INK.hi;
    c2d.fillText(value, lx, ly);
    c2d.font = `400 ${8.6 * u}px ${SANS}`;
    const detail = `${series.short} · ${monthLabel(p)}`;
    c2d.strokeText(detail, lx, ly + 13 * u);
    c2d.fillStyle = INK.brand;
    c2d.fillText(detail, lx, ly + 13 * u);
  }

  /**
   * The funds' lines. The pen stays at `pen` across the stage; run `r`
   * began there at runStart + r * runPeriod(), and everything it has
   * written since has travelled left with the camera. So a line's
   * position is a matter of time, not of stored state, and a resize never
   * makes it jump.
   */
  function drawChart(time: number, still: boolean) {
    if (!funds.length || !scale) return;
    const ch = layout.chart;
    const y0 = ch.y0 * H;
    const chh = (ch.y1 - ch.y0) * H;
    const penX = ch.pen * W + pointer.x * 8 * u;
    drawGrid(y0, chh, focusOf(PM, time, still));
    const L = speed * RUN_SECONDS;
    const period = runPeriod();
    const now = still ? STILL_T : time;
    const latest = Math.floor((now - runStart) / period);
    for (let r = Math.max(0, latest - 2); r <= latest; r += 1) {
      const began = runStart + r * period;
      const age = now - began;
      if (age < 0) continue;
      const series = funds[r % funds.length];
      // The next fund's line is drawn while this one is still being
      // written, so it is ready the moment the pen reaches it.
      if (r === latest && age > RUN_SECONDS * 0.3) runSprite(funds[(r + 1) % funds.length], L, chh);
      const sprite = runSprite(series, L, chh);
      if (!sprite) continue;
      const startX = penX - age * speed;
      if (startX + sprite.w < -20) continue;
      const done = age >= RUN_SECONDS;
      // Everything the pen has passed, and nothing beyond it; once the
      // line is complete, its end label as well.
      const shown = done ? sprite.w : Math.min(sprite.w, sprite.pad + age * speed);
      c2d.globalAlpha = 1;
      c2d.drawImage(sprite.c, 0, 0, Math.min(sprite.c.width, shown * sprite.res), sprite.c.height, startX - sprite.pad, y0 - sprite.top, shown, sprite.h);
      const cap = captionSprite(series);
      if (startX + cap.w > -20) {
        const capX = startX - BUILD_PAD;
        const capY = y0 - sprite.top - cap.h + 4 * u;
        // On a wide screen the caption rides level with the foot of the
        // logo, so it dims as it passes behind it, as the panels do.
        const occ = logo && capY < logo.bottom && capY + cap.h > logo.top ? behindLogo(capX + cap.w / 2, cap.w) : 0;
        c2d.globalAlpha = 0.9 * (1 - 0.85 * occ);
        c2d.drawImage(cap.c, capX, capY, cap.w, cap.h);
      }
      if (!done) drawHead(series, age / RUN_SECONDS, penX, y0, chh);
    }
  }

  function drawDust(time: number, still: boolean, cam: number) {
    if (!dustGlow) return;
    const v = dustGlow[0];
    const span = W * 1.2;
    for (const d of dust) {
      const p = parallax(d.z);
      const x = ((((d.x * span - cam * p) % span) + span) % span) - W * 0.1;
      const y = (((d.y - (still ? 0 : time * d.v)) % 1) + 1) % 1;
      const tw = 0.55 + 0.45 * Math.sin(time * 0.7 + d.p * 3);
      const size = (v.w * d.r * (0.6 + d.z)) / 2;
      c2d.globalAlpha = 0.28 * tw * d.z;
      c2d.drawImage(v.c, x - size / 2, y * H - size / 2, size, size);
    }
  }

  function render(time: number, still: boolean) {
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2d.globalAlpha = 1;
    c2d.clearRect(0, 0, W, H);
    const cam = speed * time;
    const intro = still ? 0 : clamp(1 - time / 2.4, 0, 1);
    let chartDone = false;
    for (const st of lanes) {
      if (!chartDone && st.lane.z > 0.5) {
        drawChart(time, still);
        chartDone = true;
      }
      drawLane(st, time, still, cam, intro);
    }
    flushStale();
    if (!chartDone) drawChart(time, still);
    drawDust(time, still, cam);
    c2d.globalAlpha = 1;
  }

  // ---- the loop ----------------------------------------------------

  /** Builds queued pieces for up to `budget` ms, and says whether any remain. */
  function drain(budget: number) {
    const start = performance.now();
    while (runQueue.length && performance.now() - start < budget) buildRun(runQueue.shift() as (typeof runQueue)[number]);
    while (queue.length && performance.now() - start < budget) {
      const id = queue[0];
      if (cache.has(id) || buildStep(id)) queue.shift();
    }
    return queue.length > 0 || runQueue.length > 0;
  }

  /** Queues every piece the frame at `time` will show, without drawing. */
  function need(time: number) {
    const cam = speed * time;
    for (const st of lanes) {
      const off = cam * parallax(st.lane.z);
      advance(st, off);
      for (const it of st.placed) {
        const sx = it.x - off;
        if (sx < W + 20 && sx + it.w > -40) want(it.id);
      }
    }
    flushStale();
    if (funds.length && scale) {
      const ch = layout.chart;
      const period = runPeriod();
      const r = Math.max(0, Math.floor((time - runStart) / period));
      for (const k of [r - 1, r]) {
        if (k >= 0) runSprite(funds[k % funds.length], speed * RUN_SECONDS, (ch.y1 - ch.y0) * H);
      }
    }
  }

  /**
   * Gets a frame ready before it is shown: works out what the frame at
   * `time` needs, builds it a slice at a time, and only then draws it.
   *
   * At the opening the canvas is still at opacity 0 throughout, so a slow
   * build shows the CSS ground rather than a half-assembled scene. When
   * the scene settles on its still frame, the last moving frame stays on
   * screen until the still one is complete, so pieces never pop in one by
   * one.
   */
  function prepare(time: number, still: boolean, then: () => void) {
    need(time);
    const step = () => {
      if (destroyed) return;
      if (drain(8)) {
        raf = requestAnimationFrame(step);
        return;
      }
      render(time, still);
      then();
    };
    raf = requestAnimationFrame(step);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    // At 60, a frame is skipped only when it comes well inside the
    // interval, so the cap holds on a 120 or 144Hz screen while a 75Hz
    // one, whose frames arrive every 13ms, still draws every frame it
    // offers. At 30 the cap is strict, because stepping down to 30 is only
    // worth anything if it really halves the work.
    if (dt < (frameInterval < 20 ? frameInterval * 0.75 : frameInterval - 4)) return;
    last = now;
    // A long gap (a stalled tab, a debugger) advances the story by one
    // frame, not by the length of the gap.
    t += Math.min(dt, 100) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.03;
    drain(4);
    const began = performance.now();
    render(t, false);
    tickMacro();
    drawn += 1;
    // The first few frames carry one-off work (bitmaps reaching the GPU)
    // and say nothing about what a frame costs from then on.
    if (drawn > 3 && !probeAt) {
      probeAt = began;
      probe.port2.postMessage(0);
    }
    pace(now);
  }

  /**
   * Two questions, asked of every sixty frames: are frames arriving at
   * the rate asked for, and how long is the browser taking to draw each
   * one? The answer picks a level, directly rather than a step at a time:
   *
   *   * cheap and on time: 60 frames a second, at full resolution;
   *   * late but cheap, a screen that refreshes slowly (iOS in Low Power
   *     Mode caps pages at 30): 30, the rate it was already showing, at
   *     full resolution;
   *   * more than about half of a 60th of a second to draw: 30;
   *   * more than about half of a 30th: 30 at a lower resolution at once,
   *     because at that cost every frame would still be a long task at
   *     30, and only fewer pixels makes each one cheaper;
   *   * still that expensive at the lower resolution: the still frame.
   *
   * THE FIRST VERDICT COMES FAST, after six frames, and on cost alone, so
   * a device that cannot carry the scene is not asked to for more than a
   * tenth of a second. It takes the MEDIAN of those six: the page's own
   * start-up work (the sections below mounting, a chart drawing itself)
   * lands as a few expensive frames, while a device that cannot carry
   * the scene is slow on every one. It is still allowed to be wrong: a
   * device stepped down for its cost that then draws the scene cheaply
   * goes back to 60 at full resolution. Lateness, which start-up jank
   * imitates, is only ever judged over full windows.
   *
   * Both are judged on the mean with the slowest tenth left out, so the
   * odd late frame (a garbage collection, a tab switch) changes nothing,
   * while a browser that misses every other frame cannot hide behind the
   * frames it makes.
   */
  function pace(now: number) {
    if (lastDrawn && drawn > 3) gaps.push(now - lastDrawn);
    lastDrawn = now;
    const first = verdicts === 0;
    if (first ? costs.length < 6 : gaps.length < 60) return;
    verdicts += 1;
    const typical = (xs: number[]) => {
      const kept = [...xs].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(xs.length * 0.9)));
      return kept.reduce((sum, x) => sum + x, 0) / kept.length;
    };
    const late = !first && typical(gaps) > frameInterval * 1.12;
    const median = (xs: number[]) => {
      const sorted = [...xs].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const cost = costs.length > 3 ? (first ? median(costs) : typical(costs)) : 0;
    gaps = [];
    costs = [];
    const heavy60 = cost > (1000 / 60) * 0.55;
    const heavy30 = cost > (1000 / 30) * 0.55;

    if (cutForCost && level > 0 && !late && cost > 0 && cost < (1000 / 60) * 0.25) {
      toLevel(0);
      cutForCost = false;
      strained = false;
      paintRes = res;
      return;
    }
    if (heavy60 && !strained) {
      strained = true;
      paintRes = Math.min(res, 1.5);
    }
    if (heavy30) {
      if (level < 2) {
        cutForCost = true;
        toLevel(2);
        return;
      }
      settled = true;
      sync();
      // The composition the reduced-motion frame shows, the first fund's
      // line complete, rather than wherever the pen happened to be.
      runStart = STILL_T - RUN_SECONDS;
      prepare(STILL_T, true, () => {});
      return;
    }
    if (level === 0 && (heavy60 || late)) {
      cutForCost = heavy60 && !late;
      toLevel(1);
    }
  }

  /** Moves to a level, redrawing at once if the resolution changes. */
  function toLevel(next: number) {
    const resize = (next >= 2) !== (level >= 2);
    level = next;
    frameInterval = 1000 / (next === 0 ? 60 : 30);
    if (resize) {
      // Same pieces, a different number of pixels: redrawn in this task,
      // so the resized canvas is never presented blank.
      measure();
      render(t, false);
    }
  }

  let nextTick = 6;
  /** Market prices move now and then; data releases never do. */
  function tickMacro() {
    if (t < nextTick) return;
    nextTick = t + 4.5 + ((t * 1000) % 3);
    const movers = macroRows.filter((r) => r.tick);
    const row = movers[Math.floor(t * 10) % movers.length];
    const dir = Math.sin(t * 12.9898) > 0 ? 1 : -1;
    macroRows = macroRows.map((r) =>
      r === row && r.tick ? { ...r, value: r.value + dir * r.tick, history: [...r.history.slice(1), r.value + dir * r.tick] } : r,
    );
    painters.delete('macro');
    if (cache.has('macro')) build('macro');
  }

  function shouldRun() {
    return opts.animate && !settled && painted && visible && document.visibilityState === 'visible' && !destroyed;
  }

  function sync() {
    if (shouldRun() && !running) {
      running = true;
      last = performance.now();
      // A pause is not a slow frame: the pace is measured afresh.
      lastDrawn = 0;
      gaps = [];
      costs = [];
      probeAt = 0;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun() && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  // ---- the funds ---------------------------------------------------

  /**
   * The records arrive from the table (fund-series.ts), usually before
   * the first frame and otherwise a moment into the opening. If they are
   * here from the start, the pen is already a few seconds into the first
   * fund, so the opening frame has a line in it; if they arrive later, it
   * starts writing the moment they do. A still frame shows the first
   * fund's line complete.
   */
  function setFunds(series: FundSeries[]) {
    if (destroyed) return;
    funds = series;
    scale = scaleFor(series);
    runs.clear();
    runQueue.length = 0;
    captions.clear();
    const still = !opts.animate || settled;
    if (still) runStart = STILL_T - RUN_SECONDS;
    else runStart = painted ? t : t - 6;
    if (painted && still) prepare(STILL_T, true, () => {});
  }

  // ---- wiring ------------------------------------------------------

  let resizeTimer = 0;
  /** A resize that arrived during the opening build, handled after it. */
  let deferred = false;
  function relayout() {
    if (destroyed) return;
    if (!painted) {
      deferred = true;
      return;
    }
    const still = !opts.animate || settled;
    const time = still ? STILL_T : t;
    if (!measure()) {
      // Same pieces, new stage: laid out again and redrawn in this same
      // task, so the cleared canvas is never presented. In motion, anything
      // that did not fit in the time is built by the frames that follow; a
      // still frame has no frames following, so it finishes the build and
      // draws itself once more.
      need(time);
      const more = drain(12);
      render(time, still);
      if (more && still) prepare(time, still, () => {});
      return;
    }
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    prepare(time, still, () => sync());
  }
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, 150);
  });
  ro.observe(canvas);
  // The applications button can arrive after the hero has painted, and
  // moves the logo up when it does; the content's box changing size is
  // the signal to measure again.
  for (const el of opts.watch?.() ?? []) ro.observe(el);

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  });
  io.observe(canvas);

  const onVisibility = () => sync();
  document.addEventListener('visibilitychange', onVisibility);

  const onPointer = (e: PointerEvent) => {
    pointer.tx = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
  };
  if (fine && opts.animate) window.addEventListener('pointermove', onPointer, { passive: true });

  measure();
  prepare(opts.animate ? 0 : STILL_T, !opts.animate, () => {
    painted = true;
    opts.onPainted?.();
    sync();
    if (deferred) {
      deferred = false;
      relayout();
    }
  });

  return {
    setFunds,
    destroy: () => {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      probe.port1.onmessage = null;
      probe.port1.close();
      probe.port2.close();
      cache.clear();
      runs.clear();
      runQueue.length = 0;
    },
  };
}
