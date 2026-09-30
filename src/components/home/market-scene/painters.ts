// =====================================================================
// The pieces of the scene, each drawn ONCE into its own image.
// ---------------------------------------------------------------------
// Nothing in this file runs per frame. Every function returns a `Painter`:
// a size and a function that draws the piece into a context at that size.
// The engine calls it once, keeps the result as a bitmap (plus two
// defocused copies), and from then on moving a DCF table across the screen
// costs one image copy rather than two hundred calls to fillText.
//
// Coordinates are CSS pixels at the scene's current unit `u`, which scales
// everything down on a phone and up on a large monitor.
// =====================================================================

import {
  buildDcf, candleSeries, correlationMatrix, oneDecimal, YIELD_CURVE,
  type DcfModel, type MacroRow,
} from './content';
import { monthLabel, type FundSeries } from './fund-series';
import { SANS, SERIF, tracked, trackedWidth, typeset } from './typeset';

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

/** Equity-research convention: negatives in brackets, not with a sign. */
const money = (v: number) => (v < 0 ? `(${oneDecimal(-v)})` : oneDecimal(v));

function heading(c: CanvasRenderingContext2D, text: string, x: number, y: number, u: number, color = INK.mid) {
  c.font = `700 ${8.6 * u}px ${SANS}`;
  c.fillStyle = color;
  return tracked(c, text.toUpperCase(), x, y, 1.5 * u);
}

/**
 * A panel is a hairline and a short brighter tick, and no box. A filled
 * card turns into a grey slab the moment it is out of focus; bare type and
 * rules turn into light, which is what a defocused screen actually does.
 */
function panelFrame(c: CanvasRenderingContext2D, w: number, u: number) {
  c.fillStyle = INK.rule;
  c.fillRect(0, 0, w, Math.max(1, u));
  // A short brighter tick at the top left: the one accent a panel carries.
  c.fillStyle = INK.brand;
  c.fillRect(0, 0, 22 * u, Math.max(1, 1.4 * u));
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
      box.draw(c, pad, pad + box.a);
    },
  };
}

export function glyphPainter(ch: string, size: number, color: string): Painter {
  return {
    w: size * 1.1,
    h: size * 1.2,
    paint: (c) => {
      c.font = `italic 400 ${size}px ${SERIF}`;
      c.fillStyle = color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(ch, size * 0.55, size * 0.6);
    },
  };
}

// ---------------------------------------------------------------------

let dcfModel: DcfModel | null = null;
const dcf = () => (dcfModel ??= buildDcf());

