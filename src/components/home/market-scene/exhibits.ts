// =====================================================================
// The exhibits: the shapes the reports draw, drawn as shapes (Step 93B).
// ---------------------------------------------------------------------
// Each function returns a Painter (see painters.ts) that the engine paints
// ONCE into a bitmap and then only moves, so none of this runs per frame.
// Every exhibit is a shape a report on the page actually draws: the local
// volatility surface of the Dupire paper, the merit-order supply curve of
// the energy-pricing report, the key-rate ladder of the Multi-Asset fund.
//
// THEY CARRY NO FIGURES AND NO WORDS. Not an axis value, not a tenor, not
// a name. A number in a background would be a number nobody can check,
// and the number rule allows only official figures, which the scene draws
// elsewhere (the market monitor and the funds' lines). The data behind
// each shape is a fixed, seeded pattern chosen to have the shape the
// report describes: skew steepest at short maturities, a demand line
// crossing a stepped supply curve, a spread with its entry, target and
// stop. Markers are small squares, never circles, so nothing reads as a
// stray ring or lens flare out of focus.
// =====================================================================

import { INK, type Painter } from './painters';
import type { ExhibitId } from './content';

const FILL = {
  hi: 'rgba(221, 213, 247, 0.16)',
  mid: 'rgba(147, 132, 206, 0.24)',
  low: 'rgba(106, 90, 171, 0.32)',
  faint: 'rgba(106, 90, 171, 0.14)',
};

type C = CanvasRenderingContext2D;
type Pt = [number, number];

/** A small, fast, seeded generator: the same shape on every visit. */
function seeded(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw from two uniforms. */
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

/** `n` values of a random walk with drift, seeded. */
function walk(n: number, seed: number, drift = 0, vol = 1, start = 0): number[] {
  const r = seeded(seed);
  const out = [start];
  for (let i = 1; i < n; i += 1) out.push(out[i - 1] + drift + vol * gauss(r));
  return out;
}

/** Maps values into [top, bottom] of a box (higher values higher up), sharing a scale when given one. */
function fit(values: number[], top: number, bottom: number, lo = Math.min(...values), hi = Math.max(...values)): number[] {
  const span = hi - lo || 1;
  return values.map((v) => bottom - ((v - lo) / span) * (bottom - top));
}

const xs = (n: number, x0: number, x1: number) => Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / Math.max(1, n - 1));
const zip = (a: number[], b: number[]): Pt[] => a.map((v, i) => [v, b[i]]);

function stroke(c: C, pts: Pt[], color: string, width: number, dash: number[] = []) {
  if (pts.length < 2) return;
  c.save();
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.setLineDash(dash);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
  c.restore();
}

function fillBetween(c: C, top: Pt[], bottom: Pt[], color: string) {
  c.save();
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(top[0][0], top[0][1]);
  for (const p of top.slice(1)) c.lineTo(p[0], p[1]);
  for (const p of [...bottom].reverse()) c.lineTo(p[0], p[1]);
  c.closePath();
  c.fill();
  c.restore();
}

/** A vertical bar from `y0` to `y1` (either order). */
function bar(c: C, x: number, y0: number, y1: number, w: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, Math.min(y0, y1), w, Math.max(0.6, Math.abs(y1 - y0)));
}

/** A square marker centred on (x, y). */
function mark(c: C, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x - s / 2, y - s / 2, s, s);
}

function rule(c: C, x0: number, x1: number, y: number, k: number, color = INK.rule) {
  c.fillStyle = color;
  c.fillRect(x0, Math.round(y), x1 - x0, Math.max(1, 0.8 * k));
}

function vrule(c: C, x: number, y0: number, y1: number, k: number, color = INK.rule) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), y0, Math.max(1, 0.8 * k), y1 - y0);
}

function dashed(c: C, a: Pt, b: Pt, color: string, k: number) {
  stroke(c, [a, b], color, Math.max(0.8, 0.8 * k), [4 * k, 3 * k]);
}

const lw = (k: number, m = 1.2) => Math.max(1, m * k);

/** A painter of the usual size, `w` by `h` units. */
const piece = (k: number, w: number, h: number, paint: (c: C, W: number, H: number) => void): Painter => ({
  w: w * k,
  h: h * k,
  paint: (c) => paint(c, w * k, h * k),
});

// ---------------------------------------------------------------------
// A wireframe surface, seen from above and to one side.
// ---------------------------------------------------------------------

function wireframe(c: C, W: number, H: number, k: number, z: (a: number, b: number) => number, az = 0.55, zs = 0.62) {
  const NA = 22;
  const NB = 13;
  const ca = Math.cos(az);
  const sa = Math.sin(az);
  const proj = (a: number, b: number): Pt => {
    const X = a * 1.1;
    const Y = (b - 0.5) * 1.6;
    const Z = z(a, b);
    const px = X * ca - Y * sa;
    const py = X * sa * 0.42 + Y * ca * 0.42 - Z * zs;
    return [W / 2 + px * W * 0.36, H * 0.66 + py * H * 0.6];
  };
  for (let j = 0; j < NB; j += 1) {
    const b = j / (NB - 1);
    const pts = Array.from({ length: NA }, (_, i) => proj(-1 + (2 * i) / (NA - 1), b));
    stroke(c, pts, j === 0 ? INK.hi : 'rgba(179, 166, 216, 0.55)', Math.max(0.6, 0.7 * k));
  }
  for (let i = 0; i < NA; i += 2) {
    const a = -1 + (2 * i) / (NA - 1);
    const pts = Array.from({ length: NB }, (_, j) => proj(a, j / (NB - 1)));
    stroke(c, pts, 'rgba(106, 90, 171, 0.5)', Math.max(0.6, 0.7 * k));
  }
}

// ---------------------------------------------------------------------
// Quantitative Research
// ---------------------------------------------------------------------

/** Dupire: local volatility over strike and maturity, the skew steepest at short maturities. */
const localVolSurface = (k: number) => piece(k, 240, 150, (c, W, H) =>
  wireframe(c, W, H, k, (a, b) => 0.2 + 0.55 * Math.exp(-2.2 * b) * (a * a * 0.9 - a * 0.55) + 0.05 * b));

/** Path-dependent volatility: near-planar in the trend and the realised volatility. */
const pdvSurface = (k: number) => piece(k, 240, 150, (c, W, H) =>
  wireframe(c, W, H, k, (a, b) => 0.35 - 0.22 * a + 0.5 * b + 0.06 * a * a, 0.75, 0.5));

/** Fourier methods: a characteristic function traced in the complex plane. */
const charSpiral = (k: number) => piece(k, 170, 150, (c, W, H) => {
  const cx = W / 2;
  const cy = H / 2;
  rule(c, 10 * k, W - 10 * k, cy, k);
  vrule(c, cx, 8 * k, H - 8 * k, k);
  const pts: Pt[] = [];
  for (let i = 0; i <= 400; i += 1) {
    const u = (i / 400) * 7;
    const m = Math.exp(-0.06 * u * u);
    pts.push([cx + Math.cos(2.6 * u) * m * W * 0.42, cy - Math.sin(2.6 * u) * m * H * 0.42]);
  }
  stroke(c, pts, INK.light, lw(k));
});

/** The Dupire experiment: Monte Carlo paths, knocked out at a barrier. */
const barrierPaths = (k: number) => piece(k, 230, 130, (c, W, H) => {
  const barrierY = H * 0.78;
  const n = 60;
  const X = xs(n, 6 * k, W - 6 * k);
  for (let p = 0; p < 14; p += 1) {
    const v = walk(n, 101 + p, 0.02, 0.32);
    const Y = v.map((y) => H * 0.42 - y * H * 0.06);
    let end = n;
    for (let i = 0; i < n; i += 1) if (Y[i] >= barrierY) { end = i + 1; break; }
    const out = end < n;
    stroke(c, zip(X.slice(0, end), Y.slice(0, end)), out ? 'rgba(106, 90, 171, 0.6)' : 'rgba(221, 213, 247, 0.55)', Math.max(0.7, 0.8 * k));
    if (out) mark(c, X[end - 1], barrierY, 3 * k, INK.mid);
  }
  dashed(c, [0, barrierY], [W, barrierY], INK.brand, k);
});

