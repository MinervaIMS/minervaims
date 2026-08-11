import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { JOIN_HERO } from '@/lib/join-content';
import ScrollInvitation from '@/components/join/ScrollInvitation';

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
 * The words, the figures and the status rectangle are spaced by fixed steps so
 * they read as one group; the invitation zone at the foot is the elastic one,
 * which keeps the invitation deliberately clear of both the rectangle and the
 * bottom edge at any height. `figures` and `children` are passed in rather
 * than imported so this component stays layout-only.
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
        100svh on a short laptop as well as a tall phone. The top inset never
        falls below the height of the fixed header.

        The three information groups at the top — words, figures, status —
        are spaced by fixed svh steps, so they stay read as one block and the
        figures sit close to the payoff they qualify. All the remaining
        height accrues to the invitation zone at the foot, which is the one
        elastic row: it is what gives the invitation deliberate room instead
        of leaving it stranded against the bottom edge.
      */}
      <div className="container relative z-10 flex flex-1 flex-col pb-[3.5svh] pt-[max(92px,11.5svh)] md:h-sm:pb-[1.6svh] md:h-sm:pt-[max(88px,9svh)]">
        {/* Title and payoff, set a little below the navbar. */}
        <div className="mt-[1svh] md:mt-[1.5svh]">
          <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem] md:h-sm:text-[3.4rem]">
            {JOIN_HERO.title}
          </h1>
          <p className="font-body mt-4 max-w-2xl text-body text-background/85 sm:text-body-lg md:mt-5 md:text-xl md:h-sm:mt-3 md:h-sm:text-body-lg">
            {JOIN_HERO.payoff}
          </p>
        </div>

        {/* Figures, held close to the payoff they qualify. */}
        <div className="mt-[3.2svh] md:h-sm:mt-[2.4svh]">{figures}</div>

        {/* Application status, directly under the figures. */}
        <div className="mt-[3.6svh] md:h-sm:mt-[2.6svh]">{children}</div>

        {/* The elastic row: the invitation centres in whatever height is left. */}
        <div className="flex flex-1 items-center justify-center pt-[3svh] md:h-sm:pt-[2svh]">
          <ScrollInvitation reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

export default JoinHeroStage;