export function dcfPainter(u: number): Painter {
  const m = dcf();
  const pad = 14 * u;
  const labelW = 112 * u;
  const colW = 50 * u;
  const rowH = 14.2 * u;
  const headH = 40 * u;
  const footH = 44 * u;
  const w = pad * 2 + labelW + colW * m.years.length;
  const h = headH + rowH * m.rows.length + footH + pad * 0.6;
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'DCF valuation', pad, 16 * u, u, INK.brand);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      c.textAlign = 'right';
      c.fillText('EUR m, base case', w - pad, 16 * u);

      c.font = `700 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.mid;
      m.years.forEach((y, i) => c.fillText(y, pad + labelW + colW * (i + 1), 32 * u));
      c.fillStyle = INK.rule;
      c.fillRect(pad, headH - 3 * u, w - pad * 2, Math.max(0.6, 0.6 * u));

      m.rows.forEach((row, r) => {
        const y = headH + rowH * (r + 0.72);
        c.textAlign = 'left';
        c.font = `${row.strong ? 700 : 400} ${(row.quiet ? 8.6 : 9.6) * u}px ${SANS}`;
        c.fillStyle = row.strong ? INK.light : row.quiet ? INK.low : INK.brand;
        c.fillText(row.quiet ? `  ${row.label}` : row.label, pad, y);
        c.textAlign = 'right';
        row.values.forEach((v, i) => {
          if (v === null) return;
          const text = row.kind === 'pct' ? `${(v * 100).toFixed(1)}%` : row.kind === 'factor' ? v.toFixed(3) : money(v);
          c.fillText(text, pad + labelW + colW * (i + 1), y);
        });
        if (row.strong) {
          c.fillStyle = INK.rule;
          c.fillRect(pad, headH + rowH * r - 1 * u, w - pad * 2, Math.max(0.5, 0.5 * u));
        }
      });

      // The footer: the handful of numbers the whole table exists to reach.
      const fy = headH + rowH * m.rows.length + 6 * u;
      c.fillStyle = INK.rule;
      c.fillRect(pad, fy, w - pad * 2, Math.max(0.6, 0.6 * u));
      const pick = (label: string) => m.summary.find((s) => s.label === label)?.value ?? '';
      const cells: [string, string, boolean][] = [
        ['WACC', pick('WACC'), false],
        ['g', pick('Terminal growth'), false],
        ['EV', pick('Enterprise value'), false],
        ['Equity', pick('Equity value'), false],
        ['Per share', pick('Implied value per share'), true],
        ['Upside', pick('Upside to €43.40'), true],
      ];
      const cw = (w - pad * 2) / 3;
      cells.forEach(([k, v, strong], i) => {
        const cx = pad + cw * (i % 3);
        const cy = fy + (i < 3 ? 16 : 32) * u;
        c.textAlign = 'left';
        c.font = `400 ${8.6 * u}px ${SANS}`;
        c.fillStyle = INK.low;
        c.fillText(k, cx, cy);
        c.font = `${strong ? 700 : 400} ${9.6 * u}px ${SANS}`;
        c.fillStyle = strong ? INK.hi : INK.brand;
        c.textAlign = 'right';
        c.fillText(v, cx + cw - 12 * u, cy);
      });
      c.textAlign = 'left';
    },
  };
}

export function sensitivityPainter(u: number): Painter {
  const { sensitivity: s } = dcf();
  const pad = 14 * u;
  const cell = 44 * u;
  const rowH = 17 * u;
  const lead = 46 * u;
  const w = pad * 2 + lead + cell * s.gs.length;
  const h = 48 * u + rowH * s.waccs.length + pad * 0.6;
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Implied value per share', pad, 16 * u, u, INK.brand);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      c.fillText('WACC  ↓     terminal growth  →', pad, 30 * u);
      c.font = `700 ${9.6 * u}px ${SANS}`;
      c.fillStyle = INK.mid;
      c.textAlign = 'right';
      s.gs.forEach((g, j) => c.fillText(`${(g * 100).toFixed(1)}%`, pad + lead + cell * (j + 1) - 6 * u, 44 * u));
      s.waccs.forEach((wacc, i) => {
        const y = 48 * u + rowH * (i + 0.8);
        c.font = `700 ${9.6 * u}px ${SANS}`;
        c.fillStyle = INK.mid;
        c.fillText(`${(wacc * 100).toFixed(1)}%`, pad + lead - 10 * u, y);
        s.grid[i].forEach((v, j) => {
          const centre = i === 2 && j === 2;
          if (centre) {
            c.fillStyle = 'rgba(175, 162, 210, 0.16)';
            c.fillRect(pad + lead + cell * j + 2 * u, y - rowH * 0.74, cell - 3 * u, rowH * 0.98);
          }
          c.font = `${centre ? 700 : 400} ${9.6 * u}px ${SANS}`;
          c.fillStyle = centre ? INK.hi : INK.brand;
          c.fillText(v.toFixed(2), pad + lead + cell * (j + 1) - 6 * u, y);
        });
      });
      c.textAlign = 'left';
    },
  };
}

// ---------------------------------------------------------------------

export function macroPainter(rows: MacroRow[], u: number): Painter {
  const pad = 14 * u;
  const rowH = 19 * u;
  const labelW = 118 * u;
  const sparkW = 64 * u;
  const valueW = 58 * u;
  const w = pad * 2 + labelW + sparkW + valueW;
  const h = 34 * u + rowH * rows.length + pad * 0.5;
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Macro monitor', pad, 16 * u, u, INK.brand);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      c.textAlign = 'right';
      c.fillText('latest', w - pad, 16 * u);
      rows.forEach((row, r) => {
        const y = 34 * u + rowH * r;
        const base = y + rowH * 0.62;
        c.textAlign = 'left';
        c.font = `400 ${9.6 * u}px ${SANS}`;
        c.fillStyle = INK.brand;
        c.fillText(row.label, pad, base);

        const lo = Math.min(...row.history);
        const hi = Math.max(...row.history);
        const span = hi - lo || 1;
        const sx = pad + labelW;
        const sy = y + rowH * 0.18;
        const sh = rowH * 0.55;
        c.strokeStyle = INK.mid;
        c.lineWidth = Math.max(0.8, 0.9 * u);
        c.beginPath();
        row.history.forEach((v, i) => {
          const px = sx + (i / (row.history.length - 1)) * (sparkW - 8 * u);
          const py = sy + sh - ((v - lo) / span) * sh;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        });
        c.stroke();
        const last = row.history[row.history.length - 1];
        c.fillStyle = INK.light;
        c.beginPath();
        c.arc(sx + sparkW - 8 * u, sy + sh - ((last - lo) / span) * sh, 1.5 * u, 0, Math.PI * 2);
        c.fill();

        c.textAlign = 'right';
        c.font = `700 ${9.6 * u}px ${SANS}`;
        c.fillStyle = INK.light;
        c.fillText(`${row.value.toFixed(row.decimals)}${row.unit}`, w - pad, base);
        if (r < rows.length - 1) {
          c.fillStyle = 'rgba(70, 58, 126, 0.55)';
          c.fillRect(pad, y + rowH, w - pad * 2, Math.max(0.5, 0.5 * u));
        }
      });
      c.textAlign = 'left';
    },
  };
}

// ---------------------------------------------------------------------

export function heatmapPainter(u: number): Painter {
  const n = 9;
  const m = correlationMatrix(n);
  const pad = 14 * u;
  const cell = 15 * u;
  const w = pad * 2 + cell * n;
  const h = 30 * u + cell * n + pad;
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Cross-asset correlation', pad, 16 * u, u, INK.brand);
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const v = m[i][j];
          c.fillStyle = v >= 0
            ? `rgba(175, 162, 210, ${0.08 + v * 0.62})`
            : `rgba(100, 84, 163, ${0.1 + -v * 0.5})`;
          c.fillRect(pad + cell * j + 0.8 * u, 28 * u + cell * i + 0.8 * u, cell - 1.6 * u, cell - 1.6 * u);
        }
      }
    },
  };
}

export function yieldCurvePainter(u: number): Painter {
  const pad = 14 * u;
  const pw = 210 * u;
  const ph = 92 * u;
  const w = pad * 2 + pw + 24 * u;
  const h = 36 * u + ph + 26 * u;
  const lo = 1.6;
  const hi = 4;
  const xs = YIELD_CURVE.tenors.map((t) => Math.sqrt(t) / Math.sqrt(30));
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Yield curve', pad, 16 * u, u, INK.brand);
      const x0 = pad;
      const y0 = 34 * u;
      const px = (k: number) => x0 + xs[k] * pw;
      const py = (v: number) => y0 + ph - ((v - lo) / (hi - lo)) * ph;
      c.fillStyle = 'rgba(70, 58, 126, 0.5)';
      [2, 3, 4].forEach((v) => c.fillRect(x0, py(v), pw, Math.max(0.5, 0.5 * u)));
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      [2, 3, 4].forEach((v) => c.fillText(`${v.toFixed(1)}%`, x0 + pw + 5 * u, py(v) + 3 * u));
      [0, 3, 5, 7, 9].forEach((k) => c.fillText(YIELD_CURVE.labels[k], px(k) - 6 * u, y0 + ph + 16 * u));

      const line = (vals: number[], dash: number[], color: string, width: number) => {
        c.setLineDash(dash);
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        vals.forEach((v, k) => (k === 0 ? c.moveTo(px(k), py(v)) : c.lineTo(px(k), py(v))));
        c.stroke();
        c.setLineDash([]);
      };
      line(YIELD_CURVE.b, [3 * u, 3 * u], INK.low, Math.max(0.8, u));
      line(YIELD_CURVE.a, [], INK.light, Math.max(1, 1.4 * u));
      c.fillStyle = INK.light;
      YIELD_CURVE.a.forEach((v, k) => {
        c.beginPath();
        c.arc(px(k), py(v), 1.7 * u, 0, Math.PI * 2);
        c.fill();
      });
      // The legend, right-aligned: a solid sample for today's curve and a
      // dashed one for a year ago, drawn rather than typed.
      c.font = `400 ${8.6 * u}px ${SANS}`;
      const ago = '12M ago';
      const now = 'Current';
      const sample = 12 * u;
      const gap = 5 * u;
      let x = w - pad - c.measureText(ago).width;
      c.fillStyle = INK.mid;
      c.fillText(ago, x, 16 * u);
      x -= gap + sample;
      c.fillStyle = INK.low;
      for (let k = 0; k < 3; k += 1) c.fillRect(x + k * 4.5 * u, 13 * u, 2.5 * u, Math.max(0.8, u));
      x -= 12 * u + c.measureText(now).width;
      c.fillStyle = INK.mid;
      c.fillText(now, x, 16 * u);
      x -= gap + sample;
      c.fillStyle = INK.light;
      c.fillRect(x, 13 * u, sample, Math.max(1, 1.2 * u));
    },
  };
}

export function networkPainter(u: number): Painter {
  const layers = [4, 7, 7, 3];
  const pad = 14 * u;
  const gw = 200 * u;
  const gh = 110 * u;
  const w = pad * 2 + gw;
  const h = 34 * u + gh + pad;
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Neural network', pad, 16 * u, u, INK.brand);
      const pos = layers.map((n, l) =>
        Array.from({ length: n }, (_, k) => ({
          x: pad + 12 * u + (l / (layers.length - 1)) * (gw - 24 * u),
          y: 34 * u + gh / 2 + (k - (n - 1) / 2) * (gh / 7.2),
        })),
      );
      c.lineWidth = Math.max(0.4, 0.5 * u);
      for (let l = 0; l < pos.length - 1; l += 1) {
        for (const a of pos[l]) {
          for (const b of pos[l + 1]) {
            c.strokeStyle = `rgba(142, 127, 201, ${0.12 + ((a.y * 13 + b.y * 7) % 10) / 40})`;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
      }
      pos.forEach((layer) =>
        layer.forEach((p) => {
          c.fillStyle = '#120b2e';
          c.beginPath();
          c.arc(p.x, p.y, 4.2 * u, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = INK.light;
          c.lineWidth = Math.max(0.8, 1 * u);
          c.stroke();
        }),
      );
    },
  };
}

export function distributionPainter(u: number): Painter {
  const pad = 14 * u;
  const gw = 220 * u;
  const gh = 86 * u;
  const w = pad * 2 + gw;
  const h = 34 * u + gh + 22 * u;
  const pdf = (x: number) => Math.exp(-0.5 * x * x);
  return {
    w,
    h,
    paint: (c) => {
      panelFrame(c, w, u);
      heading(c, 'Daily return distribution', pad, 16 * u, u, INK.brand);
      const x0 = pad;
      const y0 = 34 * u;
      const px = (z: number) => x0 + ((z + 4) / 8) * gw;
      const py = (v: number) => y0 + gh - v * gh * 0.94;
      // Histogram first, the density over it: the model laid on the data.
      const bins = 32;
      for (let b = 0; b < bins; b += 1) {
        const z = -4 + (b + 0.5) * (8 / bins);
        const v = pdf(z) * (0.9 + (((b * 37) % 11) / 11) * 0.2) + (Math.abs(z) > 2.6 ? 0.02 : 0);
        c.fillStyle = z < -1.645 ? 'rgba(175, 162, 210, 0.42)' : 'rgba(100, 84, 163, 0.34)';
        c.fillRect(px(z) - (gw / bins) * 0.42, py(v), (gw / bins) * 0.84, y0 + gh - py(v));
      }
      c.strokeStyle = INK.light;
      c.lineWidth = Math.max(1, 1.2 * u);
      c.beginPath();
      for (let k = 0; k <= 80; k += 1) {
        const z = -4 + (k / 80) * 8;
        if (k === 0) c.moveTo(px(z), py(pdf(z)));
        else c.lineTo(px(z), py(pdf(z)));
      }
      c.stroke();
      c.setLineDash([2 * u, 2.5 * u]);
      c.strokeStyle = INK.brand;
      c.beginPath();
      c.moveTo(px(-1.645), y0 + 4 * u);
      c.lineTo(px(-1.645), y0 + gh);
      c.stroke();
      c.setLineDash([]);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.light;
      c.fillText('VaR 95%', px(-1.645) - 40 * u, y0 + 12 * u);
      c.fillStyle = INK.low;
      c.fillText('−4σ', px(-4), y0 + gh + 15 * u);
      c.fillText('0', px(0) - 2 * u, y0 + gh + 15 * u);
      c.fillText('+4σ', px(4) - 16 * u, y0 + gh + 15 * u);
    },
  };
}

// ---------------------------------------------------------------------

export function candlesPainter(w: number, h: number, u: number, seed = 0): Painter {
  const n = Math.max(24, Math.round(w / (16 * u)));
  const data = candleSeries(n, seed);
  const lo = Math.min(...data.map((d) => d.l));
  const hi = Math.max(...data.map((d) => d.h));
  const step = w / n;
  const py = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  return {
    w,
    h,
    paint: (c) => {
      data.forEach((d, i) => {
        const x = i * step + step / 2;
        const up = d.c >= d.o;
        c.fillStyle = up ? INK.brand : INK.low;
        c.fillRect(x - Math.max(0.6, 0.6 * u), py(d.h), Math.max(1.2, 1.2 * u), py(d.l) - py(d.h));
        const top = py(Math.max(d.o, d.c));
        const bh = Math.max(2 * u, Math.abs(py(d.o) - py(d.c)));
        c.fillRect(x - step * 0.3, top, step * 0.6, bh);
      });
      // Volume, faint, along the foot.
      data.forEach((d, i) => {
        const v = 0.25 + Math.abs(d.c - d.o) / (d.o * 0.03);
        c.fillStyle = 'rgba(100, 84, 163, 0.45)';
        c.fillRect(i * step + step * 0.2, h - Math.min(1, v) * h * 0.16, step * 0.6, Math.min(1, v) * h * 0.16);
      });
    },
  };
}

/** An out-of-focus instrument ring, like a gauge seen too close. */
export function ringPainter(r: number, u: number): Painter {
  const size = r * 2 + 20 * u;
  return {
    w: size,
    h: size,
    paint: (c) => {
      const cx = size / 2;
      const cy = size / 2;
      c.lineCap = 'round';
      c.strokeStyle = INK.mid;
      c.lineWidth = Math.max(2, r * 0.05);
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = INK.light;
      c.lineWidth = Math.max(3, r * 0.1);
      c.beginPath();
      c.arc(cx, cy, r * 0.97, -Math.PI * 0.62, Math.PI * 0.18);
      c.stroke();
      c.strokeStyle = INK.brand;
      c.lineWidth = Math.max(1.5, r * 0.03);
      for (let k = 0; k < 48; k += 1) {
        const a = (k / 48) * Math.PI * 2;
        const inner = r * (k % 4 === 0 ? 0.78 : 0.84);
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        c.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
        c.stroke();
      }
      c.lineWidth = Math.max(2, r * 0.04);
      c.strokeStyle = INK.mid;
      c.beginPath();
      c.arc(cx, cy, r * 0.62, Math.PI * 0.3, Math.PI * 1.4);
      c.stroke();
    },
  };
}

/** A soft round light, used for the chart's leading point and the dust. */
export function glowPainter(r: number, color = '215, 205, 245'): Painter {
  return {
    w: r * 2,
    h: r * 2,
    paint: (c) => {
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, `rgba(${color}, 0.9)`);
      g.addColorStop(0.18, `rgba(${color}, 0.42)`);
      g.addColorStop(0.5, `rgba(${color}, 0.1)`);
      g.addColorStop(1, `rgba(${color}, 0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, r * 2, r * 2);
    },
  };
}

