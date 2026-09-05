import { useEffect, useMemo, useRef, useState } from 'react';
import { Block } from './DashboardKit';
import type { DivisionShare } from './useDashboardData';

// =====================================================================
// Reports by division: who writes the research.
// ---------------------------------------------------------------------
// A doughnut answers one question the bar chart beside it cannot: what
// SHARE of everything the association has published came from each
// division. The bar chart is about a semester; this is about the whole
// record, so it does not swing on a single late upload.
//
// EVERY DIVISION IS LABELLED ON ITS OWN SEGMENT. A detached legend asks
// the reader to match five colours to five names and then back to five
// slices, which is three readings to answer one question; a leader line
// from the segment to its name is one. Nothing is left in the middle of
// the ring, because a number in the hole is a different question again.
//
// THE RING IS DRAWN, NOT DECLARED. Each segment is one arc with its own
// dash offset, and the offsets run down in sequence, so the ring is laid
// in as a single continuous stroke and the labels arrive after it. It is
// a fixed viewBox scaled to the card, so the whole composition keeps its
// proportions at every width without measuring anything, without a
// resize observer and without a second render.
//
// It is live: the shares come from the same published `archive_files`
// rows as everything else, so publishing, deleting or reassigning a
// report moves the ring.
// =====================================================================

/**
 * Five steps down the brand's own purple. Adjacent divisions are always
 * a clear step apart, and nothing here is a new token: every value is
 * the accent hue at a stated lightness.
 */
const SLICE = [
  'hsl(252 68% 18%)',
  'hsl(252 55% 32%)',
  'hsl(252 46% 46%)',
  'hsl(252 41% 60%)',
  'hsl(252 38% 74%)',
];

// The drawing's own coordinate system. One unit is one pixel at a card
// 250 units wide; everything scales from there.
// Sized to the card it actually lands in. The lower row's middle card is
// about 443 x 294 inside its padding, an aspect of 1.51, so a viewBox at
// 1.48 leaves almost nothing unused in either direction; and with the
// label text one step smaller the ring can take the room that frees.
const VB_W = 264;
const VB_H = 178;
const CX = 132;
const CY = 89;
const R = 50;          // the ring's centre line
const THICK = 26;      // its stroke width, so it runs from 37 to 63
const OUTER = R + THICK / 2;
// A LEADER ALWAYS TRAVELS OUTWARD. It leaves the ring along its own
// radius, turns after a short run, and stops at the label. The turn has
// to happen INSIDE the anchor's distance from the centre, or a leader on
// a near-horizontal segment doubles back on itself and reads as a stray
// line across the card, which is exactly what the first draft did.
const LEAD_IN = 3;     // where a leader starts, outside the ring: r = 66
const ELBOW = 5;       // where it turns: r = 71
const ANCHOR = 76;     // where it turns level, measured from the centre
const RUN_IN = 10;     // the horizontal run from that turn into the name
const TEXT = 80;       // where the name starts, measured from the centre
const MIN_GAP = 25;    // the least vertical distance between two labels
const MARGIN = 14;     // how close a label may come to the top or bottom
const GAP_DEG = 1.6;   // the hairline between two segments
const DRAW_MS = 700;   // the whole ring, laid in as one stroke

const rad = (deg: number) => (deg * Math.PI) / 180;
const px = (deg: number, r: number) => [CX + r * Math.sin(rad(deg)), CY - r * Math.cos(rad(deg))];

interface Segment {
  key: string;
  name: string;
  reports: number;
  percent: number;
  colour: string;
  /** The arc itself. */
  d: string;
  length: number;
  delay: number;
  duration: number;
  /** The leader and its label. */
  points: string;
  textX: number;
  textY: number;
  anchor: 'start' | 'end';
}

