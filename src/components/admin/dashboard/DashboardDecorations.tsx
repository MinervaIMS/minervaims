import { memo, useMemo } from 'react';
import { MiniAlumniGlobe } from '@/components/AlumniGlobe';
import { spineGeometry } from '@/components/readings/types';
import type { AvatarRow, ReadingRow } from './useDashboardData';

// =====================================================================
// The four KPI ornaments.
// ---------------------------------------------------------------------
// Each one fills its own column inside the card and is cut by the card's
// rounded corner. Four rules, and the first two are why the hover
// glitches are gone:
//
//   * EVERY ORNAMENT IS MEMOISED ON PRIMITIVE PROPS. A CSS animation
//     restarts when its element is replaced, so a parent re-render for
//     any reason at all used to be able to jump a column back to its
//     first frame or shift a ring. These components now re-render only
//     when their own data changes, which is once.
//   * NOTHING HERE IS INTERACTIVE. The column that holds them declares
//     `pointer-events: none`, so the cursor cannot reach a canvas, a
//     hover rule or a handler inside any of them.
//   * NOTHING HERE COSTS ANYTHING PER FRAME. Every loop is one
//     composited transform on one element. No layout property is
//     animated, so no loop can trigger reflow.
//   * NOTHING HERE IS INVENTED. Real report covers, real member photos,
//     real reading titles.
// =====================================================================

/**
 * The page's keyframes, declared here so the Dashboard carries its own
 * motion and no global stylesheet has to change.
 */
