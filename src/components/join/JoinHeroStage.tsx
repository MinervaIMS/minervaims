import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { JOIN_HERO } from '@/lib/join-content';
import ScrollInvitation from '@/components/join/ScrollInvitation';
import { perfMode } from '@/lib/perf';

// The particle field is the one ambient layer on the page. It is code-split so
// the initial route bundle does not carry the canvas, and it only mounts after
// the hero text has painted: first paint never waits on it.
const DotField = lazy(() => import('@/components/shared/DotField'));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The landing stage: navbar, title, payoff, live figures, application status
 * and the scroll invitation all share one dark surface that fills the whole
 * viewport. Heights use svh so the mobile URL bar cannot push the invitation
 * off screen.
 *
 * THE WHOLE HEIGHT IS SHARED, NOT SPENT AT THE FOOT. The four blocks used to
 * be separated by fixed svh steps with a single elastic row beneath them, so
 * every pixel a taller screen offered went to one gap: the words, the figures
 * and the card bunched into the upper half and the lower half was empty. The
 * gaps are now weighted elastic spacers, so a taller viewport lengthens all
 * four of them in proportion and the composition keeps filling the stage
 * instead of rising to the top of it. Each spacer keeps a minimum, so on a
 * short laptop the grouping is exactly what it was.
 *
 * `figures` and `children` are passed in rather than imported so this
 * component stays layout-only.
 */
export function JoinHeroStage({
  figures,
  children,
}: {
  figures: ReactNode;
  children: ReactNode;
}) {
  const [showField, setShowField] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);

    if (prefersReducedMotion()) return () => mq.removeEventListener('change', apply);
    // Ambience only: skipped entirely on a browser that cannot afford a
    // WebGL layer. See lib/perf.ts.
    if (perfMode() === 'lite') return () => mq.removeEventListener('change', apply);

    // Mount the canvas once the browser is idle, after the LCP text is up.
    const idle = (window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    let handle: number;
    if (idle) {
      handle = idle(() => setShowField(true), { timeout: 1200 });
    } else {
      handle = window.setTimeout(() => setShowField(true), 400);
    }
    return () => {
      mq.removeEventListener('change', apply);
      if (!idle) window.clearTimeout(handle);
    };
  }, []);

  return (
    <div
      data-page-hero
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ backgroundColor: '#000' }}
    >
      {/*
        Reserved, absolutely positioned layer: the canvas can never introduce
        layout shift, and under reduced motion it is simply never mounted.
      */}
      <div className="absolute inset-0" aria-hidden="true">
        {showField && !reduced && (
          <Suspense fallback={null}>
            <div className="h-full w-full animate-[fadeIn_700ms_ease-out_forwards] opacity-0">
              <DotField glowRadius={0} />
            </div>
          </Suspense>
        )}
      </div>

      {/*
        Vertical rhythm is viewport-relative so the whole composition fits
        100svh on a short laptop as well as a tall phone. The padding at the
        top is only the clearance the fixed header needs; everything past that
        is handed to the spacers below.

        FOUR BLOCKS, FOUR ELASTIC GAPS. Each `Gap` is a flex item with a grow
        weight and a floor: it never falls below its minimum, and any height
        the viewport has beyond the content is split between the four in the
        ratio of their weights. The last gap is the widest of them so the
        invitation still stands clear of the card above it, and the first is
        the narrowest so the title stays the thing nearest the navbar. There
        are no maximums on purpose: a maximum would leave slack the layout
        could not place, which is the fault being corrected here.
      */}
      <div className="container relative z-10 flex flex-1 flex-col pb-[3svh] pt-[max(92px,8svh)] md:h-sm:pb-[2.4svh] md:h-sm:pt-[max(88px,7svh)]">
        <Gap weight={0.6} min="1.5svh" />

        {/* Title and payoff: one block, so the pair is never pulled apart. */}
        <div className="shrink-0">
          <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem] md:h-sm:text-[3.4rem]">
            {JOIN_HERO.title}
          </h1>
          <p className="font-body mt-4 max-w-2xl text-body text-background/85 sm:text-body-lg md:mt-5 md:text-xl md:h-sm:mt-3 md:h-sm:text-body-lg">
            {JOIN_HERO.payoff}
          </p>
        </div>

        <Gap weight={1} min="2.4svh" />

        <div className="shrink-0">{figures}</div>

        <Gap weight={1} min="2.6svh" />

        <div className="shrink-0">{children}</div>

        <Gap weight={1.25} min="2.6svh" />

        <div className="flex shrink-0 justify-center">
          <ScrollInvitation reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

/**
 * One elastic gap between two blocks of the stage.
 *
 * `flexGrow` is its share of whatever height the viewport has spare, so the
 * four gaps lengthen together rather than one of them taking everything;
 * `minHeight` is the distance it holds when there is nothing spare, which is
 * what keeps the grouping intact on a short laptop and on a phone.
 *
 * Written as an inline style rather than a class because the weight is a prop:
 * Tailwind can only generate the classes it can read in the source, so a
 * template-built `flex-[...]` would silently produce no CSS at all.
 */
function Gap({ weight, min }: { weight: number; min: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none"
      style={{ flex: `${weight} 0 0%`, minHeight: min }}
    />
  );
}

export default JoinHeroStage;
