// =====================================================================
// The scenes: a camera travelling past a desk of research (Step 93B).
// ---------------------------------------------------------------------
// WHAT IT IS. A camera moving steadily from left to right past layers of
// material at different depths: each page's formulas and exhibits, taken
// from its own latest reports (content.ts, exhibits.ts), and on the
// homepage the market monitor and both funds' official lines. Everything
// streams in from the right and away to the left, and near things pass
// faster than far ones, which is what reads as depth rather than as
// decoration. The focus moves from desk to desk every few seconds through
// five steps of blur, so at any moment one thing is legible and the rest
// is atmosphere behind the logo or the page title.
//
// PRECISION, NOT DECORATION. The high-frequency feel comes from things
// that move and never from figures that change: a scan head sweeping the
// funds' record, a tape of prints racing past, a ruler's graduations.
// The only figures drawn are official, final and fixed (painters.ts).
//
// TWO FORMS. 'hero': the homepage, laid out around the logo and the
// applications button. 'band': the top of a division or fund page, a
// shallower strip laid out above and below the page title.
//
// WHY IT IS CHEAP. Nothing is blurred per frame. Every piece is drawn
// ONCE into a bitmap, and four defocused copies are made from it at build
// time, at falling resolutions because a blurred image has no detail to
// keep. A frame is then a list of image copies at fractional positions,
// the focus a cross-fade between neighbouring copies.
//
// WHAT IT COSTS, IN ORDER:
//   * nothing at all until the page has painted (see HeroMarketBackground);
//   * a one-off build while the canvas is still invisible, TIME-SLICED:
//     each piece is painted in separately scheduled steps (sharp, then
//     each defocused copy), so no piece holds the main thread for its
//     whole build;
//   * then well under a millisecond of script a frame; pieces are built a
//     few seconds before they enter and released once they have left;
//   * and zero whenever the scene is scrolled out of view or the tab is
//     hidden, because the loop stops.
//
// AND IT WATCHES ITS OWN COST. A browser drawing canvases in software
// pays for every pixel on the main thread. So the scene measures, frame by
// frame, how long the browser takes to draw it, and steps down when that
// is more than about half of each frame: to 30 frames a second, then to a
// lower resolution, and finally to its still frame, the same composition
// no longer moving. It never disappears; see lib/perf.ts.
// =====================================================================

import { DESKS, MR, SCENES, type Desk, type SceneKey } from './content';
import { EXHIBITS } from './exhibits';
import {
  INK, formulaPainter, fundsChartPainter, monitorPainter,
  type ChartGeometry, type MonitorRow, type Painter, type SceneFigures,
} from './painters';

/** Something the legible pieces must stay clear of. */
export interface Obstacle {
  /** 'header', 'logo', 'action' (the applications button), 'title' or 'ticker'. */
  kind: string;
  /** CSS pixels, relative to the canvas's top left. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SceneOptions {
  /** Which page's material: 'home', or a division's or fund's. */
  scene: SceneKey;
  /** The homepage hero, or the band at the top of a division or fund page. */
  form: 'hero' | 'band';
  /** False draws one composed frame and stops: reduced motion, lite browsers. */
  animate: boolean;
  /** Called once, after the first frame has actually been drawn. */
  onPainted?: () => void;
  /** Where the header, the logo or title and the button are, measured now. */
  obstacles?: () => Obstacle[];
  /** Elements whose resizing means the obstacles may have moved. */
  watch?: () => Element[];
}

export interface SceneHandle {
  /** Hands over the official figures (homepage only); drawn from then on. */
  setFigures: (figures: SceneFigures) => void;
  destroy: () => void;
}

type Variant = { c: HTMLCanvasElement; w: number; h: number };
/** The sharp bitmap and its four defocused copies. */
type SpriteSet = Variant[];

/** Blur radii of the five focus steps, in CSS pixels at u = 1. */
const RADII = [0, 1.1, 2.4, 4.2, 7];
const DEEPEST = RADII.length - 1;

/** A stream of pieces at one height and one depth. */
interface Lane {
  /** Centre line, as a fraction of the stage's height. */
  y: number;
  /** Depth, 0 far to 1 near: the speed it passes at, and the drawing order. */
  z: number;
  /** Opacity out of focus, and in focus. */
  alpha: number;
  focusAlpha?: number;
  /** Focus step out of focus, and in focus: 0 sharp to 4 deepest. */
  rest: number;
  sharp?: number;
  /** What it carries, in order, repeating. */
  ids: string[];
  /** The mean space between pieces, in CSS pixels. */
  gap: number;
  /** Where its first piece starts, as a fraction of the stage's width. */
  lead: number;
  /** In focus whatever the desk (the phone's single line of mathematics). */
  always?: boolean;
  /** Fades and softens as it passes behind the logo or the title. */
  occlude?: boolean;
  /** Its formulas set a size smaller (the strip above a page's title). */
  small?: boolean;
}

