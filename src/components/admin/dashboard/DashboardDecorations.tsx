import { useMemo } from 'react';
import { MiniAlumniGlobe } from '@/components/AlumniGlobe';
import { spineGeometry } from '@/components/readings/types';
import type { AvatarRow, ReadingRow } from './useDashboardData';

// =====================================================================
// The four KPI ornaments.
// ---------------------------------------------------------------------
// Each one runs edge to edge inside its card and is CUT BY THE ROUNDED
// BOUNDARY. That clipping is the point: a globe sliced by the card's
// curve reads as something embedded in the card, where the same globe
// floating inside a safe margin reads as a sticker. Three rules:
//
//   * NOTHING HERE COMPETES WITH A NUMBER. Every ornament is masked so
//     it fades out before it reaches the figure on the left.
//   * NOTHING HERE COSTS ANYTHING PER FRAME. Every loop is a single
//     composited transform on one element. No layout property is
//     animated, so nothing can trigger reflow while it runs.
//   * NOTHING HERE IS INVENTED. Real report covers, real member photos,
//     real reading titles. Where an asset is missing the ornament draws
//     with what exists rather than substituting a facsimile.
// =====================================================================

/**
 * The page's keyframes, declared here so the Dashboard carries its own
 * motion and no global stylesheet has to change. `will-change` is set on
 * the two elements that actually translate, so the compositor keeps them
 * on their own layer instead of repainting a column of images.
 */
export function DashboardMotionStyles() {
  return (
    <style>{`
      @keyframes dash-column-up { from { transform: translate3d(0,0,0); } to { transform: translate3d(0,-50%,0); } }
      @keyframes dash-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes dash-counter-orbit { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      @keyframes dash-rise { from { transform: translate3d(0,14px,0); opacity: 0; } to { transform: none; opacity: 1; } }
      .dash-col { will-change: transform; }
      .dash-ring { will-change: transform; }
      .dash-paused, .dash-paused * { animation-play-state: paused !important; }
      @media (prefers-reduced-motion: reduce) {
        .dash-col, .dash-ring, .dash-spin, .dash-rise { animation: none !important; }
        .dash-rise { transform: none !important; opacity: 1 !important; }
      }
    `}</style>
  );
}

/**
 * Softens the ornament's inner edge so it dissolves into the card rather
 * than starting at a hard line. It is no longer holding the ornament off
 * the text: the column does that, structurally.
 */
const FADE_LEFT: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 26%, #000 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, #000 26%, #000 100%)',
};

// --- Reports ----------------------------------------------------------

/**
 * Two columns of REAL report covers travelling upward at different
 * speeds. The stack is rendered twice and translated by exactly half its
 * height, which is what makes the loop seamless; both halves are the same
 * <img> elements, so the second costs no extra decode.
 */
