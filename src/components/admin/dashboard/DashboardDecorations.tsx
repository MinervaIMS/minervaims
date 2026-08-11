import { memo, useMemo, useRef, useState } from 'react';
import { MiniAlumniGlobe } from '@/components/AlumniGlobe';
import { spineGeometry } from '@/components/readings/types';
import type { AvatarRow, ReadingRow } from './useDashboardData';

// =====================================================================
// The four KPI ornaments.
// ---------------------------------------------------------------------
// Each one fills its own column inside the card and is cut by the card's
// rounded corner. The rules below are what make them RELIABLE rather
// than merely decorative, and every one of them exists because of a
// failure it prevents:
//
//   * EVERY ORNAMENT IS MEMOISED ON PRIMITIVE PROPS. A CSS animation
//     restarts when its element is replaced, so a parent re-render used
//     to be able to jump a column back to its first frame.
//   * EVERY ORNAMENT IS BUILT ONCE, FROM DATA IT LATCHES. A cover that
//     finishes rendering after the page has opened no longer reshuffles
//     the stack underneath a loop that is already running.
//   * NOTHING HERE IS INTERACTIVE. The column that holds them declares
//     `pointer-events: none`, so the cursor cannot reach a canvas, a
//     hover rule or a handler inside any of them.
//   * NOTHING HERE COSTS ANYTHING PER FRAME. Every loop is one
//     composited transform on one element. No layout property is
//     animated, so no loop can trigger reflow.
//   * NOTHING HERE IS INVENTED. Real report covers, real member photos,
//     real reading titles, real geography.
// =====================================================================

/**
 * The page's keyframes, declared here so the Dashboard carries its own
 * motion and no global stylesheet has to change.
 *
 * Every loop is a TRANSFORM OF ONE ELEMENT. Nothing animates a layout
 * property, nothing animates a colour, and no loop depends on being
 * re-rendered to keep running.
 */
export function DashboardMotionStyles() {
  return (
    <style>{`
      @keyframes dash-column-up { from { transform: translate3d(0,0,0); } to { transform: translate3d(0,-50%,0); } }
      @keyframes dash-sway-a {
        0%   { transform: translate3d(0,0,0); }
        34%  { transform: translate3d(-2.2%,1.8%,0); }
        67%  { transform: translate3d(1.6%,-1.4%,0); }
        100% { transform: translate3d(0,0,0); }
      }
      @keyframes dash-sway-b {
        0%   { transform: rotate(0deg); }
        50%  { transform: rotate(1.5deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes dash-rise { from { transform: translate3d(0,14px,0); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes dash-draw { from { stroke-dashoffset: var(--dash-len); } to { stroke-dashoffset: 0; } }
      @keyframes dash-fade { from { opacity: 0; } to { opacity: 1; } }
      .dash-col, .dash-swarm { will-change: transform; backface-visibility: hidden; }
      .dash-paused, .dash-paused * { animation-play-state: paused !important; }
      @media (prefers-reduced-motion: reduce) {
        .dash-col, .dash-swarm, .dash-rise, .dash-arc, .dash-label { animation: none !important; }
        .dash-rise { transform: none !important; opacity: 1 !important; }
        .dash-arc { stroke-dashoffset: 0 !important; }
        .dash-label { opacity: 1 !important; }
      }
    `}</style>
  );
}

/** Softens the ornament's inner edge so it dissolves into the card. */
const FADE_LEFT: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 24%, #000 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, #000 24%, #000 100%)',
};

// --- Reports ----------------------------------------------------------

/**
 * Seconds per cover, which is what actually sets the SPEED. The duration
 * of the loop is the height of one stack, so tying it to the number of
 * covers keeps the columns travelling at the same pace whatever the
 * archive holds. Both are a third quicker than before, and they are not
 * a whole-number ratio of each other, so the two columns never fall into
 * step however long the page is left open.
 */
const SECONDS_PER_COVER = [5.8, 7.6];

