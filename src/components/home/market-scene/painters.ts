// =====================================================================
// The pieces of the scene, each drawn ONCE into its own image.
// ---------------------------------------------------------------------
// Nothing in this file runs per frame. Every function returns a `Painter`:
// a size and a function that draws the piece into a context at that size.
// The engine calls it once, keeps the result as a bitmap (plus its
// defocused copies), and from then on moving a panel across the screen
// costs one image copy rather than a hundred calls to fillText.
//
// Coordinates are CSS pixels at the scene's current unit `u`, which scales
// everything down on a phone and up on a large monitor.
//
// THE ONLY FIGURES DRAWN HERE ARE OFFICIAL ONES (Step 93B): the market
// monitor's rows and the funds' cumulative returns arrive as finished
// text from the key numbers registry (see MarketScene), the same text the
// page prints in its ticker, and the funds' lines are the database's own
// month-by-month cumulative returns (lib/fund-lines.ts). Nothing is
// computed, rounded or animated here.
// =====================================================================

import { monthBefore, monthIndex, type FundLinesSnapshot, type LineFund } from '@/lib/fund-lines';
import { SANS, tracked, typeset } from './typeset';

export interface Painter {
  w: number;
  h: number;
  paint: (c: CanvasRenderingContext2D) => void;
}

/**
 * The palette: Minerva's lavender, and the darker and lighter steps of it,
 * a shade brighter than the brand's #AFA2D2 so that it carries against the
 * near-black ground. The ground itself is CSS, not canvas.
 */
export const INK = {
  hi: '#F5F2FE',
  light: '#DDD5F7',
  brand: '#B3A6D8',
  mid: '#9384CE',
  low: '#6A5AAB',
  rule: '#4A3D86',
};

/** One row of the market monitor, as the page's ticker prints it. */
export interface MonitorRow {
  slug: string;
  label: string;
  value: string;
  date: string;
}

/** A fund's official cumulative return, as text, and the month it is true at. */
export interface FundTag {
  fund: LineFund;
  name: string;
  value: string;
  date: string;
  /** "YYYY-MM": the line is drawn up to this month and no further. */
  month: string;
}

/** Everything official a scene draws. */
export interface SceneFigures {
  monitor: MonitorRow[];
  tags: FundTag[];
  lines: FundLinesSnapshot['lines'];
}

function heading(c: CanvasRenderingContext2D, text: string, x: number, y: number, u: number, color = INK.mid) {
  c.font = `700 ${8 * u}px ${SANS}`;
  c.fillStyle = color;
  return tracked(c, text.toUpperCase(), x, y, 1.4 * u);
}

/**
 * A panel is a hairline and a short brighter tick, and no box. A filled
 * card turns into a grey slab the moment it is out of focus; bare type and
 * rules turn into light, which is what a defocused screen actually does.
 */
function panelFrame(c: CanvasRenderingContext2D, w: number, u: number) {
  c.fillStyle = INK.rule;
  c.fillRect(0, 0, w, Math.max(1, 0.8 * u));
  c.fillStyle = INK.brand;
  c.fillRect(0, 0, 20 * u, Math.max(1, 1.3 * u));
}

// ---------------------------------------------------------------------

export function formulaPainter(src: string, size: number, color: string): Painter {
  const m = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
  const box = typeset(src, size, m);
  const pad = size * 0.2;
  return {
    w: box.w + pad * 2,
    h: box.a + box.d + pad * 2,
    paint: (c) => {
      c.fillStyle = color;
      c.strokeStyle = color;
      box.draw(c, pad, pad + box.a);
    },
  };
}

/**
 * The market monitor: official series, each with its date and its value,
 * exactly as the ticker at the foot of the hero prints them. Fixed: the
 * figures never move or tick; the scene's motion is the camera's.
 */