/** The data-driven DCF: an AR(1) growth path and its fan, narrowing to the mean. */
const arFan = (k: number) => piece(k, 230, 130, (c, W, H) => {
  const split = W * 0.42;
  const hist = walk(24, 7, 0, 0.6).map((v) => H * 0.5 - v * 5 * k);
  stroke(c, zip(xs(24, 6 * k, split), hist), INK.light, lw(k));
  const y0 = hist[hist.length - 1];
  const mean = H * 0.44;
  const steps = 30;
  for (const [q, color] of [[1.8, FILL.faint], [1.1, FILL.low], [0.5, FILL.mid]] as [number, string][]) {
    const up: Pt[] = [];
    const dn: Pt[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const h = i / steps;
      const m = mean + (y0 - mean) * Math.pow(0.86, i);
      const s = q * 26 * k * Math.sqrt(1 - Math.pow(0.86, 2 * i));
      const x = split + h * (W - split - 6 * k);
      up.push([x, m - s]);
      dn.push([x, m + s]);
    }
    fillBetween(c, up, dn, color);
  }
  dashed(c, [split, mean], [W - 6 * k, mean], INK.mid, k);
});

/** Variance risk premia: the scatter and its spline, knots marked. */
const vrpSpline = (k: number) => piece(k, 220, 130, (c, W, H) => {
  const r = seeded(31);
  const f = (t: number) => 0.55 - 0.8 * (t - 0.35) * (t - 0.35) + 0.25 * Math.max(0, t - 0.6);
  for (let i = 0; i < 70; i += 1) {
    const t = r();
    mark(c, 8 * k + t * (W - 16 * k), H - 12 * k - (f(t) + 0.12 * gauss(r)) * (H - 24 * k), 2.2 * k, 'rgba(179, 166, 216, 0.55)');
  }
  const pts: Pt[] = xs(80, 0, 1).map((t) => [8 * k + t * (W - 16 * k), H - 12 * k - f(t) * (H - 24 * k)]);
  stroke(c, pts, INK.hi, lw(k, 1.4));
  for (const t of [0.2, 0.4, 0.6, 0.8]) vrule(c, 8 * k + t * (W - 16 * k), H - 12 * k, H - 6 * k, k, INK.mid);
  rule(c, 6 * k, W - 6 * k, H - 12 * k, k);
});

/** Signatures: a path in the plane, its chord, and the Lévy area between them. */
const levyArea = (k: number) => piece(k, 190, 140, (c, W, H) => {
  const r = seeded(53);
  const pts: Pt[] = [[W * 0.15, H * 0.75]];
  for (let i = 1; i < 70; i += 1) {
    const t = i / 69;
    const [px, py] = pts[i - 1];
    pts.push([px + (W * 0.7) / 69 + 2.4 * k * gauss(r), py - Math.sin(t * Math.PI) * 1.6 * k - 0.6 * k + 2.4 * k * gauss(r)]);
  }
  const chord: Pt[] = [pts[0], pts[pts.length - 1]];
  c.save();
  c.fillStyle = FILL.mid;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) c.lineTo(p[0], p[1]);
  c.closePath();
  c.fill();
  c.restore();
  stroke(c, pts, INK.light, lw(k));
  dashed(c, chord[0], chord[1], INK.brand, k);
  mark(c, chord[0][0], chord[0][1], 3.4 * k, INK.hi);
  mark(c, chord[1][0], chord[1][1], 3.4 * k, INK.hi);
});

/** LASH: the convex price-yield curve and its tangent, the duration. */
const priceYield = (k: number) => piece(k, 200, 140, (c, W, H) => {
  const P = (y: number) => 1 / Math.pow(1 + y, 9);
  const ys = xs(60, 0.0, 0.12);
  const px = ys.map((y) => 10 * k + (y / 0.12) * (W - 20 * k));
  const py = fit(ys.map(P), 12 * k, H - 14 * k);
  stroke(c, zip(px, py), INK.light, lw(k, 1.4));
  const y0 = 0.05;
  const x0 = 10 * k + (y0 / 0.12) * (W - 20 * k);
  const lo = Math.min(...ys.map(P));
  const hi = Math.max(...ys.map(P));
  const toY = (v: number) => H - 14 * k - ((v - lo) / (hi - lo)) * (H - 26 * k);
  const slope = -9 * Math.pow(1 + y0, -10);
  const at = (y: number): Pt => [10 * k + (y / 0.12) * (W - 20 * k), toY(P(y0) + slope * (y - y0))];
  dashed(c, at(0.005), at(0.1), INK.brand, k);
  mark(c, x0, toY(P(y0)), 3.4 * k, INK.hi);
  rule(c, 6 * k, W - 6 * k, H - 10 * k, k);
});

// ---------------------------------------------------------------------
// Macro Research
// ---------------------------------------------------------------------

/** Energy pricing: the merit-order supply curve, the demand line, the infra-marginal rent. */
const meritOrder = (k: number) => piece(k, 230, 140, (c, W, H) => {
  const base = H - 12 * k;
  const widths = [0.16, 0.12, 0.14, 0.1, 0.12, 0.1, 0.13, 0.13];
  const heights = [0.08, 0.12, 0.18, 0.26, 0.37, 0.5, 0.68, 0.9];
  const demand = 0.66;
  let x = 8 * k;
  const span = W - 16 * k;
  const steps: { x0: number; x1: number; y: number }[] = [];
  widths.forEach((w, i) => {
    const x1 = x + w * span;
    steps.push({ x0: x, x1, y: base - heights[i] * (H - 24 * k) });
    x = x1;
  });
  const dx = 8 * k + demand * span;
  const marginal = steps.find((s) => dx >= s.x0 && dx <= s.x1) ?? steps[steps.length - 1];
  for (const s of steps) {
    if (s.x0 >= dx) continue;
    c.fillStyle = FILL.mid;
    c.fillRect(s.x0, marginal.y, Math.min(s.x1, dx) - s.x0, s.y - marginal.y);
  }
  const pts: Pt[] = [];
  for (const s of steps) pts.push([s.x0, s.y], [s.x1, s.y]);
  stroke(c, pts, INK.light, lw(k, 1.3));
  vrule(c, dx, 10 * k, base, k, INK.hi);
  dashed(c, [8 * k, marginal.y], [dx, marginal.y], INK.brand, k);
  rule(c, 6 * k, W - 6 * k, base, k);
});

/** Reserve currencies: shares stacked through time, the top band narrowing. */
const reserveShares = (k: number) => piece(k, 230, 130, (c, W, H) => {
  const n = 40;
  const X = xs(n, 6 * k, W - 6 * k);
  const top = 10 * k;
  const bottom = H - 10 * k;
  const shares = X.map((_, i) => {
    const t = i / (n - 1);
    const usd = 0.72 - 0.16 * t;
    const eur = 0.18 + 0.02 * Math.sin(t * 5);
    const gold = 0.04 + 0.08 * t * t;
    return [usd, eur, gold, 1 - usd - eur - gold];
  });
  const fills = [FILL.hi, FILL.mid, FILL.low, FILL.faint];
  let lower = X.map((x) => [x, bottom] as Pt);
  for (let b = 3; b >= 0; b -= 1) {
    const upper = X.map((x, i) => {
      const cum = shares[i].slice(b).reduce((a, v) => a + v, 0);
      return [x, bottom - cum * (bottom - top)] as Pt;
    });
    fillBetween(c, upper, lower, fills[b]);
    stroke(c, upper, b === 0 ? INK.light : 'rgba(147, 132, 206, 0.6)', Math.max(0.7, 0.8 * k));
    lower = upper;
  }
});