interface Layout {
  lanes: Lane[];
  /** Focus by position (a page's band) rather than by desk (the homepage). */
  focalPlane?: boolean;
  /** The funds' chart, fixed in the stage, if this form has one. */
  chart: { x: number; y: number; w: number; h: number } | null;
  /** Where the tape of prints runs, and the ruler, in CSS pixels. */
  tape: { x0: number; x1: number; y: number };
  ruler: { x0: number; x1: number; y: number };
}

interface Placed {
  id: string;
  /** World position of its left edge, in CSS pixels of its own depth. */
  x: number;
  w: number;
  /** Its desk, for the focus. */
  desk: Desk | undefined;
}

interface LaneState {
  lane: Lane;
  index: number;
  placed: Placed[];
  /** The next piece's sequence number, and where it will start. */
  k: number;
  next: number;
}

/** One shot per desk, and the whole visit. */
const SHOT = 4.5;
const CYCLE = SHOT * DESKS;
/** How long a focus pull takes. */
const PULL = 1.6;
/** Where a still frame is taken from. */
const STILL_T = 6.2;
/** How far past the right edge pieces are built, in seconds of travel. */
const AHEAD_SECONDS = 3;
/** The scan head's sweep across the funds' record, in seconds. */
const SWEEP = 2.6;

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
 * device pixels of Gaussian softness: `ctx.filter` where it exists, and
 * where it does not (Safari, so every iPhone) the classic pyramid, the
 * image halved and doubled back up with smoothing, its depth matched to
 * the Gaussian's softness level for level.
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
 * A defocused copy of `sharp`, made at a resolution that falls with the
 * blur: a blurred image has no detail to keep, so the deeper copies are
 * smaller, which is also what makes them cheap to draw.
 */
function defocus(sharp: Variant, radius: number, base: number): Variant {
  const to = clamp(base * (1.6 / (1 + radius * 0.35)), 0.3, base);
  const margin = radius * 2.4;
  const w = sharp.w + margin * 2;
  const h = sharp.h + margin * 2;
  const c = surface(w * to, h * to);
  blurInto(c, sharp.c, margin * to, margin * to, sharp.w * to, sharp.h * to, radius * to);
  return { c, w, h };
}

// ---------------------------------------------------------------------
// Composition. Three arrangements: the homepage on a wide stage (tablets
// and up), the homepage on a tall one (phones), and the band at the top
// of a division or fund page. Heights are fractions of the stage, depths
// 0 to 1; along the other axis nothing is fixed, because everything
// travels.
// ---------------------------------------------------------------------

const HEADER_FALLBACK = 84;
const headerOf = (obs: Obstacle[]) => obs.find((o) => o.kind === 'header')?.bottom ?? HEADER_FALLBACK;

/** The pieces of a scene's formula and exhibit lists, by position: `f:3`, `x:2`. */
const formulaIds = (scene: SceneKey) => SCENES[scene].formulas.map((_, i) => `f:${i}`);
const exhibitIds = (scene: SceneKey) => SCENES[scene].exhibits.map((_, i) => `x:${i}`);
/** Every other one, from `from`: two lanes share a list without repeating each other. */
const alternate = (ids: string[], from: number) => ids.filter((_, i) => i % 2 === from);
const interleaveDesks = (ids: string[], scene: SceneKey) => {
  const byDesk = new Map<number, string[]>();
  ids.forEach((id) => {
    const d = deskOf(id, scene) ?? 0;
    byDesk.set(d, [...(byDesk.get(d) ?? []), id]);
  });
  const lists = [...byDesk.values()];
  const out: string[] = [];
  const n = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < n; i += 1) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
};

/** The desk a piece belongs to, for the focus: the market monitor is Macro Research's. */
function deskOf(id: string, scene: SceneKey): Desk | undefined {
  const [kind, i] = id.split(':');
  if (kind === 'f' || kind === 's') return SCENES[scene].formulas[Number(i)]?.desk;
  if (kind === 'x') return SCENES[scene].exhibits[Number(i)]?.desk;
  if (kind === 'monitor') return MR;
  return undefined;
}

/**
 * The homepage, tablets and up. Formulas pass just under the header and
 * through the middle; the market monitor and the exhibits pass behind,
 * fading behind the logo; the funds' chart holds still across the lower
 * band, swept by its scan head; large formulas drift far out of focus
 * close to the lens.
 */
