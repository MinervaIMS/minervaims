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
      className="relative flex min-h-[calc(100svh+120px)] flex-col overflow-hidden sm:min-h-[100svh]"
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
        The stage content is split into two flex groups: the compact block of
        words, figures and status at the top, and the scroll invitation at the
        foot. `justify-between` pushes them to opposite ends of the available
        height, while the invitation carries a responsive bottom margin that
        keeps it clear of the fixed cookie banner. On small screens the hero
        is allowed to grow past 100svh so the invitation is reachable by
        scrolling rather than squeezed under the banner.
      */}
      <div className="container relative z-10 flex flex-1 flex-col justify-between pb-6 pt-[max(92px,11.5svh)] md:h-sm:pb-5 md:h-sm:pt-[max(88px,9svh)]">
        {/*
          Title, payoff, figures and status rectangle are spaced as one compact
          group near the top, with even vertical rhythm between them.
        */}
        <div className="flex flex-col gap-[1.6svh] sm:gap-[2.2svh] md:h-sm:gap-[1.6svh]">
          {/* Title and payoff */}
          <div>
            <h1 className="font-serif text-[2.1rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem] md:h-sm:text-[3.4rem]">
              {JOIN_HERO.title}
            </h1>
            <p className="font-body mt-3 max-w-2xl text-body text-background/85 sm:mt-4 sm:text-body-lg md:mt-5 md:text-xl md:h-sm:mt-3 md:h-sm:text-body-lg">
              {JOIN_HERO.payoff}
            </p>
          </div>

          {/* Figures */}
          <div>{figures}</div>

          {/* Application status */}
          <div className="max-w-4xl">{children}</div>
        </div>

        {/* Scroll invitation sits at the foot of the stage, clear of the fixed cookie banner. */}
        <div className="flex justify-center mb-[340px] sm:mb-[220px] md:mb-[180px] lg:mb-[160px]">
          <ScrollInvitation reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

export default JoinHeroStage;
