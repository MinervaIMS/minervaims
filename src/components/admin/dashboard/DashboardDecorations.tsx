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

/** Fades the ornament out before it reaches the figure on the left. */
const FADE_LEFT: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 34%, #000 62%, #000 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, transparent 34%, #000 62%, #000 100%)',
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
    <div className={`absolute inset-y-0 right-0 w-[62%] flex justify-end gap-2 pr-4 ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      {columns.map((column, ci) => (
        <div key={ci} className="relative w-[42%] max-w-[74px] overflow-hidden">
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
    const outerCount = compact ? 8 : 12;
    const innerCount = compact ? 4 : 6;
    const outer = list.slice(0, outerCount);
    const inner = list.slice(outerCount, outerCount + innerCount);
    return [
      { people: outer, radius: 43, size: compact ? 15 : 17, spin: 96, reverse: false },
      { people: inner.length ? inner : outer.slice(0, innerCount), radius: 21, size: compact ? 13 : 15, spin: 74, reverse: true },
    ];
  }, [avatars, compact]);

  if (!rings.length) return null;

  return (
    <div className={`absolute inset-y-0 right-0 w-[62%] ${paused ? 'dash-paused' : ''}`} style={FADE_LEFT}>
      {/* A square field keeps the composition circular rather than oval
          when the card is wider than it is tall. */}
      <div className="absolute right-[-6%] top-1/2 -translate-y-1/2 aspect-square h-[150%]">
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
      <div className="absolute right-[-14%] top-1/2 -translate-y-1/2 aspect-square h-[168%]">
        <MiniAlumniGlobe />
      </div>
    </div>
  );
}

// --- Readings ---------------------------------------------------------

/**
 * The upper-left corner of the /readings bookcase, cropped into the card:
 * the stepped cornice, the fluted pilaster, a category header and one
 * shelf carrying three REAL books, each at the width and height its own
 * id resolves to through `spineGeometry`, so the spines here are exactly
 * the spines on the public page.
 */
export function LibraryCorner({ readings, animate }: { readings: ReadingRow[] | null; animate: boolean }) {
  const books = (readings ?? []).slice(0, 3);
  const soft = 'hsl(var(--accent-soft))';

  return (
    <div className="absolute inset-y-0 right-0 w-[64%] overflow-hidden" style={FADE_LEFT} aria-hidden="true">
      <div
        className={`absolute left-[12%] right-[-24%] top-[10%] bottom-[-14%] ${animate ? 'dash-rise' : ''}`}
        style={animate ? { animation: 'dash-rise 520ms cubic-bezier(.22,1,.36,1) both' } : undefined}
      >
        {/* Cornice: three stepped boards, the outermost overhanging. */}
        <div className="h-[5px] -mx-2 rounded-t-[5px] border-[1.5px] border-b-0" style={{ borderColor: soft, background: 'hsl(var(--accent-soft)/0.07)' }} />
        <div className="h-[6px] -mx-1 border-[1.5px]" style={{ borderColor: soft, background: 'hsl(var(--accent-soft)/0.05)' }} />
        {/* Body: the closing pilaster on the left, then one column. */}
        <div className="flex border-x-[1.5px]" style={{ borderColor: soft, height: 'calc(100% - 11px)' }}>
          <div className="w-[14px] shrink-0 flex flex-col border-r-[1.5px]" style={{ borderColor: soft }}>
            <span className="h-2 shrink-0 border-b" style={{ borderColor: soft, background: 'hsl(var(--accent-soft)/0.07)' }} />
            <span className="flex-1 flex justify-center py-1">
              <span className="h-full w-[7px] border-x" style={{ borderColor: soft }}>
                <span className="block h-full w-px mx-auto" style={{ background: soft }} />
              </span>
            </span>
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-5 shrink-0 flex items-center justify-center border-b px-2" style={{ borderColor: soft }}>
              <span className="font-body text-[7px] uppercase tracking-[0.18em] text-accent truncate">Books</span>
            </div>
            <div className="relative flex-1 border-b-2" style={{ borderColor: soft }}>
              <span className="absolute left-0 right-0 bottom-[2px] border-t" style={{ borderColor: 'hsl(var(--accent-soft)/0.45)' }} />
              <div className="absolute inset-x-0 top-0 bottom-[2px] flex items-end gap-[5px] px-2 overflow-hidden">
                {books.map((r) => {
                  const g = spineGeometry(r.id);
                  return (
                    <span
                      key={r.id}
                      className="relative shrink-0 rounded-t-[2px] border-[1.5px]"
                      style={{
                        width: g.w * 0.62,
                        height: g.h * 0.52,
                        borderColor: soft,
                        background: 'hsl(var(--accent-soft)/0.07)',
                      }}
                    >
                      <span className="absolute left-[2px] right-[2px] top-1 border-t" style={{ borderColor: soft }} />
                      <span className="absolute left-[2px] right-[2px] bottom-1 border-t" style={{ borderColor: soft }} />
                      <span className="absolute inset-x-0 top-[9px] bottom-[9px] flex items-center justify-center overflow-hidden">
                        <span
                          className="max-h-full overflow-hidden whitespace-nowrap font-serif text-[7px] leading-none text-accent/80"
                          style={{ writingMode: 'vertical-rl' }}
                        >
                          {r.title}
                        </span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