export function monitorPainter(rows: MonitorRow[], u: number, title: string): Painter {
  const w = 268 * u;
  const rh = 17 * u;
  const top = 30 * u;
  return {
    w,
    h: top + rows.length * rh + 6 * u,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, title, 0, 16 * u, u, INK.brand);
      c.font = `600 ${7 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      c.textAlign = 'right';
      c.fillText('ECB · EUROSTAT · BIS', w, 16 * u);
      rows.forEach((r, i) => {
        const y = top + i * rh;
        c.textAlign = 'left';
        c.font = `400 ${8.8 * u}px ${SANS}`;
        c.fillStyle = INK.mid;
        c.fillText(r.label, 0, y + 8 * u);
        c.textAlign = 'right';
        c.font = `600 ${7.2 * u}px ${SANS}`;
        c.fillStyle = INK.low;
        c.fillText(r.date, w - 64 * u, y + 8 * u);
        c.font = `700 ${9.4 * u}px ${SANS}`;
        c.fillStyle = INK.hi;
        c.fillText(r.value, w, y + 8 * u);
        c.fillStyle = 'rgba(74, 61, 134, 0.5)';
        c.fillRect(0, y + 12.5 * u, w, Math.max(0.5, 0.6 * u));
      });
      c.textAlign = 'left';
    },
  };
}

/** Where the plot sits inside the chart's bitmap, for the scan head. */
export interface ChartGeometry {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const FUND_TONE: Record<LineFund, string> = { 'long-short': INK.hi, 'multi-asset': INK.brand };

/**
 * Both funds on one scale: the official line of each, month by month,
 * from zero at its inception, to the month its registry figure is true
 * at; that figure tagged at the line's end, as text from the registry.
 * Hairlines and month ticks, and no scale values: the only numbers on
 * this chart are the two official ones.
 */
export function fundsChartPainter(figures: SceneFigures, W: number, H: number, u: number): (Painter & { plot: ChartGeometry }) | null {
  const funds = (['long-short', 'multi-asset'] as LineFund[]).filter((f) => (figures.lines[f]?.points.length ?? 0) >= 2);
  if (!funds.length) return null;
  const tagOf = (f: LineFund) => figures.tags.find((t) => t.fund === f) ?? null;
  // Each line: zero before its first month, then the official cumulative
  // returns, up to the month its tag is true at.
  const series = funds.map((f) => {
    const line = figures.lines[f]!;
    const tag = tagOf(f);
    const until = tag ? monthIndex(tag.month) : Infinity;
    const pts = line.points.filter(([m]) => monthIndex(m) <= until);
    return { fund: f, tag, pts: [[monthBefore(line.first_month), 0] as [string, number], ...pts] };
  }).filter((s) => s.pts.length >= 2);
  if (!series.length) return null;
  const first = Math.min(...series.map((s) => monthIndex(s.pts[0][0])));
  const last = Math.max(...series.map((s) => monthIndex(s.pts[s.pts.length - 1][0])));
  const values = series.flatMap((s) => s.pts.map((p) => p[1]));
  const lo0 = Math.min(0, ...values);
  const hi0 = Math.max(0, ...values);
  const span = Math.max(1, hi0 - lo0);
  const lo = lo0 - span * 0.08;
  const hi = hi0 + span * 0.1;
  const tags = series.some((s) => s.tag);
  const right = tags ? 168 * u : 10 * u;
  const plot: ChartGeometry = { x0: 2 * u, x1: W - right, y0: 18 * u, y1: H - 18 * u };
  const x = (m: number) => plot.x0 + ((m - first) / Math.max(1, last - first)) * (plot.x1 - plot.x0);
  const y = (v: number) => plot.y1 - ((v - lo) / (hi - lo)) * (plot.y1 - plot.y0);
  return {
    w: W,
    h: H,
    plot,
    paint: (c) => {
      c.font = `600 ${7.2 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      tracked(c, 'CUMULATIVE RETURN SINCE INCEPTION · VIRTUAL PORTFOLIOS, NET, IN EUR', plot.x0, 9 * u, 1 * u);
      // Hairlines at quarter heights, the zero line brighter. No values.
      for (let q = 0; q <= 4; q += 1) {
        const yy = Math.round(plot.y0 + ((plot.y1 - plot.y0) * q) / 4) + 0.5;
        c.fillStyle = 'rgba(106, 90, 171, 0.22)';
        c.fillRect(plot.x0, yy, plot.x1 - plot.x0, Math.max(0.5, 0.6 * u));
      }
      const zy = Math.round(y(0)) + 0.5;
      c.fillStyle = 'rgba(147, 132, 206, 0.6)';
      c.fillRect(plot.x0, zy, plot.x1 - plot.x0, Math.max(1, 0.9 * u));
      // A hair for every month, longer for January.
      for (let m = first; m <= last; m += 1) {
        const xx = Math.round(x(m)) + 0.5;
        const jan = m % 12 === 0;
        c.fillStyle = jan ? 'rgba(147, 132, 206, 0.75)' : 'rgba(106, 90, 171, 0.4)';
        c.fillRect(xx, plot.y1 + 4 * u, Math.max(0.5, 0.6 * u), (jan ? 7 : 3) * u);
      }
      series.forEach((s) => {
        const pts = s.pts.map(([m, v]) => [x(monthIndex(m)), y(v)] as [number, number]);
        const tone = FUND_TONE[s.fund];
        c.lineJoin = 'miter';
        c.beginPath();
        pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
        c.strokeStyle = s.fund === 'long-short' ? 'rgba(245, 242, 254, 0.14)' : 'rgba(179, 166, 216, 0.16)';
        c.lineWidth = 4 * u;
        c.stroke();
        c.strokeStyle = tone;
        c.lineWidth = Math.max(1, 1.25 * u);
        c.setLineDash(s.fund === 'multi-asset' ? [5 * u, 2.5 * u] : []);
        c.stroke();
        c.setLineDash([]);
        const [lx, ly] = pts[pts.length - 1];
        c.fillStyle = tone;
        c.fillRect(lx - 2 * u, ly - 2 * u, 4 * u, 4 * u);
      });
      // The tags: the registry's figure for each fund, at the right, joined
      // to its line's end, the higher line's tag above the other's.
      const ordered = series.filter((s) => s.tag)
        .map((s) => ({ s, end: y(s.pts[s.pts.length - 1][1]), lx: x(monthIndex(s.pts[s.pts.length - 1][0])) }))
        .sort((a, b) => a.end - b.end);
      let floor = plot.y0;
      ordered.forEach(({ s, end, lx }) => {
        const ty = Math.max(floor + 6 * u, Math.min(plot.y1 - 14 * u, end));
        floor = ty + 26 * u;
        const tx = plot.x1 + 36 * u;
        c.strokeStyle = 'rgba(106, 90, 171, 0.7)';
        c.lineWidth = Math.max(0.6, 0.7 * u);
        c.beginPath();
        c.moveTo(lx + 5 * u, end);
        c.lineTo(tx - 4 * u, ty);
        c.stroke();
        const tag = s.tag as FundTag;
        c.font = `700 ${11 * u}px ${SANS}`;
        c.fillStyle = FUND_TONE[s.fund];
        c.fillText(tag.value, tx, ty + 4 * u);
        c.font = `500 ${7.6 * u}px ${SANS}`;
        c.fillStyle = INK.mid;
        c.fillText(`${tag.name} · ${tag.date}`, tx, ty + 15 * u);
      });
    },
  };
}