/** Trade policy: the effective tariff rate over a century, the 1930s hump and the recent jump. */
const tariffHistory = (k: number) => piece(k, 240, 120, (c, W, H) => {
  const n = 126;
  const v = Array.from({ length: n }, (_, i) => {
    const hump = 14 * Math.exp(-Math.pow((i - 32) / 7, 2));
    const decline = 8 * Math.exp(-i / 22);
    const jump = i > 123 ? 11 : i > 121 ? 6 : 0;
    return 3 + decline + hump + jump + 0.6 * Math.sin(i * 0.9);
  });
  const X = xs(n, 6 * k, W - 6 * k);
  const Y = fit(v, 10 * k, H - 12 * k, 0);
  fillBetween(c, zip(X, Y), X.map((x) => [x, H - 12 * k] as Pt), FILL.faint);
  stroke(c, zip(X, Y), INK.light, lw(k));
  rule(c, 6 * k, W - 6 * k, H - 12 * k, k);
});

/** Central banks: policy rates stepping, one track each. */
const policyLadder = (k: number) => piece(k, 230, 130, (c, W, H) => {
  const tracks = 5;
  for (let t = 0; t < tracks; t += 1) {
    const r = seeded(70 + t);
    const y0 = 14 * k + t * ((H - 20 * k) / tracks);
    const hh = (H - 20 * k) / tracks - 6 * k;
    let level = 0.3 + 0.4 * r();
    const pts: Pt[] = [[6 * k, y0 + hh * (1 - level)]];
    for (let i = 1; i <= 12; i += 1) {
      const x = 6 * k + (i / 12) * (W - 12 * k);
      if (r() < 0.45) level = Math.max(0.05, Math.min(0.95, level + (r() < 0.6 ? -0.12 : 0.1)));
      pts.push([x, pts[pts.length - 1][1]], [x, y0 + hh * (1 - level)]);
    }
    rule(c, 6 * k, W - 6 * k, y0 + hh, k, 'rgba(74, 61, 134, 0.6)');
    stroke(c, pts, t === 0 ? INK.hi : INK.brand, Math.max(0.8, 1 * k));
  }
});

/** Tokenised settlement: ledger blocks, each linked to the last. */
const ledgerBlocks = (k: number) => piece(k, 240, 100, (c, W, H) => {
  const n = 6;
  const bw = (W - 20 * k) / n - 10 * k;
  const bh = H * 0.5;
  const y = (H - bh) / 2;
  for (let i = 0; i < n; i += 1) {
    const x = 10 * k + i * (bw + 10 * k);
    c.strokeStyle = i === n - 1 ? INK.hi : INK.brand;
    c.lineWidth = Math.max(0.8, 0.9 * k);
    c.strokeRect(x, y, bw, bh);
    for (let s = 0; s < 4; s += 1) rule(c, x + 4 * k, x + bw * (0.45 + 0.12 * s) - 4 * k, y + 8 * k + s * 6 * k, k, 'rgba(147, 132, 206, 0.6)');
    if (i) stroke(c, [[x - 10 * k, y + bh / 2], [x, y + bh / 2]], INK.mid, Math.max(0.8, 0.9 * k));
  }
});

/** Private credit: lenders, funds and borrowers, and the flows between them. */
const creditNetwork = (k: number) => piece(k, 230, 140, (c, W, H) => {
  const cols = [[0.15, 4], [0.5, 3], [0.85, 5]] as const;
  const nodes = cols.map(([x, n]) => Array.from({ length: n }, (_, i) => [x * W, ((i + 1) / (n + 1)) * H] as Pt));
  const r = seeded(9);
  for (let a = 0; a < 2; a += 1) {
    for (const p of nodes[a]) {
      for (const q of nodes[a + 1]) {
        if (r() < 0.45) continue;
        c.save();
        c.strokeStyle = r() < 0.3 ? 'rgba(221, 213, 247, 0.6)' : 'rgba(147, 132, 206, 0.45)';
        c.lineWidth = Math.max(0.6, (0.6 + 2 * r()) * k);
        c.beginPath();
        c.moveTo(p[0], p[1]);
        c.bezierCurveTo((p[0] + q[0]) / 2, p[1], (p[0] + q[0]) / 2, q[1], q[0], q[1]);
        c.stroke();
        c.restore();
      }
    }
  }
  nodes.flat().forEach((p) => mark(c, p[0], p[1], 5 * k, INK.hi));
});

// ---------------------------------------------------------------------
// Equity Research
// ---------------------------------------------------------------------

function heat(c: C, x0: number, y0: number, n: number, m: number, cw: number, ch: number, tone: (i: number, j: number) => number, gap: number) {
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const t = Math.max(0, Math.min(1, tone(i, j)));
      c.fillStyle = `rgba(${Math.round(106 + 115 * t)}, ${Math.round(90 + 123 * t)}, ${Math.round(171 + 76 * t)}, ${0.18 + 0.62 * t})`;
      c.fillRect(x0 + j * cw, y0 + i * ch, cw - gap, ch - gap);
    }
  }
}

/** Valuation sensitivity: WACC (or CoE) across, growth down, the base case outlined. */
const sensitivityGrid = (k: number) => piece(k, 170, 130, (c, W, H) => {
  const n = 5;
  const cw = (W - 12 * k) / n;
  const ch = (H - 12 * k) / n;
  heat(c, 6 * k, 6 * k, n, n, cw, ch, (i, j) => 0.15 + 0.17 * (i + (n - 1 - j)) / 1.6, 2 * k);
  c.strokeStyle = INK.hi;
  c.lineWidth = Math.max(1, 1.2 * k);
  c.strokeRect(6 * k + 2 * cw - 1, 6 * k + 2 * ch - 1, cw - 2 * k + 2, ch - 2 * k + 2);
});

/** The football field: valuation ranges by method, and the price. */
const footballField = (k: number) => piece(k, 220, 120, (c, W, H) => {
  const ranges: [number, number][] = [[0.18, 0.62], [0.3, 0.78], [0.12, 0.55], [0.35, 0.7]];
  const rowH = (H - 16 * k) / ranges.length;
  ranges.forEach(([a, b], i) => {
    const y = 8 * k + i * rowH + rowH * 0.25;
    c.fillStyle = i === ranges.length - 1 ? FILL.hi : FILL.mid;
    c.fillRect(8 * k + a * (W - 16 * k), y, (b - a) * (W - 16 * k), rowH * 0.5);
    rule(c, 8 * k, W - 8 * k, y + rowH * 0.25, k, 'rgba(74, 61, 134, 0.4)');
  });
  const px = 8 * k + 0.47 * (W - 16 * k);
  vrule(c, px, 4 * k, H - 4 * k, k, INK.hi);
});

/** Ten years rebased: the company against its index. */
const rebasedPair = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 80;
  const a = walk(n, 3, 0.12, 0.9);
  const b = walk(n, 4, 0.06, 0.6);
  const lo = Math.min(...a, ...b);
  const hi = Math.max(...a, ...b);
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(b, 10 * k, H - 10 * k, lo, hi)), INK.mid, Math.max(0.8, 1 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, fit(a, 10 * k, H - 10 * k, lo, hi)), INK.light, lw(k));
});

/** Comparable companies: the table, without its contents. */
const compsGrid = (k: number) => piece(k, 210, 120, (c, W, H) => {
  const rows = 8;
  const cols = 6;
  const r = seeded(17);
  rule(c, 6 * k, W - 6 * k, 10 * k, k, INK.brand);
  for (let i = 0; i < rows; i += 1) {
    const y = 16 * k + i * ((H - 22 * k) / rows);
    for (let j = 0; j < cols; j += 1) {
      const x = 6 * k + j * ((W - 12 * k) / cols);
      const w = (j === 0 ? 0.8 : 0.35 + 0.4 * r()) * ((W - 12 * k) / cols - 6 * k);
      c.fillStyle = i === rows - 1 ? 'rgba(221, 213, 247, 0.7)' : 'rgba(147, 132, 206, 0.45)';
      c.fillRect(j === 0 ? x : x + ((W - 12 * k) / cols - 6 * k) - w, y, w, 2.4 * k);
    }
  }
  rule(c, 6 * k, W - 6 * k, H - 10 * k, k, INK.brand);
});