function heroWide(obs: Obstacle[], W: number, H: number, u: number): Layout {
  const header = headerOf(obs);
  const top = (header + 34 * u) / H;
  const logo = obs.find((o) => o.kind === 'logo') ?? null;
  const ticker = obs.find((o) => o.kind === 'ticker') ?? null;
  const foot = ticker ? ticker.top - 6 * u : H - 34;
  const ids = formulaIds('home');
  const ex = exhibitIds('home');
  const chartTop = Math.max(H * 0.56, logo ? logo.bottom - (logo.bottom - logo.top) * 0.16 : H * 0.6);
  const chart = { x: 0.04 * W, y: chartTop, w: 0.92 * W, h: Math.max(90, foot - chartTop) };
  return {
    chart,
    tape: { x0: 0, x1: W, y: chartTop - 6 * u },
    ruler: { x0: 0, x1: W, y: header + 8 * u },
    lanes: [
      { y: 0.33, z: 0.14, alpha: 0.3, focusAlpha: 0.55, rest: 3.4, sharp: 1.6, ids: interleaveDesks(ex, 'home'), gap: 0.42 * W, lead: 0.1 },
      { y: 0.47, z: 0.42, alpha: 0.46, focusAlpha: 0.95, rest: 2.4, sharp: 0, ids: ['monitor:a', ...alternate(ex, 1), 'monitor:b', ...alternate(ex, 0)], gap: 0.36 * W, lead: -0.05, occlude: true },
      { y: top, z: 0.66, alpha: 0.44, focusAlpha: 0.95, rest: 1.9, sharp: 0, ids: interleaveDesks(alternate(ids, 0), 'home'), gap: 0.16 * W, lead: -0.1, occlude: true },
      { y: 0.42, z: 0.8, alpha: 0.34, focusAlpha: 0.85, rest: 2.4, sharp: 0.4, ids: interleaveDesks(alternate(ids, 1), 'home'), gap: 0.3 * W, lead: 0.2, occlude: true },
      { y: 0.2, z: 0.96, alpha: 0.12, rest: DEEPEST, ids: ['big:0', 'big:1', 'big:2'], gap: 0.9 * W, lead: 0.4 },
    ],
  };
}

/**
 * The homepage on a phone, where the logo and the button take most of the
 * height: one line of mathematics, always in focus and carrying every desk
 * in turn, streams through the first free band; the monitor and the
 * exhibits pass further back; the funds' chart holds the foot.
 */
function heroTall(obs: Obstacle[], W: number, H: number, u: number): Layout {
  const header = headerOf(obs);
  const blocks = obs.filter((o) => o.kind === 'logo' || o.kind === 'action').sort((a, b) => a.top - b.top);
  const ticker = obs.find((o) => o.kind === 'ticker') ?? null;
  const foot = ticker ? ticker.top - 4 * u : H - 44;
  const bands: [number, number][] = [];
  let y = header;
  for (const b of blocks) {
    if (b.top > y) bands.push([y, b.top]);
    y = Math.max(y, b.bottom);
  }
  const need = W < 560 ? 46 : 56;
  const band = bands.find(([a, b]) => b - a >= need);
  const ids = formulaIds('home');
  const chartH = 112 * u;
  const chart = { x: 0, y: foot - chartH, w: W - 4 * u, h: chartH };
  const lanes: Lane[] = [
    { y: 0.5, z: 0.18, alpha: 0.3, focusAlpha: 0.45, rest: 3.6, sharp: 2, ids: ['monitor:a', ...exhibitIds('home'), 'monitor:b'], gap: 0.6 * W, lead: -0.2, occlude: true },
  ];
  if (band) {
    lanes.push({
      y: (band[0] + band[1]) / 2 / H, z: 0.75, alpha: 0.9, rest: 0, always: true,
      ids: interleaveDesks(ids, 'home'), gap: (W < 560 ? 0.3 : 0.42) * W, lead: 0.1,
    });
  }
  lanes.push({ y: 0.66, z: 0.95, alpha: 0.1, rest: DEEPEST, ids: ['big:0', 'big:1'], gap: 1.2 * W, lead: 0.3 });
  return { chart, tape: { x0: 0, x1: W, y: chart.y - 4 * u }, ruler: { x0: 0, x1: W, y: header + 6 * u }, lanes };
}

/**
 * The band at the top of a division or fund page. The title holds the
 * middle of the band and can run most of its width, so the legible
 * material travels where nothing covers it: the page's exhibits and
 * formulas in a lane below the title, its shorter formulas in a lane
 * above it, larger exhibits far behind it, out of focus, and, where the
 * band is wide, large formulas close to the lens and deeper still. Focus here is a
 * plane, not a desk: a piece sharpens as it travels through the right
 * half of the band and softens as it leaves.
 */