export function ReportsMixBlock({ shares, animate }: {
  shares: DivisionShare[] | null; animate: boolean;
}) {
  // ===================================================================
  // THE LABELS KEEP THEIR SIZE WHILE THE RING LOSES ITS OWN.
  // -------------------------------------------------------------------
  // The whole composition is a fixed viewBox scaled to the card, which is
  // what keeps the ring, the leader lines and the names in proportion at
  // any width. It also scales the TEXT, and text has a floor that a
  // drawing does not: measured, "Investment 17%" rendered at 15px on a
  // 1920 screen, 10px at 1440, 9px at 1280 and SIX PIXELS at 1100, where
  // this card is 191px wide. Nobody reads six pixels.
  //
  // So the labels are counter-scaled. The card is measured, the scale the
  // browser is applying to the viewBox is worked out from it, and the
  // font size is expressed in viewBox units that CANCEL that scale below
  // a floor: as the card narrows the type stops shrinking with it and
  // holds at a readable size, growing again with the card past that
  // point. Nothing else in the drawing changes, so the ring is still the
  // same object at every width - only its captions refuse to disappear.
  // ===================================================================
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      // `preserveAspectRatio="xMidYMid meet"` fits the whole viewBox, so
      // the scale actually applied is the smaller of the two axes.
      const s = Math.min(el.clientWidth / VB_W, el.clientHeight / VB_H);
      if (s > 0) setScale(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** A size in viewBox units that renders at no less than `floorPx`. */
  const sized = (idealUnits: number, floorPx: number) =>
    Math.max(idealUnits, floorPx / Math.max(scale, 0.01));

  // ===================================================================
  // AND A CEILING, BECAUSE THE CARD CAN BE TOO NARROW FOR THE FLOOR.
  // -------------------------------------------------------------------
  // On a portrait card - 191 wide by 308 tall on a 1100px window - a
  // ring with labels either side of it simply cannot also carry
  // "Investment" at eleven pixels: the word alone wants more width than
  // the half-card the layout can give it, whatever the ring does. Asking
  // for the floor anyway produced "Investmen", which is the one outcome
  // worse than small type, because a clipped word is not a shorter word,
  // it is a wrong one.
  //
  // So the counter-scaling has a ceiling as well: the largest size at
  // which the LONGEST name still fits the room beside the ring. The
  // labels then grow towards the floor as far as the card allows and
  // stop there, which is the honest answer to a card that is too narrow.
  // The width estimate is deliberately generous; erring large costs a
  // little type size, erring small costs a clipped word again.
  // ===================================================================
  const longestName = Math.max(4, ...(shares ?? []).map((r) => r.name.length));
  /** The ring's outer edge and the label's start, for a given type size. */
  const geometryFor = (units: number) => {
    const ringScale = 1 / Math.max(units / 9.5, 1) ** 1.15;
    const rr = R * ringScale;
    const tt = THICK * ringScale;
    const oo = rr + tt / 2;
    return { r: rr, thick: tt, outer: oo, textAt: oo + (TEXT - (R + THICK / 2)) };
  };
  // ITERATED FROM THE SIZE WE WANT, NOT FROM THE ONE WE HAVE. The room
  // and the type size each depend on the other: a larger label shrinks
  // the ring, and a smaller ring leaves more room for the label. Starting
  // from the current size finds the fixed point where nothing moves,
  // which is the size it already was; starting from the size we want and
  // stepping down finds the largest one the card can actually hold.
  // Three steps is well past converging for any card this page has.
  const wanted = sized(9.5, 11);
  const fits = (room: number) => Math.max(9.5, Math.min(wanted, room / (longestName * 0.55)));
  let units = wanted;
  for (let pass = 0; pass < 3; pass += 1) units = fits(VB_W / 2 - geometryFor(units).textAt);
  const nameSize = units;
  const percentSize = Math.max(9, nameSize * 0.9);

  // ===================================================================
  // A BIGGER LABEL NEEDS A SMALLER RING. They share one fixed viewBox,
  // so the room the type gains has to come from somewhere, and the ring
  // is the thing that can afford to give it: a doughnut reads perfectly
  // well at four fifths of its size, while "Investment" clipped to
  // "Investmen" does not read at all. That was the state of it on a
  // 191px card once the labels stopped shrinking.
  //
  // The ring therefore contracts as the type is counter-scaled, and the
  // leaders and label anchors follow it outwards from the new radius, so
  // the whole composition stays the same drawing at a different size
  // rather than a ring with its captions pushed off the edge.
  // ===================================================================
  // Each landmark keeps its own distance OUTSIDE the ring, so the leader
  // still leaves, turns and arrives in the same three moves.
  const { r, thick, outer, textAt } = geometryFor(nameSize);
  const anchor = outer + (ANCHOR - (R + THICK / 2));

  const { segments, total, single } = useMemo(() => {
    const rows = shares ?? [];
    const sum = rows.reduce((s, r) => s + r.reports, 0);
    if (!rows.length || sum === 0) return { segments: [] as Segment[], total: 0, single: false };

    // Angles first, from twelve o'clock and clockwise, in the order the
    // divisions are declared, so the ring never reshuffles.
    const spans = rows.map((r) => (r.reports / sum) * 360);
    const starts: number[] = [];
    spans.reduce((acc, span, i) => { starts[i] = acc; return acc + span; }, 0);

    // EVERY LABEL STARTS AT ITS OWN SEGMENT'S HEIGHT and is moved only as
    // far as it has to be. A label sits on the side its segment's middle
    // points to, at the height that middle sits at; then one pass down
    // the side pushes any pair closer than `MIN_GAP` apart, and one pass
    // back up pulls the group off the bottom edge if it has run past it.
    //
    // Spacing the labels evenly instead, which is the obvious approach,
    // is what produced leader lines long enough to read as scratches
    // across the card: a label whose segment is at the top of the ring
    // was being dragged to the middle for no reason. Two labels still
    // cannot collide, whatever the shares happen to be.
    const mids = spans.map((span, i) => starts[i] + span / 2);
    const sides = mids.map((m) => (Math.sin(rad(m)) >= 0 ? 1 : -1));
    const slots = new Map<number, number>();
    ([1, -1] as const).forEach((side) => {
      const members = mids
        .map((m, i) => ({ i, y: CY - Math.cos(rad(m)) * r }))
        .filter(({ i }) => sides[i] === side)
        .sort((a, b) => a.y - b.y);
      const ys = members.map((m) => m.y);
      // The gap has to follow the type, not sit at a constant. Once the
      // labels counter-scale on a narrow card a two-line label is taller
      // than the old fixed 25 units, and two of them would have overlapped
      // exactly where the type had just been enlarged to be readable.
      const gap = Math.max(MIN_GAP, nameSize + percentSize + 7);
      for (let k = 0; k < ys.length; k += 1) {
        ys[k] = Math.max(ys[k], k === 0 ? MARGIN : ys[k - 1] + gap);
      }
      for (let k = ys.length - 1; k >= 0; k -= 1) {
        ys[k] = Math.min(ys[k], k === ys.length - 1 ? VB_H - MARGIN : ys[k + 1] - gap);
      }
      members.forEach(({ i }, k) => slots.set(i, ys[k]));
    });

    const segments: Segment[] = rows.map((row, i) => {
      const span = Math.max(spans[i] - GAP_DEG, 0.8);
      const from = starts[i] + GAP_DEG / 2;
      const to = from + span;
      const [x0, y0] = px(from, r);
      const [x1, y1] = px(to, r);
      const large = span > 180 ? 1 : 0;
      const mid = mids[i];
      const side = sides[i];
      const slotY = slots.get(i) ?? CY;
      const [lx0, ly0] = px(mid, outer + LEAD_IN);
      const [lx1, ly1] = px(mid, outer + LEAD_IN + ELBOW);
      return {
        key: row.key,
        name: row.name,
        reports: row.reports,
        percent: Math.round((row.reports / sum) * 100),
        colour: SLICE[i % SLICE.length],
        d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        length: r * rad(span),
        delay: (starts[i] / 360) * DRAW_MS,
        duration: Math.max(90, (spans[i] / 360) * DRAW_MS),
        points: [
          `${lx0.toFixed(2)},${ly0.toFixed(2)}`,
          `${lx1.toFixed(2)},${ly1.toFixed(2)}`,
          `${(CX + side * (anchor - RUN_IN)).toFixed(2)},${slotY.toFixed(2)}`,
          // The last run is level, so a leader arrives at its name rather
          // than pointing past it.
          `${(CX + side * anchor).toFixed(2)},${slotY.toFixed(2)}`,
        ].join(' '),
        textX: CX + side * textAt,
        textY: slotY,
        anchor: side === 1 ? 'start' : 'end',
      };
    });

    return { segments, total: sum, single: rows.length === 1 };
  }, [shares, nameSize, percentSize, r, outer, anchor, textAt]);

  if (!shares) {
    return (
      <Block title="Reports by division">
        <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
      </Block>
    );
  }

  if (!segments.length) {
    return (
      <Block title="Reports by division">
        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="font-body text-xs text-muted-foreground">No published reports to apportion yet.</p>
        </div>
      </Block>
    );
  }

  return (
    <Block title="Reports by division" aside="all time">
      <div ref={boxRef} className="h-full w-full min-h-0">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label={`Reports by division, ${total} published in total`}
        >
          {segments.map((s) => (
            <g key={s.key}>
              <title>{`${s.name}: ${s.reports} reports, ${s.percent} per cent`}</title>
              {/* A SINGLE DIVISION IS A CLOSED RING, not an arc from a
                  point back to itself, which no path can express. */}
              {single ? (
                <circle
                  className="dash-arc"
                  cx={CX} cy={CY} r={r}
                  fill="none" stroke={s.colour} strokeWidth={thick}
                  style={animate ? {
                    '--dash-len': `${2 * Math.PI * r}px`,
                    strokeDasharray: 2 * Math.PI * r,
                    strokeDashoffset: 2 * Math.PI * r,
                    animation: `dash-draw ${DRAW_MS}ms linear both`,
                  } as React.CSSProperties : undefined}
                />
              ) : (
                <path
                  className="dash-arc"
                  d={s.d}
                  fill="none" stroke={s.colour} strokeWidth={thick} strokeLinecap="butt"
                  style={animate ? {
                    '--dash-len': `${s.length}px`,
                    strokeDasharray: s.length,
                    strokeDashoffset: s.length,
                    animation: `dash-draw ${s.duration.toFixed(0)}ms linear ${s.delay.toFixed(0)}ms both`,
                  } as React.CSSProperties : undefined}
                />
              )}
            </g>
          ))}

          {/* The names, joined to their own segments. They arrive once the
              ring has finished drawing, in the same order it was laid in. */}
          {segments.map((s, i) => (
            <g
              key={`${s.key}-label`}
              className="dash-label"
              style={animate ? {
                opacity: 0,
                animation: `dash-fade 340ms ease-out ${DRAW_MS + 40 + i * 45}ms both`,
              } : undefined}
            >
              <polyline
                points={s.points}
                fill="none"
                stroke="hsl(var(--accent-soft))"
                strokeWidth={1}
                strokeLinejoin="round"
              />
              <text
                x={s.textX} y={s.textY - 1}
                textAnchor={s.anchor}
                className="font-body"
                style={{ fontSize: nameSize, fill: 'hsl(var(--foreground))' }}
              >
                {s.name}
              </text>
              <text
                x={s.textX} y={s.textY + nameSize + 1}
                textAnchor={s.anchor}
                className="font-body"
                style={{ fontSize: percentSize, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' }}
              >
                {s.percent}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Block>
  );
}

export default ReportsMixBlock;