/** Residual income, fading over the explicit horizon. */
const riFade = (k: number) => piece(k, 220, 120, (c, W, H) => {
  const n = 15;
  const bw = (W - 12 * k) / n;
  for (let i = 0; i < n; i += 1) {
    const v = 0.85 * Math.pow(0.86, i) + 0.06;
    const a = 0.75 - (0.5 * i) / n;
    bar(c, 6 * k + i * bw + 1 * k, H - 10 * k, H - 10 * k - v * (H - 22 * k), bw - 3 * k, `rgba(221, 213, 247, ${a})`);
  }
  rule(c, 4 * k, W - 4 * k, H - 10 * k, k);
});

/** Bank capital: CET1 ratios above the requirement. */
const cet1Bars = (k: number) => piece(k, 200, 120, (c, W, H) => {
  const v = [0.78, 0.72, 0.8, 0.74, 0.69, 0.76];
  const bw = (W - 16 * k) / v.length;
  v.forEach((h, i) => bar(c, 8 * k + i * bw + 3 * k, H - 10 * k, H - 10 * k - h * (H - 22 * k), bw - 8 * k, i === v.length - 1 ? INK.light : FILL.mid));
  const req = H - 10 * k - 0.52 * (H - 22 * k);
  dashed(c, [4 * k, req], [W - 4 * k, req], INK.hi, k);
  rule(c, 4 * k, W - 4 * k, H - 10 * k, k);
});

/** Profitability against capital intensity, one square per bank. */
const roeCapital = (k: number) => piece(k, 200, 130, (c, W, H) => {
  const r = seeded(41);
  for (let i = 0; i < 14; i += 1) {
    const t = r();
    const y = 0.25 + 0.55 * t + 0.15 * gauss(r) * 0.4;
    const s = (3 + 6 * r()) * k;
    mark(c, 10 * k + t * (W - 20 * k), H - 10 * k - y * (H - 20 * k), s, i % 4 === 0 ? 'rgba(221, 213, 247, 0.75)' : 'rgba(147, 132, 206, 0.5)');
  }
  dashed(c, [10 * k, H - 10 * k - 0.2 * (H - 20 * k)], [W - 10 * k, H - 10 * k - 0.85 * (H - 20 * k)], INK.brand, k);
  rule(c, 6 * k, W - 6 * k, H - 8 * k, k);
});

/** Value creation: return on capital against its cost, about the 45-degree line. */
const roicWacc = (k: number) => piece(k, 170, 140, (c, W, H) => {
  const r = seeded(43);
  const x0 = 10 * k;
  const y0 = H - 10 * k;
  const s = Math.min(W, H) - 20 * k;
  dashed(c, [x0, y0], [x0 + s, y0 - s], INK.brand, k);
  for (let i = 0; i < 18; i += 1) {
    const a = 0.15 + 0.7 * r();
    const b = Math.max(0.05, Math.min(0.95, a + 0.22 * gauss(r)));
    mark(c, x0 + a * s, y0 - b * s, 3.6 * k, b > a ? INK.light : INK.low);
  }
  rule(c, x0, x0 + s, y0, k);
  vrule(c, x0, y0 - s, y0, k);
});

// ---------------------------------------------------------------------
// Investment Research
// ---------------------------------------------------------------------

/** The asset-class views: underweight, neutral, overweight; the previous view as a tick. */
const preferenceBoard = (k: number) => piece(k, 200, 140, (c, W, H) => {
  const rows = [[2, 1], [1, 1], [0, 1], [2, 2], [1, 0], [1, 2], [0, 0]];
  const rh = (H - 12 * k) / rows.length;
  const x0 = 14 * k;
  const x1 = W - 14 * k;
  rows.forEach(([now, before], i) => {
    const y = 6 * k + i * rh + rh / 2;
    rule(c, x0, x1, y, k, 'rgba(74, 61, 134, 0.8)');
    for (let s = 0; s < 3; s += 1) vrule(c, x0 + (s / 2) * (x1 - x0), y - 3 * k, y + 3 * k, k, INK.low);
    const px = x0 + (before / 2) * (x1 - x0);
    const nx = x0 + (now / 2) * (x1 - x0);
    if (before !== now) {
      vrule(c, px, y - 5 * k, y + 5 * k, k, INK.mid);
      dashed(c, [px, y], [nx, y], INK.mid, k);
    }
    mark(c, nx, y, 6 * k, INK.hi);
  });
});

/** Two curves, US and euro area, one steepening. */
const curvePair = (k: number) => piece(k, 220, 120, (c, W, H) => {
  const T = xs(40, 0.05, 1);
  const X = T.map((t) => 8 * k + Math.sqrt(t) * (W - 16 * k));
  const us = T.map((t) => 0.55 + 0.25 * (1 - Math.exp(-4 * t)) - 0.05 * t);
  const ea = T.map((t) => 0.25 + 0.42 * (1 - Math.exp(-3 * t)));
  const was = T.map((t) => 0.3 + 0.25 * (1 - Math.exp(-3 * t)));
  const map = (v: number[]) => v.map((y) => H - 10 * k - y * (H - 20 * k));
  stroke(c, zip(X, map(was)), 'rgba(106, 90, 171, 0.7)', Math.max(0.8, 0.9 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, map(ea)), INK.light, lw(k, 1.3));
  stroke(c, zip(X, map(us)), INK.brand, lw(k));
  rule(c, 6 * k, W - 6 * k, H - 8 * k, k);
});

/** The Bund in March 2025: a level, a step, a new level. */
const bundStep = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 90;
  const r = seeded(19);
  const v = Array.from({ length: n }, (_, i) => (i < 52 ? 0.3 : i < 56 ? 0.3 + ((i - 51) / 5) * 0.4 : 0.7) + 0.035 * gauss(r));
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, v.map((y) => H - 10 * k - y * (H - 20 * k))), INK.light, lw(k));
  rule(c, 6 * k, W - 6 * k, H - 8 * k, k);
});

/** A spread trade: the spread, with its entry, target and stop. */
const spreadLevels = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 70;
  const v = walk(n, 23, -0.05, 0.45);
  const lo = Math.min(...v) - 1;
  const hi = Math.max(...v) + 1.5;
  const Y = fit(v, 10 * k, H - 10 * k, lo, hi);
  const X = xs(n, 6 * k, W - 6 * k);
  const toY = (val: number) => H - 10 * k - ((val - lo) / (hi - lo)) * (H - 20 * k);
  dashed(c, [6 * k, toY(v[0] + 1.2)], [W - 6 * k, toY(v[0] + 1.2)], INK.low, k);
  dashed(c, [6 * k, toY(v[0])], [W - 6 * k, toY(v[0])], INK.brand, k);
  dashed(c, [6 * k, toY(v[0] - 2.2)], [W - 6 * k, toY(v[0] - 2.2)], INK.hi, k);
  stroke(c, zip(X, Y), INK.light, lw(k));
});

/** Cointegration: two series that wander together, and the gap between them. */
const cointegrated = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 80;
  const base = walk(n, 29, 0.05, 0.7);
  const r = seeded(30);
  let e = 0;
  const other = base.map((b) => {
    e = 0.7 * e + 0.35 * gauss(r);
    return b + 1.2 + e;
  });
  const lo = Math.min(...base, ...other);
  const hi = Math.max(...base, ...other);
  const X = xs(n, 6 * k, W - 6 * k);
  const A = zip(X, fit(base, 10 * k, H - 10 * k, lo, hi));
  const B = zip(X, fit(other, 10 * k, H - 10 * k, lo, hi));
  fillBetween(c, B, A, FILL.faint);
  stroke(c, A, INK.brand, lw(k));
  stroke(c, B, INK.light, lw(k));
});

/** Volatility clusters: returns about zero, quiet then loud. */
const garchClusters = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 110;
  const r = seeded(37);
  let s2 = 0.3;
  let eps = 0;
  const mid = H / 2;
  const bw = (W - 12 * k) / n;
  const env: Pt[] = [];
  for (let i = 0; i < n; i += 1) {
    s2 = 0.05 + 0.12 * eps * eps + 0.82 * s2 + (i === 60 ? 2.5 : 0);
    eps = Math.sqrt(s2) * gauss(r);
    const x = 6 * k + i * bw;
    bar(c, x, mid, mid - eps * 10 * k, Math.max(0.8, bw * 0.6), 'rgba(179, 166, 216, 0.6)');
    env.push([x, mid - Math.sqrt(s2) * 22 * k]);
  }
  stroke(c, env, INK.hi, Math.max(0.8, 1 * k));
  rule(c, 6 * k, W - 6 * k, mid, k);
});