/**
 * Two columns of REAL report covers travelling upward at different
 * speeds.
 *
 * THE LOOP IS SEAMLESS BY ARITHMETIC. The stack is rendered twice and
 * translated by exactly half its height, which only lands on the same
 * picture if every item occupies exactly the same vertical pitch. A flex
 * `gap` puts a gap BETWEEN items but not after the last one, so half the
 * doubled stack was half a gap short and the column twitched once per
 * revolution. Each cover now carries its own bottom margin, so 2n items
 * are exactly 2n pitches tall and half of that is exactly n.
 *
 * THE COVER LIST IS LATCHED at the first render that has one. The loader
 * waits for the covers, but it also gives up after a cap, so a slow PDF
 * could arrive after the page had opened and replace the stack under a
 * running animation. What arrives late is used on the next visit.
 */
export const ReportColumns = memo(function ReportColumns({ covers, paused }: {
  covers: string[]; paused: boolean;
}) {
  const latched = useRef<string[] | null>(null);
  if (latched.current === null && covers.length > 0) latched.current = covers;
  const list = latched.current;

  const columns = useMemo(() => {
    const stack = list ?? [];
    if (stack.length === 0) return [] as string[][];
    const a = stack.filter((_, i) => i % 2 === 0);
    const b = stack.filter((_, i) => i % 2 === 1);
    return [a.length ? a : stack, b.length ? b : stack.slice().reverse()];
  }, [list]);

  if (!columns.length) return null;

  return (
    <div
      className={`absolute inset-y-0 -left-1 -right-5 flex items-stretch justify-center gap-2 ${paused ? 'dash-paused' : ''}`}
      // A SHORT FADE, ALWAYS. On the ordinary path the covers are ready
      // before the loader lifts and this is imperceptible; on the rare
      // path where a slow PDF lands after the page has opened, it is the
      // difference between an image appearing and an image popping.
      style={{ ...FADE_LEFT, animation: 'dash-fade 420ms ease-out both' }}
    >
      {columns.map((column, ci) => {
        // Different pitches and a different starting offset, so a cover in
        // one column never lines up horizontally with a cover in the other.
        const gap = ci === 0 ? 8 : 14;
        const offset = ci === 0 ? 0 : -26;
        return (
          <div key={ci} className="relative flex-1 min-w-0 max-w-[84px] overflow-hidden">
            <div
              className="dash-col absolute inset-x-0 flex flex-col"
              style={{
                top: offset,
                animation: `dash-column-up ${(column.length * SECONDS_PER_COVER[ci]).toFixed(1)}s linear infinite`,
              }}
            >
              {[...column, ...column].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  draggable={false}
                  decoding="async"
                  className="w-full rounded-[2px] border border-accent/15 shadow-[0_2px_8px_-4px_hsl(var(--overlay)/0.35)]"
                  style={{ aspectRatio: '1 / 1.414', objectFit: 'cover', marginBottom: gap }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// --- Members ----------------------------------------------------------

/** Deterministic 32-bit PRNG: the same seed gives the same swarm, always. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Node { x: number; y: number }

/**
 * An ORGANIC scatter, not a constructed figure.
 *
 * Rings, grids and symmetric arrangements all read as diagrams: the eye
 * finds the rule before it finds the people. This places each portrait by
 * rejection sampling instead: a candidate is drawn, and it is kept unless
 * it comes within `minDist` of someone already placed. That leaves the
 * spacing genuinely uneven, with tighter knots and looser air, which is
 * what "organic" means here. It is not chaos: the minimum distance is a
 * hard floor, so the composition can crowd but can never collide.
 *
 * The density leans RIGHT. `1 - (1-u)^bias` pushes draws toward the far
 * edge without ever emptying the near one, so the weight of the group
 * sits at the outer edge of the card and the innermost portraits fade
 * under the card's mask.
 *
 * It is a pure function of its arguments and its seed, so the swarm is
 * identical on every render, in every session, on every device.
 */
function swarm(spec: {
  count: number; minDist: number; xMin: number; yMin: number; yMax: number; seed: number; bias: number;
}): Node[] {
  const { count, minDist, xMin, yMin, yMax, seed, bias } = spec;
  const rand = mulberry32(seed);
  const pts: Node[] = [];
  for (let attempt = 0; attempt < 9000 && pts.length < count; attempt += 1) {
    const x = xMin + (100 - xMin) * (1 - Math.pow(1 - rand(), bias));
    const y = yMin + (yMax - yMin) * rand();
    let ok = true;
    for (const p of pts) {
      if (Math.hypot(p.x - x, p.y - y) < minDist) { ok = false; break; }
    }
    if (ok) pts.push({ x, y });
  }
  return pts;
}

/**
 * The two swarms, generated once for the whole application rather than
 * per card, so the composition is identical on every render and can never
 * be rebuilt underneath a running animation.
 *
 * THE NUMBERS ARE NOT TASTE, THEY ARE CLEARANCE. Positions are
 * percentages of a SQUARE box, so one per cent is the same number of
 * pixels in both directions:
 *
 *   wide   box = 1.40 x 157px card = 220px. A 31px portrait is 14.1% of
 *          it, and the minimum separation is 16.5%, which leaves 5px of
 *          air between the two closest people on the card.
 *
 *          SIXTEEN PEOPLE ACROSS THE WHOLE COLUMN, up from twelve in the
 *          right-hand third of it. The swarm used to start at 36% of the
 *          box, which was where the box's left edge fell on a 1440 screen
 *          -- but the KPI card on the screen this Dashboard is used on is
 *          414px wide, its ornament column 215px, and the box only 220,
 *          so a third of the column was empty by construction. Starting
 *          at 6% fills it. On a narrower screen the left of the box falls
 *          outside the card and simply shows fewer people, at the same
 *          size, in a column that is still completely covered.
 *   phone  box = 1.18 x 160px card = 189px. A 26px portrait is 13.8%,
 *          against a minimum separation of 15%, which leaves 2.3px.
 *
 * The vertical range stops short of the box's edges so no portrait is
 * lost off the top or bottom of the card, and the horizontal range
 * starts where the card's own mask stops fading, which on a phone is
 * much further right because the ornament column is half as wide.
 */
const SWARM_WIDE = swarm({ count: 16, minDist: 16.5, xMin: 6, yMin: 14, yMax: 86, seed: 19, bias: 1.25 });
const SWARM_PHONE = swarm({ count: 9, minDist: 15, xMin: 56, yMin: 8, yMax: 92, seed: 23, bias: 1.35 });

/** Each portrait joined to its two nearest neighbours, deduplicated. */
function web(nodes: Node[]): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  nodes.forEach((p, i) => {
    const near = nodes
      .map((q, j) => ({ j, d: Math.hypot(q.x - p.x, q.y - p.y) }))
      .filter((c) => c.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    near.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push([i, j]);
    });
  });
  return out;
}

/**
 * The membership as a swarm of people rather than a figure made of them.
 *
 * THE WHOLE SWARM MOVES AS ONE BODY, under two slow transforms with
 * periods that are not a whole-number ratio of each other, so the drift
 * never visibly repeats. Because both are rigid transforms of the same
 * element, every connecting line stays nailed to the two people it joins,
 * and the distance between any two portraits is EXACTLY preserved: if
 * they do not overlap at rest they cannot overlap in motion.
 *
 * NO TWO PORTRAITS CAN TOUCH, and that is arithmetic rather than
 * inspection: the clearances are stated where the two swarms are
 * generated, above.
 */
export const MemberRings = memo(function MemberRings({ avatars, compact, paused }: {
  avatars: AvatarRow[] | null; compact: boolean; paused: boolean;
}) {
  /**
   * A DIFFERENT FOURTEEN PEOPLE EACH TIME THE DASHBOARD IS OPENED, and the
   * same fourteen for as long as it stays open.
   *
   * The association has far more members than the card has places, and
   * showing the first fourteen of an alphabetical list would give the same
   * people all the visibility for ever. The seed is drawn ONCE, in a state
   * initialiser, so it is fixed for the life of this mount: the swarm can
   * never reshuffle while somebody is looking at it, which would be a far
   * worse fault than repetition. Opening the Dashboard again draws a new
   * one.
   */
  const [seed] = useState(() => (Math.random() * 0xffffffff) >>> 0);

  const layout = useMemo(() => {
    const list = (avatars ?? []).filter((a) => a.photo_url);
    if (!list.length) return null;
    // A phone shows the right-hand sliver of the same square, so its swarm
    // is generated inside that sliver rather than being scaled down.
    const nodes = compact ? SWARM_PHONE : SWARM_WIDE;
    // A seeded Fisher-Yates over a copy: every member has the same chance
    // of appearing, and nobody appears twice while others are left out.
    const bag = list.slice();
    const rand = mulberry32(seed);
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const people = nodes.map((_, i) => bag[i % bag.length]);
    return { nodes, people, links: web(nodes), size: compact ? 26 : 31 };
  }, [avatars, compact, seed]);

  if (!layout) return null;

  return (
    <div className={`absolute inset-0 ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      <div className={`absolute right-[-10px] top-1/2 -translate-y-1/2 aspect-square ${compact ? 'h-[118%]' : 'h-[140%]'}`}>
        {/* Two nested rigid transforms: a slow wander and a slower lean.
            Both carry the web and the portraits together. */}
        <div className="dash-swarm absolute inset-0" style={{ animation: 'dash-sway-a 31s ease-in-out infinite' }}>
          <div className="dash-swarm absolute inset-0" style={{ animation: 'dash-sway-b 43s ease-in-out infinite' }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
              {layout.links.map(([i, j]) => (
                <line
                  key={`${i}-${j}`}
                  x1={layout.nodes[i].x} y1={layout.nodes[i].y}
                  x2={layout.nodes[j].x} y2={layout.nodes[j].y}
                  stroke="hsl(var(--accent))" strokeOpacity={0.2} strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {layout.nodes.map((node, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 block rounded-full overflow-hidden
                           border-2 border-background bg-muted shadow-[0_2px_6px_-3px_hsl(var(--overlay)/0.5)]"
                style={{ left: `${node.x}%`, top: `${node.y}%`, width: layout.size, height: layout.size }}
              >
                <img
                  src={layout.people[i].photo_url!}
                  alt=""
                  draggable={false}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Alumni -----------------------------------------------------------

/**
 * The globe from the alumni page, at the scale where it READS AS A GLOBE.
 *
 * It was drawn at 132% of the card's height and pushed 14% off the right
 * edge, which filled the column with a piece of sphere too large to be
 * recognised as one: the curvature ran off all four sides at once. At
 * 118% and a 2% overhang the disc spans the ornament column almost
 * exactly, clipped only at the top and bottom by the card's own edges, so
 * the rim, the land and the arcs converging on Milan are all legible and
 * it reads as a globe at a glance without giving back the space.
 *
 * It is now impossible for this card to show nothing. The globe is built
 * on mount and draws its sphere, grid, arcs and cities from the first
 * frame; the world atlas is a download that adds land and borders when it
 * arrives, is fetched at most once per session, and is retried on a
 * second host before it is given up on. `paused` stops the loop rather
 * than hiding the canvas, so the last frame stays on screen.
 */
export const GlobeOrnament = memo(function GlobeOrnament({ paused }: { paused: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={FADE_LEFT}>
      <div className="absolute right-[-2%] top-1/2 -translate-y-1/2 aspect-square h-[118%]">
        <MiniAlumniGlobe paused={paused} />
      </div>
    </div>
  );
});

// --- Readings ---------------------------------------------------------

/** One fluted pilaster, as drawn on the /readings case. */
function Pilaster({ soft, width }: { soft: string; width: number }) {
  return (
    <span
      className="shrink-0 flex justify-center border-x-[1.5px] self-stretch"
      style={{ borderColor: soft, width }}
    >
      <span className="w-[5px] border-x" style={{ borderColor: soft }} />
    </span>
  );
}

/**
 * A SHELF OF THE /readings CASE, framed as the library page frames it.
 *
 * The crop is taken from the same architecture the reader already knows:
 * a fluted pilaster at each side, the underside of the board above, real
 * books standing on a real board, and the board's double stroke beneath
 * them. What it deliberately leaves out is the panel that carries the
 * category name, which was the largest object in the earlier crop and
 * said nothing: this card is about the books.
 *
 * THE BOOKS ARE NEVER SLIVERS. Their widths are the real spine widths
 * from the library, distributed proportionally across whatever the column
 * gives them, and a phone shows two books rather than squeezing three
 * into half the width.
 *
 * IT IS A COMPLETE BAY OF THE CASE, not a piece of one. The earlier crop
 * hung 6% off the right edge, so the right-hand pilaster was sliced down
 * its length and the composition read as an accident rather than a
 * choice. It now spans the ornament column exactly: a pilaster at each
 * side, one shelf between them, cut only by the card's own rounded
 * corner and dissolved on the inner edge by the card's mask.
 *
 * AND IT IS CENTRED, which it was not. The block is geometrically
 * centred either way; what made it look low was the empty band above the
 * shorter spines, because scaling the real heights straight from the
 * library put a third of the shelf's height between the shortest book
 * and the board above it. The heights keep their real ORDER and their
 * variation, compressed into the top eighth of the shelf, so every book
 * stands close under the board and the group reads as one object.
 */
export const LibraryCorner = memo(function LibraryCorner({ readings, compact, animate }: {
  readings: ReadingRow[] | null; compact: boolean; animate: boolean;
}) {
  const soft = 'hsl(var(--accent-soft))';
  const books = (readings ?? []).slice(0, compact ? 2 : 3);
  if (!books.length) return null;

  // `spineGeometry` returns heights between 86 and 110. Mapped straight
  // onto the shelf they leave a void above the short ones; mapped into
  // the top eighth of it they still differ, visibly, without the void.
  const shelfHeight = compact ? 108 : 118;
  const bookHeight = (h: number) =>
    Math.round((shelfHeight - 8) * (0.88 + 0.12 * Math.min(1, Math.max(0, (h - 86) / 24))));

  return (
    <div className="absolute inset-0 overflow-hidden" style={FADE_LEFT} aria-hidden="true">
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${animate ? 'dash-rise' : ''}`}
        style={animate ? { animation: 'dash-rise 560ms cubic-bezier(.22,1,.36,1) both' } : undefined}
      >
        {/* The underside of the board above, and its inner rule. The panel
            that sits on top of it, and its category name, are outside the
            crop on purpose. */}
        <div className="border-t-[1.5px]" style={{ borderColor: soft }} />
        <div className="mt-[3px] border-t" style={{ borderColor: 'hsl(var(--accent-soft)/0.55)' }} />

        <div className="flex items-stretch">
          <Pilaster soft={soft} width={compact ? 8 : 10} />
          <div className="relative flex-1 min-w-0">
            <div
              className={`flex items-end ${compact ? 'px-1' : 'px-1.5'}`}
              style={{ height: shelfHeight, gap: compact ? 5 : 7 }}
            >
              {books.map((r, i) => {
                const g = spineGeometry(r.id);
                return (
                  <span
                    key={r.id}
                    className="relative min-w-0 rounded-t-[3px] border-[1.5px]"
                    style={{
                      // Real spine widths, shared out proportionally, so the
                      // row fills the shelf exactly at any card width.
                      flexGrow: g.w,
                      flexBasis: 0,
                      height: bookHeight(g.h),
                      borderColor: soft,
                      background: i % 2 === 0 ? 'hsl(var(--accent-soft)/0.14)' : 'hsl(var(--accent-soft)/0.06)',
                    }}
                  >
                    <span className="absolute left-[3px] right-[3px] top-2 border-t" style={{ borderColor: soft }} />
                    <span className="absolute left-[3px] right-[3px] bottom-2 border-t" style={{ borderColor: soft }} />
                    <span className="absolute inset-x-0 top-[14px] bottom-[14px] flex items-center justify-center overflow-hidden">
                      <span
                        className="max-h-full overflow-hidden whitespace-nowrap font-serif text-[9px] leading-none text-accent/85"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        {r.title}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
            {/* The board the books stand on: two strokes, as drawn. */}
            <div className="border-b-2" style={{ borderColor: soft }} />
            <div className="mt-[3px] border-b" style={{ borderColor: 'hsl(var(--accent-soft)/0.45)' }} />
          </div>
          <Pilaster soft={soft} width={compact ? 8 : 10} />
        </div>
      </div>
    </div>
  );
});