function bandLayout(scene: SceneKey, obs: Obstacle[], W: number, H: number, u: number): Layout {
  const header = headerOf(obs);
  const title = obs.find((o) => o.kind === 'title') ?? null;
  const tTop = title ? title.top : header + (H - header) * 0.3;
  const tBottom = title ? title.bottom : header + (H - header) * 0.62;
  const content = SCENES[scene];
  const ids = formulaIds(scene);
  const ex = exhibitIds(scene);
  // Short formulas (no fraction, few characters) fit the narrow strip above the title.
  const short = ids.filter((_, i) => !content.formulas[i].tex.includes('\\frac') && content.formulas[i].tex.length < 70);
  const rest = ids.filter((id) => !short.includes(id));
  // Below the title: exhibits and the remaining formulas, alternating.
  const below: string[] = [];
  const n = Math.max(ex.length, rest.length);
  for (let i = 0; i < n; i += 1) {
    if (ex[i]) below.push(ex[i]);
    if (rest[i]) below.push(rest[i]);
  }
  const lowY = (tBottom + H) / 2 + 2 * u;
  const highY = (header + tTop) / 2;
  const lanes: Lane[] = [
    { y: ((tTop + tBottom) / 2) / H, z: 0.2, alpha: 0.2, focusAlpha: 0.32, rest: DEEPEST - 0.6, sharp: 2.6, ids: [...ex].reverse(), gap: 0.34 * W, lead: 0.15 },
    { y: lowY / H, z: 0.55, alpha: 0.5, focusAlpha: 0.95, rest: 1.9, sharp: 0, ids: below, gap: 0.12 * W, lead: 0.02, occlude: true },
  ];
  // The deepest lane, close to the lens, only where the band is wide: on a
  // phone it would be a faint blur costing as much to draw as a sharp lane.
  if (W >= 700) lanes.push({ y: 0.5, z: 0.96, alpha: 0.1, rest: DEEPEST, ids: ['big:0', 'big:1', 'big:2'], gap: 0.9 * W, lead: 0.5 });
  // The strip above the title, when there is room for a line of mathematics.
  if (tTop - header >= 34 * u && short.length) {
    lanes.push({ y: highY / H, z: 0.72, alpha: 0.42, focusAlpha: 0.85, rest: 2, sharp: 0.2, ids: short.map((id) => id.replace('f:', 's:')), gap: 0.22 * W, lead: 0.3, occlude: true, small: true });
  }
  return {
    chart: null,
    focalPlane: true,
    tape: { x0: 0, x1: W, y: H - 3 * u },
    ruler: { x0: 0, x1: W, y: header + 4 * u },
    lanes,
  };
}