/** The Strait of Hormuz: daily transits, then the collapse. */
const transitsCollapse = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 40;
  const r = seeded(13);
  const bw = (W - 12 * k) / n;
  for (let i = 0; i < n; i += 1) {
    const v = i < 28 ? 0.7 + 0.12 * r() : i < 31 ? 0.7 - (i - 27) * 0.2 : 0.06 + 0.05 * r();
    bar(c, 6 * k + i * bw, H - 10 * k, H - 10 * k - v * (H - 20 * k), bw - 2 * k, i < 28 ? FILL.mid : INK.light);
  }
  rule(c, 4 * k, W - 4 * k, H - 10 * k, k);
});

/** Gold and the real yield: a long inverse relation, then the decoupling. */
const goldRealYield = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 90;
  const ry = walk(n, 47, 0.01, 0.35);
  const gold = ry.map((v, i) => -v + (i > 60 ? (i - 60) * 0.28 : 0));
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(ry, 10 * k, H - 10 * k)), INK.mid, Math.max(0.9, 1 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, fit(gold, 10 * k, H - 10 * k)), INK.light, lw(k));
});

// ---------------------------------------------------------------------
// Portfolio Management and the funds
// ---------------------------------------------------------------------

/** Factor weights, signed, for the two legs (US and Europe). */
const factorBars = (k: number) => piece(k, 220, 120, (c, W, H) => {
  const legs = [[0.1, 0.15, 0.1, 0.2, 0.25, -0.1, 0.05, 0.05], [0.12, 0.1, 0.1, 0.25, 0.2, -0.08, 0.06, -0.04]];
  const mid = H * 0.62;
  const gw = (W - 16 * k) / 2;
  legs.forEach((leg, g) => {
    const bw = gw / leg.length;
    leg.forEach((v, i) => bar(c, 8 * k + g * gw + i * bw + 1.5 * k, mid, mid - (v / 0.25) * (H * 0.5), bw - 4 * k, v < 0 ? INK.low : g ? INK.brand : INK.light));
  });
  rule(c, 6 * k, W - 6 * k, mid, k);
  vrule(c, W / 2, mid - H * 0.5, mid + H * 0.2, k, 'rgba(74, 61, 134, 0.6)');
});

/** The book: twenty longs above the line, twenty shorts below. */
const bookSilhouette = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const mid = H / 2;
  const n = 20;
  const bw = (W - 12 * k) / (n * 2);
  for (let i = 0; i < n; i += 1) {
    const v = 0.85 - (i / n) * 0.55;
    bar(c, 6 * k + i * bw, mid, mid - v * (H * 0.42), bw - 1.5 * k, INK.light);
    bar(c, 6 * k + (n + i) * bw, mid, mid + (0.3 + (i / n) * 0.55) * (H * 0.42), bw - 1.5 * k, INK.low);
  }
  rule(c, 4 * k, W - 4 * k, mid, k);
});

/** The factors' correlation matrix, eight by eight. */
const correlationGrid = (k: number) => piece(k, 140, 140, (c, W) => {
  const n = 8;
  const r = seeded(59);
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) for (let j = 0; j <= i; j += 1) m[i][j] = m[j][i] = i === j ? 1 : Math.abs(0.75 * Math.exp(-Math.abs(i - j) / 2) * (0.5 + r()));
  const cs = (W - 12 * k) / n;
  heat(c, 6 * k, 6 * k, n, n, cs, cs, (i, j) => m[i][j], 1.5 * k);
});

/** Nelson-Siegel: level, slope and curvature through time. */
const nsBetas = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 90;
  const X = xs(n, 6 * k, W - 6 * k);
  const series = [walk(n, 61, 0.02, 0.3, 3), walk(n, 62, -0.01, 0.35, -1), walk(n, 63, 0, 0.45, 0)];
  const lo = Math.min(...series.flat());
  const hi = Math.max(...series.flat());
  const tones = [INK.light, INK.brand, INK.low];
  series.forEach((s, i) => stroke(c, zip(X, fit(s, 10 * k, H - 10 * k, lo, hi)), tones[i], i ? Math.max(0.9, 1 * k) : lw(k)));
});

/** The Student-t density: fat tails, the left tail shaded beyond the VaR. */
const studentT = (k: number) => piece(k, 210, 120, (c, W, H) => {
  const nu = 4;
  const t = (x: number) => Math.pow(1 + (x * x) / nu, -(nu + 1) / 2);
  const n = (x: number) => Math.exp((-x * x) / 2);
  const X = xs(120, -4.5, 4.5);
  const px = X.map((x) => 6 * k + ((x + 4.5) / 9) * (W - 12 * k));
  const base = H - 10 * k;
  const ty = X.map((x) => base - t(x) * (H - 22 * k));
  const ny = X.map((x) => base - n(x) * (H - 22 * k) * 0.92);
  const cut = X.findIndex((x) => x > -2.1);
  fillBetween(c, zip(px.slice(0, cut + 1), ty.slice(0, cut + 1)), px.slice(0, cut + 1).map((x) => [x, base] as Pt), FILL.hi);
  stroke(c, zip(px, ny), INK.low, Math.max(0.8, 0.9 * k), [3 * k, 2 * k]);
  stroke(c, zip(px, ty), INK.light, lw(k, 1.3));
  vrule(c, px[cut], base - (H - 22 * k) * 0.45, base, k, INK.hi);
  rule(c, 4 * k, W - 4 * k, base, k);
});

/** Hierarchical risk parity: the dendrogram. */
const hrpTree = (k: number) => piece(k, 210, 120, (c, W, H) => {
  const leaves = 10;
  const lx = (i: number) => 8 * k + (i / (leaves - 1)) * (W - 16 * k);
  const base = H - 8 * k;
  type N = { x: number; y: number };
  let nodes: N[] = Array.from({ length: leaves }, (_, i) => ({ x: lx(i), y: base }));
  const merges = [[0, 1, 0.18], [2, 3, 0.26], [5, 6, 0.2], [7, 8, 0.3], [0, 1, 0.45], [3, 4, 0.5], [0, 1, 0.7], [1, 2, 0.88]];
  for (const [a, b, h] of merges as [number, number, number][]) {
    if (!nodes[a] || !nodes[b]) continue;
    const y = base - h * (H - 16 * k);
    const A = nodes[a];
    const B = nodes[b];
    stroke(c, [[A.x, A.y], [A.x, y], [B.x, y], [B.x, B.y]], h > 0.6 ? INK.hi : INK.brand, Math.max(0.9, 1 * k));
    nodes = [...nodes.slice(0, a), { x: (A.x + B.x) / 2, y }, ...nodes.slice(b + 1)];
  }
  for (let i = 0; i < leaves; i += 1) mark(c, lx(i), base, 3.4 * k, INK.light);
});

/** Volatility two ways: the rolling window, and GARCH reacting faster. */
const garchRolling = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 120;
  const r = seeded(67);
  let s2 = 0.3;
  let eps = 0;
  const g: number[] = [];
  const e2: number[] = [];
  for (let i = 0; i < n; i += 1) {
    s2 = 0.04 + 0.14 * eps * eps + 0.8 * s2 + (i === 70 ? 1.6 : 0);
    eps = Math.sqrt(s2) * gauss(r);
    g.push(Math.sqrt(s2));
    e2.push(eps * eps);
  }
  const roll = e2.map((_, i) => Math.sqrt(e2.slice(Math.max(0, i - 20), i + 1).reduce((a, v) => a + v, 0) / Math.min(i + 1, 21)));
  const lo = 0;
  const hi = Math.max(...g, ...roll);
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(roll, 10 * k, H - 10 * k, lo, hi)), INK.mid, Math.max(0.9, 1 * k));
  stroke(c, zip(X, fit(g, 10 * k, H - 10 * k, lo, hi)), INK.light, lw(k));
});