export function ReportColumns({ covers, paused }: { covers: string[]; paused: boolean }) {
  const columns = useMemo(() => {
    if (covers.length === 0) return [] as string[][];
    // Deal the covers alternately, so the two columns never run in step.
    const a = covers.filter((_, i) => i % 2 === 0);
    const b = covers.filter((_, i) => i % 2 === 1);
    return [a.length ? a : covers, b.length ? b : covers.slice().reverse()];
  }, [covers]);

  if (!columns.length) return null;

  return (
    /* Two equal columns, the pair centred in the ornament column and
       pushed just past the right edge, so the second contributes as much
       as the first and only the outer sliver is cut by the card. */
    <div className={`absolute inset-y-0 -left-1 -right-5 flex items-stretch justify-center gap-2 ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      {columns.map((column, ci) => (
        <div key={ci} className="relative flex-1 min-w-0 max-w-[80px] overflow-hidden">
          <div
            className="dash-col absolute inset-x-0 top-0 flex flex-col gap-2"
            style={{ animation: `dash-column-up ${ci === 0 ? 26 : 34}s linear infinite` }}
          >
            {[...column, ...column].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
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
}

// --- Members ----------------------------------------------------------

/**
 * The membership as an ordered composition: two concentric rings of
 * portraits turning slowly in opposite directions, each photo held
 * upright by a counter-rotation so no face is ever on its side.
 *
 * Rings rather than a scatter because the previous swarm placed people at
 * pseudo-random radii, which let two portraits overlap and read as
 * confusion. On a ring, the gap between neighbours is a function of the
 * radius and the count, so NO TWO IMAGES CAN EVER TOUCH: the sizes below
 * are chosen so the chord between adjacent centres exceeds a diameter.
 */
export function MemberRings({ avatars, compact, paused }: {
  avatars: AvatarRow[] | null; compact: boolean; paused: boolean;
}) {
  const rings = useMemo(() => {
    const list = (avatars ?? []).filter((a) => a.photo_url);
    if (!list.length) return [];
    // Sized against the card as it ACTUALLY renders, not enlarged: the
    // ornament column is about 46% of a 300px card, so the field is
    // roughly 140px across and a ring of twelve at that radius resolves
    // to portraits too small to be anybody. Nine outside and four inside,
    // larger and closer, reads as a group of people.
    const outerCount = compact ? 7 : 9;
    const innerCount = compact ? 3 : 4;
    const outer = list.slice(0, outerCount);
    const inner = list.slice(outerCount, outerCount + innerCount);
    return [
      { people: outer, radius: 38, size: compact ? 26 : 30, spin: 110, reverse: false },
      { people: inner.length ? inner : outer.slice(0, innerCount), radius: 15, size: compact ? 22 : 25, spin: 86, reverse: true },
    ];
  }, [avatars, compact]);

  if (!rings.length) return null;

  return (
    <div className={`absolute inset-0 ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      {/* A square field keeps the composition circular rather than oval,
          and sits just past the right edge so the outer ring is cut. */}
      <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 aspect-square h-[128%]">
        {rings.map((ring, ri) => (
          <div
            key={ri}
            className="dash-ring absolute inset-0"
            style={{ animation: `${ring.reverse ? 'dash-counter-orbit' : 'dash-orbit'} ${ring.spin}s linear infinite` }}
          >
            {ring.people.map((person, i) => {
              // Placed by COORDINATE, not by a percentage translate: a
              // percentage translate is measured against the element's own
              // box, which for a 17px portrait would put every ring at a
              // radius of seven pixels.
              const rad = (i / ring.people.length) * Math.PI * 2;
              return (
                <span
                  key={`${person.name}-${person.surname}-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${50 + Math.cos(rad) * ring.radius}%`,
                    top: `${50 + Math.sin(rad) * ring.radius}%`,
                    width: ring.size,
                    height: ring.size,
                  }}
                >
                  {/* Undoes the ring's rotation, so no face is ever tilted. */}
                  <span
                    className="dash-ring block h-full w-full rounded-full overflow-hidden border border-background bg-muted"
                    style={{
                      animation: `${ring.reverse ? 'dash-orbit' : 'dash-counter-orbit'} ${ring.spin}s linear infinite`,
                    }}
                  >
                    <img src={person.photo_url!} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Alumni -----------------------------------------------------------

/**
 * The globe from the alumni page, oversized and pushed into the corner so
 * the rounded card edge cuts it. That crop is the effect the earlier
 * Dashboard had and the reason the card read as a window rather than a box.
 */
export function GlobeOrnament({ paused }: { paused: boolean }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      {/* 168% of the card height put the sphere so far outside the column
          that only a sliver of its limb survived the crop: unrecognisable
          on a wide screen and, on a phone, nothing at all. The globe is
          now a little larger than the card is tall and offset just enough
          for the card's edge to clip it, which is the crop that worked. */}
      <div className="absolute right-[-16%] top-1/2 -translate-y-1/2 aspect-square h-[116%]">
        <MiniAlumniGlobe />
      </div>
    </div>
  );
}

// --- Readings ---------------------------------------------------------

/**
 * A SHELF from the /readings bookcase, cropped so the books are the
 * subject.
 *
 * The first crop took the case's upper-left corner, which is where its
 * category header sits: "BOOKS" ended up set at nearly the scale of the
 * KPI number and read as a second, competing label, while the actual
 * spines were a detail in the corner. This crop drops the header
 * entirely and takes a shelf instead: four real books at legible size,
 * standing on a real shelf board, with just enough of the pilaster and
 * the board above to place them in the case rather than on a generic
 * bookshelf.
 */
export function LibraryCorner({ readings, animate }: { readings: ReadingRow[] | null; animate: boolean }) {
  const books = (readings ?? []).slice(0, 4);
  const soft = 'hsl(var(--accent-soft))';
  if (!books.length) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={FADE_LEFT} aria-hidden="true">
      <div
        className="absolute inset-x-[6%] -right-[10%] top-1/2 -translate-y-1/2"
        style={animate ? { animation: 'dash-rise 560ms cubic-bezier(.22,1,.36,1) both' } : undefined}
      >
        {/* The underside of the board above, so the shelf is enclosed. */}
        <div className="h-[3px] border-t-[1.5px]" style={{ borderColor: soft }} />
        <div className="flex">
          {/* A slice of the fluted pilaster, for context, not for weight. */}
          <div className="w-[9px] shrink-0 flex justify-center border-r-[1.5px] py-1" style={{ borderColor: soft }}>
            <span className="h-full w-[5px] border-x" style={{ borderColor: soft }} />
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="flex items-end gap-[6px] pl-2.5 pr-1 h-[104px]">
              {books.map((r, i) => {
                const g = spineGeometry(r.id);
                return (
                  <span
                    key={r.id}
                    className="relative shrink-0 rounded-t-[3px] border-[1.5px]"
                    style={{
                      width: Math.round(g.w * 0.92),
                      height: Math.round(g.h * 0.86),
                      borderColor: soft,
                      background: i % 2 === 0 ? 'hsl(var(--accent-soft)/0.12)' : 'hsl(var(--accent-soft)/0.05)',
                    }}
                  >
                    <span className="absolute left-[3px] right-[3px] top-2 border-t" style={{ borderColor: soft }} />
                    <span className="absolute left-[3px] right-[3px] bottom-2 border-t" style={{ borderColor: soft }} />
                    <span className="absolute inset-x-0 top-[13px] bottom-[13px] flex items-center justify-center overflow-hidden">
                      <span
                        className="max-h-full overflow-hidden whitespace-nowrap font-serif text-[9px] leading-none text-accent/80"
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
}
