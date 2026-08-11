import { useMemo } from 'react';
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
const VB_W = 258;
const VB_H = 180;
const CX = 129;
const CY = 90;
const R = 41;          // the ring's centre line
const THICK = 22;      // its stroke width, so it runs from 30 to 52
const OUTER = R + THICK / 2;
// A LEADER ALWAYS TRAVELS OUTWARD. It leaves the ring along its own
// radius, turns after a short run, and stops at the label. The turn has
// to happen INSIDE the anchor's distance from the centre, or a leader on
// a near-horizontal segment doubles back on itself and reads as a stray
// line across the card, which is exactly what the first draft did.
const LEAD_IN = 3;     // where a leader starts, outside the ring: r = 55
const ELBOW = 5;       // where it turns: r = 60
const ANCHOR = 64;     // where it turns level, measured from the centre
const RUN_IN = 10;     // the horizontal run from that turn into the name
const TEXT = 68;       // where the name starts, measured from the centre
const MIN_GAP = 26;    // the least vertical distance between two labels
const MARGIN = 15;     // how close a label may come to the top or bottom
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
        .map((m, i) => ({ i, y: CY - Math.cos(rad(m)) * R }))
        .filter(({ i }) => sides[i] === side)
        .sort((a, b) => a.y - b.y);
      const ys = members.map((m) => m.y);
      for (let k = 0; k < ys.length; k += 1) {
        ys[k] = Math.max(ys[k], k === 0 ? MARGIN : ys[k - 1] + MIN_GAP);
      }
      for (let k = ys.length - 1; k >= 0; k -= 1) {
        ys[k] = Math.min(ys[k], k === ys.length - 1 ? VB_H - MARGIN : ys[k + 1] - MIN_GAP);
      }
      members.forEach(({ i }, k) => slots.set(i, ys[k]));
    });

    const segments: Segment[] = rows.map((row, i) => {
      const span = Math.max(spans[i] - GAP_DEG, 0.8);
      const from = starts[i] + GAP_DEG / 2;
      const to = from + span;
      const [x0, y0] = px(from, R);
      const [x1, y1] = px(to, R);
      const large = span > 180 ? 1 : 0;
      const mid = mids[i];
      const side = sides[i];
      const slotY = slots.get(i) ?? CY;
      const [lx0, ly0] = px(mid, OUTER + LEAD_IN);
      const [lx1, ly1] = px(mid, OUTER + LEAD_IN + ELBOW);
      return {
        key: row.key,
        name: row.name,
        reports: row.reports,
        percent: Math.round((row.reports / sum) * 100),
        colour: SLICE[i % SLICE.length],
        d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        length: R * rad(span),
        delay: (starts[i] / 360) * DRAW_MS,
        duration: Math.max(90, (spans[i] / 360) * DRAW_MS),
        points: [
          `${lx0.toFixed(2)},${ly0.toFixed(2)}`,
          `${lx1.toFixed(2)},${ly1.toFixed(2)}`,
          `${(CX + side * (ANCHOR - RUN_IN)).toFixed(2)},${slotY.toFixed(2)}`,
          // The last run is level, so a leader arrives at its name rather
          // than pointing past it.
          `${(CX + side * ANCHOR).toFixed(2)},${slotY.toFixed(2)}`,
        ].join(' '),
        textX: CX + side * TEXT,
        textY: slotY,
        anchor: side === 1 ? 'start' : 'end',
      };
    });

    return { segments, total: sum, single: rows.length === 1 };
  }, [shares]);

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
    <Block title="Reports by division">
      <div className="h-full w-full min-h-0">
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
                  cx={CX} cy={CY} r={R}
                  fill="none" stroke={s.colour} strokeWidth={THICK}
                  style={animate ? {
                    '--dash-len': `${2 * Math.PI * R}px`,
                    strokeDasharray: 2 * Math.PI * R,
                    strokeDashoffset: 2 * Math.PI * R,
                    animation: `dash-draw ${DRAW_MS}ms linear both`,
                  } as React.CSSProperties : undefined}
                />
              ) : (
                <path
                  className="dash-arc"
                  d={s.d}
                  fill="none" stroke={s.colour} strokeWidth={THICK} strokeLinecap="butt"
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
                style={{ fontSize: 10.5, fill: 'hsl(var(--foreground))' }}
              >
                {s.name}
              </text>
              <text
                x={s.textX} y={s.textY + 11}
                textAnchor={s.anchor}
                className="font-body"
                style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' }}
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