/** Momentum: a long climb, the crash, a partial recovery. */
const momentumCrash = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 90;
  const r = seeded(71);
  let v = 0;
  const s = Array.from({ length: n }, (_, i) => {
    v += i < 58 ? 0.08 + 0.12 * gauss(r) : i < 63 ? -1.1 : 0.05 + 0.15 * gauss(r);
    return v;
  });
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(s, 10 * k, H - 10 * k)), INK.light, lw(k));
});

/** The composite score: forty names ranked, short to long. */
const scoreLadder = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 40;
  const mid = H / 2;
  const bw = (W - 12 * k) / n;
  for (let i = 0; i < n; i += 1) {
    const z = Math.tan(((i + 0.5) / n - 0.5) * Math.PI * 0.86) * 0.32;
    bar(c, 6 * k + i * bw, mid, mid - z * (H * 0.4), bw - 1.5 * k, z < 0 ? INK.low : INK.light);
  }
  rule(c, 4 * k, W - 4 * k, mid, k);
});

/** Key-rate sensitivities: five tenors, first order below, convexity above. */
const keyRateLadder = (k: number) => piece(k, 200, 120, (c, W, H) => {
  const first = [0.3, 0.34, 0.78, 0.72, 0.33];
  const second = [0.06, 0.08, 0.5, 0.58, 0.25];
  const mid = H * 0.38;
  const bw = (W - 16 * k) / first.length;
  first.forEach((v, i) => {
    const x = 8 * k + i * bw + bw * 0.2;
    bar(c, x, mid, mid + v * (H - mid - 10 * k), bw * 0.6, i === 2 || i === 3 ? INK.light : FILL.mid);
    bar(c, x + bw * 0.15, mid, mid - second[i] * (mid - 8 * k), bw * 0.3, INK.brand);
  });
  rule(c, 6 * k, W - 6 * k, mid, k);
});

/** Curve scenarios: parallel, steepener, flattener, butterfly, on five tenors. */
const curveShifts = (k: number) => piece(k, 240, 90, (c, W, H) => {
  const shapes = [[1, 1, 1, 1, 1], [0.2, 0.45, 0.65, 0.8, 0.9], [0.4, 0.1, -0.2, -0.4, -0.4], [0, -0.2, -0.4, -0.2, 0]];
  const gw = (W - 10 * k) / shapes.length;
  shapes.forEach((s, g) => {
    const x0 = 5 * k + g * gw + 6 * k;
    const x1 = x0 + gw - 12 * k;
    const base = H * 0.55;
    const X = xs(5, x0, x1);
    const curve = [0.15, 0.3, 0.42, 0.5, 0.55];
    const was = curve.map((v) => base - v * H * 0.45);
    const now = curve.map((v, i) => base - (v + 0.22 * s[i]) * H * 0.45);
    stroke(c, zip(X, was), INK.low, Math.max(0.8, 0.9 * k), [3 * k, 2 * k]);
    stroke(c, zip(X, now), INK.light, lw(k));
    X.forEach((x, i) => mark(c, x, now[i], 3 * k, INK.hi));
  });
});

/** A bond as cash flows: coupons, the principal, and the discount curve over them. */
const cashflowComb = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 10;
  const base = H - 10 * k;
  const X = xs(n, 14 * k, W - 14 * k);
  X.forEach((x, i) => bar(c, x - 2 * k, base, base - (i === n - 1 ? 0.88 : 0.12) * (H - 24 * k), 4 * k, i === n - 1 ? INK.light : INK.brand));
  const df = xs(60, 0, 1).map((t) => [8 * k + t * (W - 16 * k), base - Math.exp(-1.1 * t) * (H - 24 * k) * 0.75] as Pt);
  stroke(c, df, INK.hi, Math.max(0.9, 1 * k), [4 * k, 3 * k]);
  rule(c, 6 * k, W - 6 * k, base, k);
});

/** The sleeves: equity, fixed income, commodity, and where they stood before. */
const sleeveBalance = (k: number) => piece(k, 230, 70, (c, W, H) => {
  const now = [0.53, 0.38, 0.09];
  const before = [0.56, 0.35, 0.09];
  const tones = [INK.light, INK.brand, INK.low];
  const draw = (v: number[], y: number, h: number, ghost: boolean) => {
    let x = 8 * k;
    v.forEach((s, i) => {
      const w = s * (W - 16 * k);
      if (ghost) {
        c.strokeStyle = 'rgba(147, 132, 206, 0.6)';
        c.lineWidth = Math.max(0.8, 0.8 * k);
        c.strokeRect(x + 1, y, w - 3 * k, h);
      } else {
        c.fillStyle = tones[i];
        c.globalAlpha = 0.75;
        c.fillRect(x, y, w - 3 * k, h);
        c.globalAlpha = 1;
      }
      x += w;
    });
  };
  draw(before, H * 0.18, H * 0.22, true);
  draw(now, H * 0.52, H * 0.3, false);
});

/** The bootstrap: resampled estimates, gathering into a distribution. */
const bootstrap = (k: number) => piece(k, 210, 120, (c, W, H) => {
  const r = seeded(83);
  const bins = Array(24).fill(0);
  for (let i = 0; i < 600; i += 1) {
    const v = Math.round(11.5 + 3.6 * gauss(r));
    if (v >= 0 && v < bins.length) bins[v] += 1;
  }
  const mx = Math.max(...bins);
  const bw = (W - 12 * k) / bins.length;
  const base = H - 10 * k;
  bins.forEach((b, i) => bar(c, 6 * k + i * bw, base, base - (b / mx) * (H - 22 * k), bw - 2 * k, FILL.mid));
  const curve = xs(80, 0, bins.length).map((v) => [6 * k + v * bw, base - Math.exp(-Math.pow((v - 12) / 3.6, 2) / 2) * (H - 22 * k)] as Pt);
  stroke(c, curve, INK.light, lw(k));
  rule(c, 4 * k, W - 4 * k, base, k);
});

/** The FX hedge: spot, the forward set by the rate differential, and the basis. */
const fxForward = (k: number) => piece(k, 210, 120, (c, W, H) => {
  const x0 = 14 * k;
  const x1 = W - 20 * k;
  const spot = H * 0.7;
  const cip = H * 0.36;
  const mkt = H * 0.28;
  rule(c, x0, x1, spot, k, INK.mid);
  dashed(c, [x0, spot], [x1, cip], INK.brand, k);
  mark(c, x0, spot, 5 * k, INK.hi);
  mark(c, x1, cip, 4 * k, INK.brand);
  mark(c, x1, mkt, 5 * k, INK.hi);
  stroke(c, [[x1 + 6 * k, cip], [x1 + 10 * k, cip], [x1 + 10 * k, mkt], [x1 + 6 * k, mkt]], INK.light, Math.max(0.8, 0.9 * k));
});

/** The rebalancing: entries up, removals down, netting to zero. */
const addsRemovals = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const adds = [0.7, 0.55, 0.4, 0.4, 0.3, 0.28, 0.2, 0.15, 0.12];
  const cuts = [0.6, 0.5, 0.45, 0.35, 0.3, 0.25, 0.22, 0.14, 0.09, 0.08];
  const mid = H / 2;
  const n = adds.length + cuts.length;
  const bw = (W - 12 * k) / n;
  adds.forEach((v, i) => bar(c, 6 * k + i * bw, mid, mid - v * H * 0.42, bw - 3 * k, INK.light));
  cuts.forEach((v, i) => bar(c, 6 * k + (adds.length + i) * bw, mid, mid + v * H * 0.42, bw - 3 * k, INK.low));
  rule(c, 4 * k, W - 4 * k, mid, k);
});

