// =====================================================================
// A very small formula typesetter for canvas.
// ---------------------------------------------------------------------
// Canvas text has no subscripts, no fractions and no radicals, and a
// derivatives formula flattened onto one line ("d1 = (ln(S/K) + ...) /
// (s sqrt(T))") reads as a spreadsheet cell, not as mathematics. Pulling
// in a TeX engine for a background would cost more than the rest of the
// homepage's scripts together, so this handles exactly the subset the
// scene uses, and nothing else:
//
//   x_1  x^2  x_{t+1}^{*}      scripts, single token or braced group
//   \frac{a}{b}                 stacked fraction on the maths axis
//   \sqrt{x}                    radical with its overbar
//   \hat{x}  \bar{x}            accents
//   \op{ln}                     upright text (operators, abbreviations)
//   \left( ... \right)          taller delimiters
//   \,                          thin space; a plain space is a medium one
//
// Following TeX's convention, Latin and lowercase Greek letters are set in
// italic and everything else upright. A hyphen is set as a true minus.
//
// It runs only while a sprite is being built, never per frame, so it is
// written for clarity rather than speed.
// =====================================================================

export const SERIF = '"EB Garamond", "Times New Roman", Times, serif';
export const SANS = 'Calibri, Carlito, Arial, Helvetica, sans-serif';

type Node =
  | { t: 'chars'; s: string; up?: boolean; big?: boolean }
  | { t: 'row'; c: Node[] }
  | { t: 'scr'; b: Node; sub?: Node; sup?: Node }
  | { t: 'frac'; n: Node; d: Node }
  | { t: 'sqrt'; b: Node }
  | { t: 'acc'; b: Node; k: 'hat' | 'bar' }
  | { t: 'sp'; em: number };

export interface Box {
  /** Advance width. */
  w: number;
  /** Height above the baseline. */
  a: number;
  /** Depth below the baseline. */
  d: number;
  draw: (c: CanvasRenderingContext2D, x: number, y: number) => void;
}

function parse(src: string): Node {
  let i = 0;

  const group = (stop: string): Node => {
    const c: Node[] = [];
    while (i < src.length && src[i] !== stop) c.push(scripted());
    if (src[i] === stop) i += 1;
    return { t: 'row', c };
  };

  const arg = (): Node => {
    if (src[i] === '{') {
      i += 1;
      return group('}');
    }
    return atom();
  };

  const scripted = (): Node => {
    const b = atom();
    let sub: Node | undefined;
    let sup: Node | undefined;
    while (src[i] === '_' || src[i] === '^') {
      const k = src[i];
      i += 1;
      if (k === '_') sub = arg();
      else sup = arg();
    }
    return sub || sup ? { t: 'scr', b, sub, sup } : b;
  };

  const atom = (): Node => {
    const ch = src[i];
    if (ch === '{') {
      i += 1;
      return group('}');
    }
    if (ch === '\\') {
      i += 1;
      const m = /^[A-Za-z]+/.exec(src.slice(i));
      if (!m) {
        const lit = src[i];
        i += 1;
        return lit === ',' ? { t: 'sp', em: 0.17 } : { t: 'chars', s: lit, up: true };
      }
      const name = m[0];
      i += name.length;
      switch (name) {
        case 'frac': {
          const n = arg();
          const d = arg();
          return { t: 'frac', n, d };
        }
        case 'sqrt':
          return { t: 'sqrt', b: arg() };
        case 'hat':
          return { t: 'acc', b: arg(), k: 'hat' };
        case 'bar':
          return { t: 'acc', b: arg(), k: 'bar' };
        case 'left':
        case 'right': {
          const s = src[i];
          i += 1;
          return { t: 'chars', s, up: true, big: true };
        }
        case 'op': {
          if (src[i] !== '{') return { t: 'chars', s: 'op', up: true };
          const end = src.indexOf('}', i);
          const s = src.slice(i + 1, end);
          i = end + 1;
          return { t: 'chars', s, up: true };
        }
        default:
          return { t: 'chars', s: name, up: true };
      }
    }
    i += 1;
    if (ch === ' ') return { t: 'sp', em: 0.2 };
    return { t: 'chars', s: ch === '-' ? '−' : ch };
  };

  return group('\u0000');
}

const ITALIC = /^[A-Za-zα-ω]$/;
/** Lowercase letters with no ascender, for placing accents. */
const SHORT = /^[acegmnopqrsuvwxyzαγεηκμνοπρστυχω]$/;

function fontFor(size: number, italic: boolean) {
  return `${italic ? 'italic ' : ''}400 ${size}px ${SERIF}`;
}