export function DashboardMotionStyles() {
  return (
    <style>{`
      @keyframes dash-column-up { from { transform: translate3d(0,0,0); } to { transform: translate3d(0,-50%,0); } }
      @keyframes dash-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes dash-counter-orbit { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      @keyframes dash-rise { from { transform: translate3d(0,14px,0); opacity: 0; } to { transform: none; opacity: 1; } }
      .dash-col, .dash-ring { will-change: transform; backface-visibility: hidden; }
      .dash-paused, .dash-paused * { animation-play-state: paused !important; }
      @media (prefers-reduced-motion: reduce) {
        .dash-col, .dash-ring, .dash-rise { animation: none !important; }
        .dash-rise { transform: none !important; opacity: 1 !important; }
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
 * Two columns of REAL report covers travelling upward at different
 * speeds. The stack is rendered twice and translated by exactly half its
 * height, which is what makes the loop seamless.
 *
 * THE ORDER IS FIXED AT FIRST RENDER and never reshuffled: the covers
 * arrive in publication order and are dealt alternately between the two
 * columns, a pure function of the list, so nothing about the cursor or a
 * re-render can change which cover is where.
 */
export const ReportColumns = memo(function ReportColumns({ covers, paused }: {
  covers: string[]; paused: boolean;
}) {
  const columns = useMemo(() => {
    if (covers.length === 0) return [] as string[][];
    const a = covers.filter((_, i) => i % 2 === 0);
    const b = covers.filter((_, i) => i % 2 === 1);
    return [a.length ? a : covers, b.length ? b : covers.slice().reverse()];
  }, [covers]);

  if (!columns.length) return null;

  return (
    <div
      className={`absolute inset-y-0 -left-1 -right-5 flex items-stretch justify-center gap-2 ${paused ? 'dash-paused' : ''}`}
      style={FADE_LEFT}
    >
      {columns.map((column, ci) => (
        <div key={ci} className="relative flex-1 min-w-0 max-w-[84px] overflow-hidden">
          <div
            className="dash-col absolute inset-x-0 top-0 flex flex-col gap-2"
            style={{ animation: `dash-column-up ${ci === 0 ? 26 : 34}s linear infinite` }}
          >
            {[...column, ...column].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                draggable={false}
                decoding="async"
                className="w-full rounded-[2px] border border-accent/15 shadow-[0_2px_8px_-4px_hsl(var(--overlay)/0.35)]"
                style={{ aspectRatio: '1 / 1.414', objectFit: 'cover' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

// --- Members ----------------------------------------------------------

/**
 * The membership as a connected network: two concentric rings of
 * portraits turning slowly in opposite directions, joined by a web of
 * chords, each photo held upright by a counter-rotation.
 *
 * The web is drawn in the SAME rotating frame as the portraits, so a
 * connection is nailed to the two people it joins and cannot drift or
 * lag behind them however long the loop runs.
 *
 * NO TWO PORTRAITS CAN TOUCH, and that is arithmetic rather than
 * inspection: on a ring of `n` at radius `r`, adjacent centres are
 * 2*r*sin(pi/n) apart, and each ring below leaves that chord comfortably
 * larger than one diameter at the size it is drawn.
 */
export const MemberRings = memo(function MemberRings({ avatars, compact, paused }: {
  avatars: AvatarRow[] | null; compact: boolean; paused: boolean;
}) {
  const rings = useMemo(() => {
    const list = (avatars ?? []).filter((a) => a.photo_url);
    if (!list.length) return [];
    // Denser than before: eleven and six, at a larger diameter, on radii
    // close enough that the two rings read as one group.
    const outerCount = compact ? 9 : 11;
    const innerCount = compact ? 5 : 6;
    const outer = list.slice(0, outerCount);
    const inner = list.slice(outerCount, outerCount + innerCount);
    return [
      { people: outer, radius: 40, size: compact ? 27 : 31, spin: 118, reverse: false },
      { people: inner.length ? inner : outer.slice(0, innerCount), radius: 18, size: compact ? 23 : 26, spin: 92, reverse: true },
    ];
  }, [avatars, compact]);

  if (!rings.length) return null;

  return (
    <div className={`absolute inset-0 ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      <div className="absolute right-[-12%] top-1/2 -translate-y-1/2 aspect-square h-[132%]">
        {rings.map((ring, ri) => {
          const points = ring.people.map((_, i) => {
            const rad = (i / ring.people.length) * Math.PI * 2;
            return {
              x: 50 + Math.cos(rad) * ring.radius,
              y: 50 + Math.sin(rad) * ring.radius,
            };
          });
          return (
            <div
              key={ri}
              className="dash-ring absolute inset-0"
              style={{ animation: `${ring.reverse ? 'dash-counter-orbit' : 'dash-orbit'} ${ring.spin}s linear infinite` }}
            >
              {/* The network, drawn first and inside the same rotating
                  frame, so every chord stays attached to its two people. */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {points.map((p, i) => {
                  const next = points[(i + 1) % points.length];
                  const across = points[(i + Math.floor(points.length / 2)) % points.length];
                  return (
                    <g key={i} stroke="hsl(var(--accent))" vectorEffect="non-scaling-stroke" fill="none">
                      <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} strokeOpacity={0.22} strokeWidth={0.8} />
                      {i % 2 === 0 && (
                        <line x1={p.x} y1={p.y} x2={across.x} y2={across.y} strokeOpacity={0.1} strokeWidth={0.6} />
                      )}
                    </g>
                  );
                })}
              </svg>
              {ring.people.map((person, i) => (
                <span
                  key={`${person.name}-${person.surname}-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${points[i].x}%`,
                    top: `${points[i].y}%`,
                    width: ring.size,
                    height: ring.size,
                  }}
                >
                  {/* Undoes the ring's rotation, so no face is ever tilted. */}
                  <span
                    className="dash-ring block h-full w-full rounded-full overflow-hidden border-2 border-background bg-muted shadow-[0_2px_6px_-3px_hsl(var(--overlay)/0.5)]"
                    style={{
                      animation: `${ring.reverse ? 'dash-orbit' : 'dash-counter-orbit'} ${ring.spin}s linear infinite`,
                    }}
                  >
                    <img
                      src={person.photo_url!}
                      alt=""
                      draggable={false}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </span>
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// --- Alumni -----------------------------------------------------------

/**
 * The globe from the alumni page, a little larger than the card is tall
 * and offset just enough for the card's edge to clip it.
 */
export const GlobeOrnament = memo(function GlobeOrnament({ paused }: { paused: boolean }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      <div className="absolute right-[-16%] top-1/2 -translate-y-1/2 aspect-square h-[116%]">
        <MiniAlumniGlobe />
      </div>
    </div>
  );
});

// --- Readings ---------------------------------------------------------

/**
 * FOUR REAL BOOKS from the /readings library, standing at full height on
 * a shelf board.
 *
 * The two earlier crops both failed for the same reason: they framed the
 * bookcase and let the books fall where they may, so the case's header
 * or its architecture ended up the subject. This one frames the BOOKS,
 * fits them to the height available, and keeps only as much of the case
 * as places them: the board they stand on, the rule of the board above,
 * and a sliver of the fluted pilaster at the left.
 */
export const LibraryCorner = memo(function LibraryCorner({ readings, animate }: {
  readings: ReadingRow[] | null; animate: boolean;
}) {
  const books = (readings ?? []).slice(0, 4);
  const soft = 'hsl(var(--accent-soft))';
  if (!books.length) return null;

  // The tallest spine sets the scale, so every book fits the shelf with
  // its head and tail bands visible whatever the collection holds.
  const tallest = books.reduce((m, r) => Math.max(m, spineGeometry(r.id).h), 1);

  return (
    <div className="absolute inset-0 overflow-hidden" style={FADE_LEFT} aria-hidden="true">
      <div
        className={`absolute left-[4%] right-[-6%] top-1/2 -translate-y-1/2 ${animate ? 'dash-rise' : ''}`}
        style={animate ? { animation: 'dash-rise 560ms cubic-bezier(.22,1,.36,1) both' } : undefined}
      >
        {/* The underside of the board above. */}
        <div className="h-[3px] border-t-[1.5px] opacity-70" style={{ borderColor: soft }} />
        <div className="flex">
          <div className="w-[7px] shrink-0 flex justify-center border-r-[1.5px] py-1 opacity-70" style={{ borderColor: soft }}>
            <span className="h-full w-[3px] border-x" style={{ borderColor: soft }} />
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="flex items-end gap-[7px] pl-3 pr-1 h-[112px]">
              {books.map((r, i) => {
                const g = spineGeometry(r.id);
                return (
                  <span
                    key={r.id}
                    className="relative shrink-0 rounded-t-[3px] border-[1.5px]"
                    style={{
                      width: Math.round(g.w * 1.06),
                      height: Math.round((g.h / tallest) * 104),
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
            {/* The shelf board the books stand on: two strokes, as drawn. */}
            <div className="border-b-2" style={{ borderColor: soft }} />
            <div className="mt-[2px] border-b" style={{ borderColor: 'hsl(var(--accent-soft)/0.45)' }} />
          </div>
        </div>
      </div>
    </div>
  );
});