/** Uranium: demand rising on two paths, supply stepping down, the gap between. */
const supplyGap = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 40;
  const X = xs(n, 6 * k, W - 6 * k);
  const base = H - 10 * k;
  const y = (v: number) => base - v * (H - 22 * k);
  const high = X.map((_, i) => y(0.42 + 0.55 * (i / (n - 1))));
  const low = X.map((_, i) => y(0.42 + 0.35 * (i / (n - 1))));
  const supply = X.map((_, i) => y(0.48 - 0.08 * Math.floor((i / (n - 1)) * 5)));
  fillBetween(c, zip(X, high), zip(X, supply), FILL.faint);
  stroke(c, zip(X, supply), INK.brand, lw(k));
  stroke(c, zip(X, low), INK.mid, Math.max(0.9, 1 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, high), INK.light, lw(k));
  rule(c, 4 * k, W - 4 * k, base, k);
});

/** A price taken apart: book value, the no-growth value, the growth premium. */
const valuationStack = (k: number) => piece(k, 140, 130, (c, W, H) => {
  const base = H - 10 * k;
  const parts = [0.3, 0.38, 0.22];
  const tones = [INK.low, INK.brand, INK.light];
  let y = base;
  const x = W * 0.3;
  const bw = W * 0.32;
  parts.forEach((p, i) => {
    const h = p * (H - 20 * k);
    c.fillStyle = tones[i];
    c.globalAlpha = 0.75;
    c.fillRect(x, y - h, bw, h - 2 * k);
    c.globalAlpha = 1;
    y -= h;
  });
  stroke(c, [[x + bw + 6 * k, base], [x + bw + 10 * k, base], [x + bw + 10 * k, y], [x + bw + 6 * k, y]], INK.hi, Math.max(0.8, 0.9 * k));
  rule(c, 6 * k, W - 6 * k, base, k);
});

/** The covariance matrix built from correlations and conditional volatilities (Σ = DρD). */
const covarianceGrid = (k: number) => piece(k, 140, 140, (c, W) => {
  const n = 8;
  const sig = [0.9, 0.4, 0.7, 0.3, 1, 0.5, 0.6, 0.35];
  const cs = (W - 12 * k) / n;
  heat(c, 6 * k, 6 * k, n, n, cs, cs, (i, j) => (i === j ? 1 : 0.6 * Math.exp(-Math.abs(i - j) / 2.2)) * sig[i] * sig[j], 1.5 * k);
});

/** The passive book: equity and fixed income blocks, each split into its ETF sleeves. */
const allocationBlocks = (k: number) => piece(k, 230, 80, (c, W, H) => {
  const blocks = [[0.6, 7], [0.4, 5]] as const;
  let x = 8 * k;
  blocks.forEach(([share, sleeves], b) => {
    const w = share * (W - 16 * k) - 4 * k;
    c.fillStyle = b ? FILL.mid : FILL.hi;
    c.fillRect(x, H * 0.25, w, H * 0.5);
    for (let s = 1; s < sleeves; s += 1) vrule(c, x + (s / sleeves) * w, H * 0.25, H * 0.75, k, 'rgba(3, 2, 9, 0.6)');
    x += w + 4 * k;
  });
});

/** An index fund: its line hugging the index, the tracking error a hair's width. */
const tracking = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 90;
  const idx = walk(n, 89, 0.05, 0.7);
  const r = seeded(90);
  const fund = idx.map((v) => v - 0.05 + 0.06 * gauss(r));
  const lo = Math.min(...idx, ...fund);
  const hi = Math.max(...idx, ...fund);
  const X = xs(n, 6 * k, W - 6 * k);
  const I = zip(X, fit(idx, 10 * k, H - 10 * k, lo, hi));
  const F = zip(X, fit(fund, 10 * k, H - 10 * k, lo, hi));
  fillBetween(c, I.map(([px, py]) => [px, py - 2 * k] as Pt), I.map(([px, py]) => [px, py + 2 * k] as Pt), FILL.faint);
  stroke(c, I, INK.mid, Math.max(0.8, 0.9 * k), [3 * k, 2 * k]);
  stroke(c, F, INK.light, lw(k));
});

/** Duration managed: maturity buckets, the weight moved from the long end to the middle. */
const maturitySlide = (k: number) => piece(k, 230, 90, (c, W, H) => {
  const buckets = 7;
  const bw = (W - 16 * k) / buckets;
  const base = H - 12 * k;
  for (let i = 0; i <= buckets; i += 1) vrule(c, 8 * k + i * bw, base - 4 * k, base + 4 * k, k, INK.low);
  rule(c, 8 * k, W - 8 * k, base, k);
  c.strokeStyle = 'rgba(147, 132, 206, 0.6)';
  c.lineWidth = Math.max(0.8, 0.8 * k);
  c.strokeRect(8 * k + 6 * bw + 3 * k, base - H * 0.55, bw - 6 * k, H * 0.55 - 2 * k);
  c.fillStyle = INK.light;
  c.globalAlpha = 0.8;
  c.fillRect(8 * k + 3 * bw + 3 * k, base - H * 0.55, bw - 6 * k, H * 0.55 - 2 * k);
  c.globalAlpha = 1;
  dashed(c, [8 * k + 6.5 * bw, base - H * 0.62], [8 * k + 3.5 * bw, base - H * 0.62], INK.brand, k);
});

/** The currency hedge: the hedged line smooth, the unhedged one carrying the currency's noise. */
const hedgePair = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 90;
  const smooth = walk(n, 95, 0.04, 0.3);
  const fx = walk(n, 96, 0, 0.55);
  const raw = smooth.map((v, i) => v + fx[i]);
  const lo = Math.min(...smooth, ...raw);
  const hi = Math.max(...smooth, ...raw);
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(raw, 10 * k, H - 10 * k, lo, hi)), INK.mid, Math.max(0.8, 0.9 * k));
  stroke(c, zip(X, fit(smooth, 10 * k, H - 10 * k, lo, hi)), INK.light, lw(k, 1.3));
});

/** Factor tilts: value, size, momentum, quality, each off the neutral line. */
const factorTilt = (k: number) => piece(k, 190, 110, (c, W, H) => {
  const tilts = [0.6, 0.35, -0.25, 0.5];
  const cx = W / 2;
  const rh = (H - 16 * k) / tilts.length;
  tilts.forEach((v, i) => {
    const y = 8 * k + i * rh + rh * 0.3;
    c.fillStyle = v < 0 ? INK.low : INK.light;
    c.globalAlpha = 0.8;
    c.fillRect(v < 0 ? cx + v * (W / 2 - 10 * k) : cx, y, Math.abs(v) * (W / 2 - 10 * k), rh * 0.4);
    c.globalAlpha = 1;
  });
  vrule(c, cx, 4 * k, H - 4 * k, k, INK.hi);
});

/** Commodity futures: backwardation and contango, and the roll between them. */
const termStructure = (k: number) => piece(k, 220, 110, (c, W, H) => {
  const X = xs(12, 10 * k, W - 10 * k);
  const back = X.map((_, i) => H * 0.3 + i * 3.2 * k);
  const cont = X.map((_, i) => H * 0.78 - i * 3.6 * k);
  stroke(c, zip(X, back), INK.light, lw(k));
  stroke(c, zip(X, cont), INK.brand, lw(k));
  X.forEach((x, i) => { mark(c, x, back[i], 3 * k, INK.hi); mark(c, x, cont[i], 3 * k, INK.mid); });
  for (const i of [3, 7]) {
    stroke(c, [[X[i] + 3 * k, back[i] - 6 * k], [X[i + 1] - 3 * k, back[i + 1] - 6 * k]], INK.hi, Math.max(0.8, 0.9 * k));
    stroke(c, [[X[i + 1] - 6 * k, back[i + 1] - 9 * k], [X[i + 1] - 3 * k, back[i + 1] - 6 * k], [X[i + 1] - 6 * k, back[i + 1] - 3 * k]], INK.hi, Math.max(0.8, 0.9 * k));
  }
});