function layout(n: Node, size: number, c: CanvasRenderingContext2D): Box {
  switch (n.t) {
    case 'sp':
      return { w: n.em * size, a: 0, d: 0, draw: () => {} };

    case 'chars': {
      const s = n.big ? size * 1.38 : size;
      const italic = !n.up && ITALIC.test(n.s);
      const font = fontFor(s, italic);
      c.font = font;
      // Italic glyphs lean past their advance; a hair of room stops a
      // following upright bracket from touching them.
      const w = c.measureText(n.s).width + (italic ? size * 0.04 : 0);
      // A taller delimiter is centred on the maths axis, not stood on the
      // baseline, so it wraps the fraction it encloses evenly.
      const drop = n.big ? (s - size) * 0.36 : 0;
      return {
        w,
        a: s * 0.72 - drop,
        d: s * 0.24 + drop,
        draw: (ctx, x, y) => {
          ctx.font = font;
          ctx.fillText(n.s, x, y + drop);
        },
      };
    }

    case 'row': {
      const kids = n.c.map((k) => layout(k, size, c));
      const w = kids.reduce((s, k) => s + k.w, 0);
      const a = kids.reduce((m, k) => Math.max(m, k.a), size * 0.5);
      const d = kids.reduce((m, k) => Math.max(m, k.d), 0);
      return {
        w,
        a,
        d,
        draw: (ctx, x, y) => {
          let cx = x;
          for (const k of kids) {
            k.draw(ctx, cx, y);
            cx += k.w;
          }
        },
      };
    }

    case 'scr': {
      const b = layout(n.b, size, c);
      const ss = size * 0.7;
      const sub = n.sub ? layout(n.sub, ss, c) : null;
      const sup = n.sup ? layout(n.sup, ss, c) : null;
      const supUp = Math.max(size * (sub ? 0.44 : 0.4), b.a - ss * 0.5);
      const subDown = size * (sup ? 0.26 : 0.2);
      const gap = size * 0.03;
      return {
        w: b.w + Math.max(sub?.w ?? 0, sup?.w ?? 0) + gap,
        a: Math.max(b.a, sup ? sup.a + supUp : 0),
        d: Math.max(b.d, sub ? sub.d + subDown : 0),
        draw: (ctx, x, y) => {
          b.draw(ctx, x, y);
          if (sup) sup.draw(ctx, x + b.w + gap, y - supUp);
          if (sub) sub.draw(ctx, x + b.w + gap * 0.5, y + subDown);
        },
      };
    }

    case 'frac': {
      const fs = size * 0.8;
      const num = layout(n.n, fs, c);
      const den = layout(n.d, fs, c);
      const axis = size * 0.27;
      const gap = size * 0.14;
      const rule = Math.max(0.8, size * 0.045);
      const pad = size * 0.12;
      const w = Math.max(num.w, den.w) + pad * 2;
      return {
        w,
        a: axis + gap + num.d + num.a,
        d: gap + den.a + den.d - axis,
        draw: (ctx, x, y) => {
          num.draw(ctx, x + (w - num.w) / 2, y - axis - gap - num.d);
          den.draw(ctx, x + (w - den.w) / 2, y - axis + gap + den.a);
          ctx.fillRect(x + pad * 0.5, y - axis - rule / 2, w - pad, rule);
        },
      };
    }

    case 'sqrt': {
      const b = layout(n.b, size, c);
      const lead = size * 0.62;
      const top = b.a + size * 0.14;
      const lw = Math.max(0.8, size * 0.05);
      return {
        w: lead + b.w + size * 0.06,
        a: top + lw,
        d: Math.max(b.d, size * 0.06),
        draw: (ctx, x, y) => {
          ctx.save();
          ctx.lineWidth = lw;
          ctx.lineJoin = 'miter';
          ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath();
          ctx.moveTo(x + size * 0.04, y - size * 0.3);
          ctx.lineTo(x + size * 0.16, y - size * 0.37);
          ctx.lineTo(x + size * 0.34, y + b.d * 0.6);
          ctx.lineTo(x + lead - size * 0.06, y - top);
          ctx.lineTo(x + lead + b.w + size * 0.06, y - top);
          ctx.stroke();
          ctx.restore();
          b.draw(ctx, x + lead, y);
        },
      };
    }

    case 'acc': {
      const b = layout(n.b, size, c);
      const lift = size * 0.12;
      // A short lowercase letter carries its accent just above its own
      // top, not above the height of a capital: a hat over `y` floating at
      // capital height reads as a stray mark.
      const short = n.b.t === 'chars' && SHORT.test(n.b.s);
      const top0 = short ? size * 0.46 : b.a;
      return {
        w: b.w,
        a: Math.max(b.a, top0 + lift + size * 0.12),
        d: b.d,
        draw: (ctx, x, y) => {
          b.draw(ctx, x, y);
          const cx = x + b.w / 2 + size * 0.05;
          const top = y - top0 - lift;
          ctx.save();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(0.8, size * 0.045);
          ctx.beginPath();
          if (n.k === 'hat') {
            ctx.moveTo(cx - size * 0.16, top + size * 0.02);
            ctx.lineTo(cx, top - size * 0.09);
            ctx.lineTo(cx + size * 0.16, top + size * 0.02);
          } else {
            ctx.moveTo(x + size * 0.06, top);
            ctx.lineTo(x + b.w + size * 0.02, top);
          }
          ctx.stroke();
          ctx.restore();
        },
      };
    }
  }
}

/** Lays out a formula at `size` CSS pixels, ready to be drawn. */
export function typeset(src: string, size: number, c: CanvasRenderingContext2D): Box {
  return layout(parse(src), size, c);
}

/**
 * Draws `text` with extra tracking, for the small capitals the panels
 * use as headings. `letterSpacing` on the context is not available in
 * every browser the site supports, so the spacing is done by hand.
 */
export function tracked(c: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cx = x;
  for (const ch of text) {
    c.fillText(ch, cx, y);
    cx += c.measureText(ch).width + tracking;
  }
  return cx - x - tracking;
}

/** Width `tracked` would use, without drawing. */
export function trackedWidth(c: CanvasRenderingContext2D, text: string, tracking: number) {
  let w = 0;
  for (const ch of text) w += c.measureText(ch).width + tracking;
  return Math.max(0, w - tracking);
}