// ---------------------------------------------------------------------
// The funds' lines.
// ---------------------------------------------------------------------

/** Margins of a fund's line bitmap, in units of `u`. */
export const RUN_MARGIN = { pad: 8, top: 16, bottom: 24, end: 124 };

/** The vertical scale both funds share, so the gridlines never move. */
export interface RunScale {
  /** The value domain, in percent. */
  lo: number;
  hi: number;
  /** Round gridline values inside it. */
  ticks: number[];
}

/** "+48.3%", with a true minus sign for a loss. */
export function signedPct(v: number) {
  return `${v > 0 ? '+' : v < 0 ? '\u2212' : ''}${Math.abs(v).toFixed(1)}%`;
}

/**
 * One fund's whole line, drawn once, `L` pixels long: the area under it,
 * the months along its foot (a hair for each, the year at each January,
 * the first month in full), the glow, the line itself, and the latest
 * month labelled at its end with the fund's name, so a finished line
 * still says whose it is after its caption has travelled off screen.
 *
 * The engine reveals it a little more each frame by copying only the part
 * the pen has passed, so it is drawn once per fund, not once per frame.
 * Its first month sits at (pad, y) inside the bitmap.
 */
export function runPainter(series: FundSeries, L: number, chh: number, s: RunScale, u: number): Painter & { pad: number; top: number } {
  const pad = RUN_MARGIN.pad * u;
  const top = RUN_MARGIN.top * u;
  const bottom = RUN_MARGIN.bottom * u;
  const end = RUN_MARGIN.end * u;
  const pts = series.points;
  const n = pts.length;
  const px = (i: number) => pad + (i / (n - 1)) * L;
  const py = (v: number) => top + chh - ((v - s.lo) / (s.hi - s.lo)) * chh;
  const base = top + chh;
  return {
    w: pad + L + end,
    h: top + chh + bottom,
    pad,
    top,
    paint: (c) => {
      const trace = () => {
        c.beginPath();
        c.moveTo(px(0), py(pts[0].value));
        for (let i = 1; i < n; i += 1) c.lineTo(px(i), py(pts[i].value));
      };
      trace();
      c.lineTo(px(n - 1), base);
      c.lineTo(px(0), base);
      c.closePath();
      const area = c.createLinearGradient(0, top, 0, base);
      area.addColorStop(0, 'rgba(179, 166, 216, 0.2)');
      area.addColorStop(1, 'rgba(179, 166, 216, 0)');
      c.fillStyle = area;
      c.fill();

      c.font = `400 ${8.6 * u}px ${SANS}`;
      const lw = Math.max(0.6, 0.7 * u);
      pts.forEach((p, i) => {
        const x = px(i);
        const jan = p.month === 0;
        c.fillStyle = jan ? 'rgba(147, 132, 206, 0.75)' : 'rgba(106, 90, 171, 0.45)';
        c.fillRect(x - lw / 2, base + 2 * u, lw, (jan ? 6 : 3) * u);
        // Each January names its year, except one crowding the first month.
        if (jan && i >= 4) {
          c.fillStyle = INK.low;
          c.textAlign = 'center';
          c.fillText(String(p.year), x, base + 18 * u);
        }
      });
      c.textAlign = 'left';
      c.fillStyle = INK.mid;
      c.fillText(monthLabel(pts[0]), px(0), base + 18 * u);

      c.lineJoin = 'round';
      c.lineCap = 'round';
      trace();
      c.strokeStyle = 'rgba(179, 166, 216, 0.18)';
      c.lineWidth = 6 * u;
      c.stroke();
      const core = c.createLinearGradient(pad, 0, pad + L, 0);
      core.addColorStop(0, 'rgba(179, 166, 216, 0.45)');
      core.addColorStop(0.35, 'rgba(221, 213, 247, 0.9)');
      core.addColorStop(1, 'rgba(245, 242, 254, 1)');
      c.strokeStyle = core;
      c.lineWidth = Math.max(1.3, 1.7 * u);
      c.stroke();

      c.fillStyle = INK.brand;
      c.beginPath();
      c.arc(px(0), py(pts[0].value), 2 * u, 0, Math.PI * 2);
      c.fill();
      const last = pts[n - 1];
      const lx = px(n - 1);
      const ly = py(last.value);
      c.fillStyle = INK.hi;
      c.beginPath();
      c.arc(lx, ly, 2.4 * u, 0, Math.PI * 2);
      c.fill();
      c.font = `700 ${10.6 * u}px ${SANS}`;
      c.fillText(signedPct(last.value), lx + 9 * u, ly - 3 * u);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.mid;
      c.fillText(`${series.short} \u00b7 ${monthLabel(last)}`, lx + 9 * u, ly + 10 * u);
    },
  };
}

/**
 * The fund's name and what the line measures, set above the start of its
 * line. A separate bitmap from the line, because the line is revealed a
 * little at a time and the caption must be there from its first month.
 */
export function fundCaptionPainter(series: FundSeries, u: number): Painter {
  const m = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
  const name = series.name.toUpperCase();
  const detail = `Cumulative return since ${monthLabel(series.points[0])}`;
  m.font = `700 ${8.6 * u}px ${SANS}`;
  const w1 = trackedWidth(m, name, 1.5 * u);
  m.font = `400 ${8.6 * u}px ${SANS}`;
  const w2 = m.measureText(detail).width;
  return {
    w: Math.max(w1, w2) + 4 * u,
    h: 28 * u,
    paint: (c) => {
      heading(c, name, 0, 10 * u, u, INK.brand);
      c.font = `400 ${8.6 * u}px ${SANS}`;
      c.fillStyle = INK.low;
      c.fillText(detail, 0, 24 * u);
    },
  };
}