/** A zero-coupon STRIPS: one payment at maturity, discounted back to today. */
const strips = (k: number) => piece(k, 220, 120, (c, W, H) => {
  const base = H - 10 * k;
  const x1 = W - 16 * k;
  bar(c, x1 - 3 * k, base, base - 0.86 * (H - 22 * k), 6 * k, INK.light);
  const curve = xs(60, 0, 1).map((t) => [12 * k + t * (x1 - 12 * k), base - Math.exp(-1.5 * (1 - t)) * 0.86 * (H - 22 * k)] as Pt);
  stroke(c, curve, INK.brand, Math.max(0.9, 1 * k), [4 * k, 3 * k]);
  bar(c, 9 * k, base, base - Math.exp(-1.5) * 0.86 * (H - 22 * k), 6 * k, INK.mid);
  rule(c, 6 * k, W - 6 * k, base, k);
});

/** The PIR rules, nested: qualifying holdings, outside the main index, outside main and mid. */
const pirNest = (k: number) => piece(k, 200, 120, (c, W, H) => {
  const rect = (x: number, y: number, w: number, h: number, color: string, fill?: string) => {
    if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
    c.strokeStyle = color;
    c.lineWidth = Math.max(0.8, 0.9 * k);
    c.strokeRect(x, y, w, h);
  };
  const x = 8 * k;
  const y = 8 * k;
  const w = W - 16 * k;
  const h = H - 16 * k;
  rect(x, y, w, h, 'rgba(106, 90, 171, 0.6)');
  rect(x, y, w * Math.sqrt(0.7), h * Math.sqrt(0.7), INK.brand, FILL.faint);
  rect(x, y, w * Math.sqrt(0.175), h * Math.sqrt(0.175), INK.light, FILL.mid);
  rect(x, y, w * Math.sqrt(0.035), h * Math.sqrt(0.035), INK.hi, FILL.hi);
});

/** Italian equity by size: large, mid and small caps, the names in each. */
const sizeTiers = (k: number) => piece(k, 220, 100, (c, W, H) => {
  const tiers = [[0.42, 6], [0.3, 7], [0.16, 4]] as const;
  let y = 8 * k;
  tiers.forEach(([h, n], i) => {
    const hh = h * (H - 16 * k);
    c.fillStyle = [FILL.hi, FILL.mid, FILL.low][i];
    c.fillRect(8 * k, y, W - 16 * k, hh - 3 * k);
    for (let s = 0; s < n; s += 1) vrule(c, 16 * k + s * 9 * k, y + 3 * k, y + hh - 6 * k, k, INK.light);
    y += hh;
  });
});

/** The weighting rule: a base weight for every name, a bonus for the best picks, less for the illiquid. */
const weightRule = (k: number) => piece(k, 230, 100, (c, W, H) => {
  const w = [1, 1, 1.6, 1, 1, 1, 1.6, 1, 1, 0.6, 1, 1, 1.6, 1, 0.6, 1];
  const base = H - 10 * k;
  const bw = (W - 12 * k) / w.length;
  w.forEach((v, i) => bar(c, 6 * k + i * bw, base, base - v * (H - 24 * k) * 0.55, bw - 3 * k, v > 1 ? INK.light : v < 1 ? INK.low : FILL.mid));
  dashed(c, [4 * k, base - (H - 24 * k) * 0.55], [W - 4 * k, base - (H - 24 * k) * 0.55], INK.brand, k);
  rule(c, 4 * k, W - 4 * k, base, k);
});

/** The two-index benchmark: large caps and mid-small caps, blended; the fund against it. */
const benchmarkBlend = (k: number) => piece(k, 230, 120, (c, W, H) => {
  const n = 80;
  const a = walk(n, 101, 0.1, 0.6);
  const b = walk(n, 102, -0.02, 0.7);
  const blend = a.map((v, i) => 0.6 * v + 0.4 * b[i]);
  const r = seeded(103);
  const fund = blend.map((v, i) => v - 0.02 * i + 0.25 * gauss(r));
  const all = [...a, ...b, ...fund];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const X = xs(n, 6 * k, W - 6 * k);
  stroke(c, zip(X, fit(a, 10 * k, H - 10 * k, lo, hi)), INK.low, Math.max(0.8, 0.8 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, fit(b, 10 * k, H - 10 * k, lo, hi)), INK.low, Math.max(0.8, 0.8 * k), [3 * k, 2 * k]);
  stroke(c, zip(X, fit(blend, 10 * k, H - 10 * k, lo, hi)), INK.brand, lw(k));
  stroke(c, zip(X, fit(fund, 10 * k, H - 10 * k, lo, hi)), INK.light, lw(k));
});

/** The cash conversion cycle: inventory days and receivable days, less payable days. */
const cashCycle = (k: number) => piece(k, 230, 90, (c, W, H) => {
  const x0 = 10 * k;
  const unit = (W - 20 * k) / 1.4;
  const y = H * 0.35;
  c.fillStyle = FILL.mid;
  c.fillRect(x0, y, 0.45 * unit, 12 * k);
  c.fillStyle = FILL.hi;
  c.fillRect(x0 + 0.45 * unit, y, 0.95 * unit, 12 * k);
  c.fillStyle = FILL.low;
  c.fillRect(x0, y + 18 * k, 1.05 * unit, 12 * k);
  vrule(c, x0 + 1.05 * unit, y - 6 * k, y + 36 * k, k, INK.hi);
  vrule(c, x0 + 1.4 * unit, y - 6 * k, y + 18 * k, k, INK.hi);
  dashed(c, [x0 + 1.05 * unit, y - 3 * k], [x0 + 1.4 * unit, y - 3 * k], INK.light, k);
  rule(c, x0, x0 + 1.4 * unit, H - 10 * k, k);
});

/** A bank's capital: the ratio, the requirement, the headroom between. */
const capitalBar = (k: number) => piece(k, 150, 130, (c, W, H) => {
  const base = H - 10 * k;
  const x = W * 0.32;
  const bw = W * 0.3;
  const top = base - 0.82 * (H - 20 * k);
  const req = base - 0.5 * (H - 20 * k);
  c.fillStyle = FILL.mid;
  c.fillRect(x, top, bw, base - top);
  dashed(c, [8 * k, req], [W - 8 * k, req], INK.hi, k);
  stroke(c, [[x + bw + 6 * k, req], [x + bw + 10 * k, req], [x + bw + 10 * k, top], [x + bw + 6 * k, top]], INK.light, Math.max(0.8, 0.9 * k));
  rule(c, 6 * k, W - 6 * k, base, k);
});

/** Public debt: the ratio's path when the interest rate exceeds growth, and when it does not. */
const debtDynamics = (k: number) => piece(k, 230, 110, (c, W, H) => {
  const n = 50;
  const X = xs(n, 6 * k, W - 6 * k);
  const up = X.map((_, i) => H * 0.55 - Math.pow(i / (n - 1), 1.6) * H * 0.4);
  const down = X.map((_, i) => H * 0.55 + Math.pow(i / (n - 1), 1.4) * H * 0.3);
  dashed(c, [6 * k, H * 0.55], [W - 6 * k, H * 0.55], INK.low, k);
  stroke(c, zip(X, up), INK.light, lw(k));
  stroke(c, zip(X, down), INK.brand, lw(k));
});

export const EXHIBITS: Record<ExhibitId, (k: number) => Painter> = {
  localVolSurface, pdvSurface, charSpiral, barrierPaths, arFan, vrpSpline, levyArea, priceYield,
  meritOrder, reserveShares, tariffHistory, policyLadder, ledgerBlocks, creditNetwork,
  sensitivityGrid, footballField, rebasedPair, compsGrid, riFade, cet1Bars, roeCapital, roicWacc,
  preferenceBoard, curvePair, bundStep, spreadLevels, cointegrated, garchClusters, transitsCollapse, goldRealYield,
  factorBars, bookSilhouette, correlationGrid, nsBetas, studentT, hrpTree, garchRolling, momentumCrash,
  scoreLadder, keyRateLadder, curveShifts, cashflowComb, sleeveBalance, bootstrap, fxForward, addsRemovals,
  supplyGap, valuationStack, covarianceGrid, allocationBlocks, tracking, maturitySlide, hedgePair,
  factorTilt, termStructure, strips, pirNest, sizeTiers, weightRule, benchmarkBlend, cashCycle,
  capitalBar, debtDynamics,
};