/** A stable number in [0, 1) for piece `k` of lane `i`: uneven, repeatable spacing. */
function jitter(i: number, k: number) {
  const s = Math.sin(i * 78.233 + k * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** A stable number in [0, 1) for a print on the tape. */
function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------------

export function startScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setFigures: () => {}, destroy: () => {} };
  const c2d: CanvasRenderingContext2D = ctx;
  const scene = opts.scene;
  const content = SCENES[scene];

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
  let kind: 'wide' | 'tall' | 'band' = opts.form === 'band' ? 'band' : 'wide';
  let layout: Layout = { lanes: [], chart: null, tape: { x0: 0, x1: 0, y: 0 }, ruler: { x0: 0, x1: 0, y: 0 } };
  /** The obstacles the current layout was made for, as a comparable key. */
  let placedKey = '';
  /** What pieces dim behind: the logo on the homepage, the title on a page. */
  let shelter: Obstacle | null = null;
  /** Set once the stage has been measured: the first measurement builds everything. */
  let measured = false;

  const cache = new Map<string, SpriteSet>();
  const partial = new Map<string, Variant[]>();
  const queue: string[] = [];
  const painters = new Map<string, Painter>();
  /** How many placed pieces show each bitmap; at zero it is released. */
  const uses = new Map<string, number>();
  let lanes: LaneState[] = [];

  let figures: SceneFigures | null = null;
  let monitorRows: { a: MonitorRow[]; b: MonitorRow[] } = { a: [], b: [] };
  /** The funds' chart, drawn once per stage size and set of figures. */
  let chart: { v: Variant; plot: ChartGeometry } | null = null;
  let chartKey = '';
  /**
   * The resolution new sharp bitmaps are painted at. It is `res`, until a
   * device shows that drawing the scene genuinely strains it; from then on
   * pieces arriving are painted at 1.5x.
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
   * drawing it, so the wait is what the frame cost.
   */
  let costs: number[] = [];
  let probeAt = 0;
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

  // ---- pieces ------------------------------------------------------

  /** The large formulas close to the lens: the page's own longest ones. */
  const bigFormulas = [...content.formulas].sort((a, b) => b.tex.length - a.tex.length).slice(0, 3);

  function painterFor(id: string): Painter | null {
    const known = painters.get(id);
    if (known) return known;
    let p: Painter | null = null;
    const parts = id.split(':');
    if (parts[0] === 'f' || parts[0] === 's') {
      const src = content.formulas[Number(parts[1])];
      if (src) p = formulaPainter(src.tex, (parts[0] === 's' ? 14 : 17) * u, INK.light);
    } else if (parts[0] === 'x') {
      const ex = content.exhibits[Number(parts[1])];
      if (ex) p = EXHIBITS[ex.id](u * (kind === 'band' ? 0.8 : 0.95));
    } else if (parts[0] === 'big') {
      const src = bigFormulas[Number(parts[1]) % Math.max(1, bigFormulas.length)];
      if (src) p = formulaPainter(src.tex, (kind === 'band' ? 36 : 44) * u, INK.brand);
    } else if (id === 'monitor:a' || id === 'monitor:b') {
      const rows = id === 'monitor:a' ? monitorRows.a : monitorRows.b;
      if (rows.length) p = monitorPainter(rows, u * (kind === 'tall' ? 0.9 : 0.95), id === 'monitor:a' ? 'Market monitor · euro area' : 'Market monitor · rates and currencies');
    }
    if (p) painters.set(id, p);
    return p;
  }

  /** Pieces only ever seen at the deepest focus step. */
  const deepOnly = (id: string) => id.startsWith('big:');

  /**
   * One step of a build: the sharp bitmap, then one defocused copy per
   * step, each separately scheduled, so no piece holds the main thread for
   * its whole build. A piece only ever seen deeply out of focus is painted
   * at low resolution and kept only as its deepest copy.
   */
  function buildStep(id: string): boolean {
    const p = painterFor(id);
    if (!p) return true;
    if (deepOnly(id)) {
      const deep = defocus(paintSharp(p, base * 0.5), RADII[DEEPEST] * u * 1.4, base * 0.5);
      cache.set(id, RADII.map(() => deep));
      return true;
    }
    const done = partial.get(id) ?? [];
    if (done.length === 0) {
      partial.set(id, [paintSharp(p, paintRes)]);
      return false;
    }
    done.push(defocus(done[0], RADII[done.length] * u, base));
    if (done.length < RADII.length) return false;
    cache.set(id, done);
    partial.delete(id);
    return true;
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
   * near, and the ones it has left behind are released. A piece with
   * nothing to show yet (the monitor before its figures) is skipped.
   */
  function advance(st: LaneState, off: number) {
    const ahead = W + speed * parallax(st.lane.z) * AHEAD_SECONDS + 40;
    let guard = 0;
    while (st.next - off < ahead && guard < 64) {
      guard += 1;
      const id = st.lane.ids[st.k % Math.max(1, st.lane.ids.length)];
      const p = id ? painterFor(id) : null;
      // In a band every desk is the page's own, so the focus walks along
      // the pieces instead: each takes the next shot in turn.
      const desk = kind === 'band' ? ((st.k + st.index * 2) % DESKS) as Desk : deskOf(id ?? '', scene);
      if (p) {
        st.placed.push({ id, x: st.next, w: p.w, desk });
        hold(id);
      }
      st.next += (p ? p.w : 0) + st.lane.gap * (0.7 + 0.6 * jitter(st.index, st.k));
      st.k += 1;
    }
    while (st.placed.length && st.placed[0].x + st.placed[0].w - off < -60) {
      release((st.placed.shift() as Placed).id);
    }
  }

  // ---- layout ------------------------------------------------------

  /**
   * Sizes the canvas to its box, and says whether the pieces had to be
   * rebuilt from scratch (true) or were kept (false). Only a change of
   * arrangement or of scale throws the pieces away; an ordinary resize
   * keeps them, so the next frame is complete rather than blank.
   */
  function measure(): boolean {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const ratio = window.devicePixelRatio || 1;
    const nextKind: typeof kind = opts.form === 'band' ? 'band' : w < 900 || w / h < 1.3 ? 'tall' : 'wide';
    const nextU = nextKind === 'band'
      ? (w < 560 ? 0.7 : w < 1100 ? 0.82 : w < 1700 ? 0.92 : 1.05)
      : nextKind === 'tall' ? (w < 560 ? 0.72 : 0.86) : w < 1100 ? 0.82 : w < 1700 ? 1 : 1.15;
    const nextRes = Math.min(3, Math.max(2, Math.round(ratio * 2) / 2));
    const nextBase = Math.min(2, Math.max(1, ratio));
    const full = !measured || nextKind !== kind || nextU !== u || nextRes !== res || nextBase !== base;
    measured = true;
    const obs = opts.obstacles?.() ?? [];
    const key = obs.map((o) => `${o.kind}:${Math.round(o.top)}:${Math.round(o.bottom)}:${Math.round(o.left)}:${Math.round(o.right)}`).join('|');
    const moved = key !== placedKey;
    placedKey = key;
    const resized = Math.abs(w - W) > 1 || Math.abs(h - H) > 1;
    const sized = full || moved || resized;

    W = w;
    H = h;
    shelter = obs.find((o) => o.kind === (opts.form === 'band' ? 'title' : 'logo')) ?? null;
    // The camera covers a phone's width in about ten seconds and a wide
    // monitor's in about twenty: slow enough to read a formula as it passes.
    speed = clamp(W / 20, 34, 64);
    // The canvas matches the screen's density up to 3x, within a budget of
    // about 4.5 million pixels: a background that is, by design, mostly
    // out of focus does not need a 5K surface.
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
      layout = kind === 'band' ? bandLayout(scene, obs, W, H, u) : kind === 'tall' ? heroTall(obs, W, H, u) : heroWide(obs, W, H, u);
      // Painted back to front, so nearer pieces cover farther ones.
      layout.lanes.sort((a, b) => a.z - b.z);
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
    }
    if (sized) {
      chart = null;
      chartKey = '';
      resetLanes();
    }
    return full;
  }

  // ---- drawing -----------------------------------------------------

  /**
   * How far `desk` is in focus at `time`, from 0 to 1. Each desk has one
   * shot of SHOT seconds per visit, and the pull in and out of it takes
   * PULL seconds, centred on the shot's edges. A still frame holds
   * everything at a gentle middle focus.
   */
  function focusOf(desk: Desk | undefined, time: number, still: boolean) {
    if (desk === undefined) return 0;
    if (still) return 0.6;
    const d = (((time - desk * SHOT) % CYCLE) + CYCLE) % CYCLE;
    if (d < SHOT) return smooth((PULL / 2 + Math.min(d, SHOT - d)) / PULL);
    return smooth((PULL / 2 - Math.min(d - SHOT, CYCLE - d)) / PULL);
  }

  function blit(v: Variant, cx: number, cy: number, a: number) {
    if (a < 0.004) return;
    c2d.globalAlpha = a;
    c2d.drawImage(v.c, cx - v.w / 2, cy - v.h / 2, v.w, v.h);
  }

  /**
   * Draws a piece at focus step `lvl` (0 sharp to 4) as a cross-fade of
   * neighbouring copies; within a twentieth of a step, as the one copy,
   * which halves the cost of every piece at rest.
   */
  function drawSet(set: SpriteSet, cx: number, cy: number, lvl: number, a: number) {
    const L = clamp(lvl, 0, DEEPEST);
    const i = Math.min(DEEPEST - 1, Math.floor(L));
    const f = L - i;
    if (f < 0.05) return blit(set[i], cx, cy, a);
    if (f > 0.95) return blit(set[i + 1], cx, cy, a);
    blit(set[i], cx, cy, a * (1 - f));
    blit(set[i + 1], cx, cy, a * f);
  }

  /**
   * How far a piece `w` wide, centred at (cx, cy), has gone behind the logo
   * or the title, from 0 to 1: it rises as the piece nears the middle and
   * falls as it clears the far side, so the piece passes behind, not under.
   */
  function behind(cx: number, cy: number, w: number) {
    const o = shelter;
    if (!o) return 0;
    if (kind === 'band') {
      // Only a piece passing over the title itself dims: the lanes above
      // and below it travel clear.
      if (cy < o.top - 14 * u || cy > o.bottom + 14 * u) return 0;
      const inside = Math.min(cx + w / 2, o.right + 20 * u) - Math.max(cx - w / 2, o.left - 20 * u);
      return smooth(inside / (w * 0.5));
    }
    const half = (o.right - o.left) / 2;
    const d = Math.abs(cx - (o.left + o.right) / 2) / (half + w * 0.3);
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
      // On the homepage the focus visits one desk at a time; in a page's
      // band it is a plane the pieces travel through, right of centre.
      const focus = L.always ? 1 : layout.focalPlane
        ? (still ? 0.6 : 1) * smooth(1 - Math.abs(cx - W * 0.64) / (W * 0.3))
        : focusOf(it.desk, time, still);
      let lvl = L.rest + ((L.sharp ?? 0) - L.rest) * focus + intro * 1.5;
      let alpha = L.alpha + ((L.focusAlpha ?? L.alpha) - L.alpha) * focus;
      if (L.occlude) {
        // Behind the logo or the title a piece dims and softens as well.
        const occ = behind(cx, y, it.w);
        alpha *= 1 - 0.8 * occ;
        lvl += 1.6 * occ;
      }
      drawSet(set, cx, y, lvl, alpha);
    }
  }

  /** The funds' chart, if it is ready for this stage and these figures. */
  function chartSprite() {
    if (!layout.chart || !figures) return null;
    const box = layout.chart;
    const logo = opts.form === 'hero' ? shelter : null;
    const key = `${Math.round(box.w)}:${Math.round(box.h)}:${u}:${paintRes}:${logo ? `${Math.round(logo.left)},${Math.round(logo.top)},${Math.round(logo.right)},${Math.round(logo.bottom)}` : ''}`;
    if (chart && chartKey === key) return chart;
    const p = fundsChartPainter(figures, box.w, box.h, u);
    if (!p) return null;
    const v = paintSharp(p, paintRes);
    if (logo && logo.bottom > box.y) windowAt(v, logo, box, paintRes);
    chart = { v, plot: p.plot };
    chartKey = key;
    return chart;
  }

  /**
   * Where the logo's lower ring reaches into the chart, the chart fades
   * out under it in a soft oval, so that no line runs behind the mark.
   */
  function windowAt(v: Variant, logo: Obstacle, box: { x: number; y: number }, res: number) {
    const g = v.c.getContext('2d') as CanvasRenderingContext2D | null;
    if (!g) return;
    const cx = (logo.left + logo.right) / 2 - box.x + BUILD_PAD;
    const cy = (logo.top + logo.bottom) / 2 - box.y + BUILD_PAD;
    const r = Math.max(logo.right - logo.left, logo.bottom - logo.top) * 0.62;
    g.setTransform(res, 0, 0, res, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const grad = g.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = grad;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * The funds' official lines, still, across the lower band, and the scan
   * head that sweeps them: the motion is the instrument's, the record
   * itself never moves.
   */
  function drawChart(time: number, still: boolean, intro: number) {
    const sprite = chartSprite();
    const box = layout.chart;
    if (!sprite || !box) return;
    c2d.globalAlpha = 1 - 0.6 * intro;
    c2d.drawImage(sprite.v.c, box.x - BUILD_PAD, box.y - BUILD_PAD, sprite.v.w, sprite.v.h);
    if (still) return;
    const { plot } = sprite;
    const p = (time % SWEEP) / SWEEP;
    const sx = box.x + plot.x0 + (plot.x1 - plot.x0) * p;
    const y0 = box.y + plot.y0;
    const h = plot.y1 - plot.y0;
    // The head stops short of the logo's ring, as the chart itself does.
    let top = y0;
    const logo = opts.form === 'hero' ? shelter : null;
    if (logo) {
      const cx = (logo.left + logo.right) / 2;
      const r = Math.max(logo.right - logo.left, logo.bottom - logo.top) * 0.56;
      const dx = Math.abs(sx - cx);
      if (dx < r) top = Math.max(y0, (logo.top + logo.bottom) / 2 + Math.sqrt(r * r - dx * dx));
    }
    if (top >= y0 + h) return;
    const trail = 60 * u;
    const grad = c2d.createLinearGradient(sx - trail, 0, sx, 0);
    grad.addColorStop(0, 'rgba(245, 242, 254, 0)');
    grad.addColorStop(1, 'rgba(245, 242, 254, 0.08)');
    c2d.globalAlpha = 1;
    c2d.fillStyle = grad;
    c2d.fillRect(Math.max(box.x + plot.x0, sx - trail), top, Math.min(trail, sx - box.x - plot.x0), y0 + h - top);
    c2d.globalAlpha = 0.45;
    c2d.fillStyle = INK.hi;
    c2d.fillRect(Math.round(sx), top, 1, y0 + h - top);
  }

  /** A tape of prints: ticks whose height is the size, racing past. No figures. */
  function drawTape(time: number, still: boolean) {
    const { x0, x1, y } = layout.tape;
    if (x1 <= x0) return;
    const spacing = 7 * u;
    const travel = (still ? 0 : time) * speed * 4;
    const shift = travel % spacing;
    const first = Math.floor(travel / spacing);
    const w = x1 - x0;
    c2d.globalAlpha = 0.3;
    for (let i = 0; i * spacing < w + spacing; i += 1) {
      const k = first + i;
      if (hash(k, 3) < 0.35) continue;
      const x = x0 + w - (i * spacing - shift);
      if (x < x0) continue;
      const size = (2 + Math.pow(hash(k, 4), 3) * 16) * u;
      c2d.fillStyle = hash(k, 5) > 0.48 ? INK.light : INK.low;
      c2d.fillRect(Math.round(x), y - size, Math.max(1, 0.8 * u), size);
    }
  }

  /** Fine graduations, like a precision ruler, travelling at twice the camera. */
  function drawRuler(time: number, still: boolean) {
    const { x0, x1, y } = layout.ruler;
    if (x1 <= x0) return;
    const step = 4 * u;
    const travel = (still ? 0 : time) * speed * 2;
    const off = travel % step;
    const baseK = Math.floor(travel / step);
    c2d.globalAlpha = 0.2;
    c2d.fillStyle = INK.mid;
    for (let i = 0; i * step < x1 - x0 + step; i += 1) {
      const k = baseK + i;
      const len = k % 25 === 0 ? 9 : k % 5 === 0 ? 5 : 2.5;
      const x = Math.round(x0 + i * step - off);
      if (x < x0) continue;
      c2d.fillRect(x, y, Math.max(0.6, 0.6 * u), len * u);
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
        drawChart(time, still, intro);
        chartDone = true;
      }
      drawLane(st, time, still, cam, intro);
    }
    flushStale();
    if (!chartDone) drawChart(time, still, intro);
    drawTape(time, still);
    drawRuler(time, still);
    c2d.globalAlpha = 1;
  }

  // ---- the loop ----------------------------------------------------

  /** Builds queued pieces for up to `budget` ms, and says whether any remain. */
  function drain(budget: number) {
    const start = performance.now();
    while (queue.length && performance.now() - start < budget) {
      const id = queue[0];
      if (cache.has(id) || buildStep(id)) queue.shift();
    }
    return queue.length > 0;
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
  }

  /**
   * Gets a frame ready before it is shown: works out what the frame at
   * `time` needs, builds it a slice at a time, and only then draws it. At
   * the opening the canvas is still at opacity 0 throughout, so a slow
   * build shows the CSS ground rather than a half-assembled scene.
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
    // interval, so the cap holds on a 120 or 144Hz screen while a 75Hz one
    // still draws every frame it offers. At 30 the cap is strict.
    if (dt < (frameInterval < 20 ? frameInterval * 0.75 : frameInterval - 4)) return;
    last = now;
    // A long gap (a stalled tab, a debugger) advances the story by one
    // frame, not by the length of the gap.
    t += Math.min(dt, 100) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.03;
    drain(4);
    const began = performance.now();
    render(t, false);
    drawn += 1;
    if (drawn > 3 && !probeAt) {
      probeAt = began;
      probe.port2.postMessage(0);
    }
    pace(now);
  }

  /**
   * Two questions, asked of every sixty frames: are frames arriving at the
   * rate asked for, and how long is the browser taking to draw each one?
   *
   *   * cheap and on time: 60 frames a second, at full resolution;
   *   * late but cheap (a screen that refreshes slowly): 30, at full resolution;
   *   * more than about half of a 60th of a second to draw: 30;
   *   * more than about half of a 30th: 30 at a lower resolution at once;
   *   * still that expensive at the lower resolution: the still frame.
   *
   * The first verdict comes after six frames, on cost alone and on their
   * median, so a device that cannot carry the scene is not asked to for
   * more than a tenth of a second, while the page's own start-up work does
   * not condemn a device that can. A device stepped down for its cost that
   * then draws the scene cheaply goes back to 60 at full resolution.
   */
  function pace(now: number) {
    if (lastDrawn && drawn > 3) gaps.push(now - lastDrawn);
    lastDrawn = now;
    const first = verdicts === 0;
    if (first ? costs.length < 6 : gaps.length < 60) return;
    verdicts += 1;
    const typical = (v: number[]) => {
      const kept = [...v].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(v.length * 0.9)));
      return kept.reduce((sum, x) => sum + x, 0) / kept.length;
    };
    const late = !first && typical(gaps) > frameInterval * 1.12;
    const median = (v: number[]) => {
      const sorted = [...v].sort((a, b) => a - b);
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

  // ---- the figures -------------------------------------------------

  /**
   * The official figures arrive from the page (MarketScene): the monitor's
   * rows, the funds' tags and lines. Usually before the first frame, since
   * the build embeds them in the page; otherwise a moment into the opening.
   * The monitor panels and the chart are rebuilt; nothing else is.
   */
  function setFigures(next: SceneFigures) {
    if (destroyed) return;
    figures = next;
    monitorRows = { a: next.monitor.slice(0, 6), b: next.monitor.slice(6, 12) };
    for (const id of ['monitor:a', 'monitor:b']) {
      painters.delete(id);
      cache.delete(id);
      partial.delete(id);
    }
    chart = null;
    chartKey = '';
    const still = !opts.animate || settled;
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
      // task, so the cleared canvas is never presented.
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
    setFigures,
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
      chart = null;
    },
  };
}
