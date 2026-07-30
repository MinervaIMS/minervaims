import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { JOIN_HERO } from '@/lib/join-content';

// The particle field is the one ambient layer on the page. It is code-split so
// the initial route bundle does not carry the canvas, and it only mounts after
// the hero text has painted: first paint never waits on it.
const DotField = lazy(() => import('@/components/shared/DotField'));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Navbar, hero, figures and status share one dark stage occupying ~85% of the
 * landing viewport, with the remaining ~15% a white band carrying the scroll
 * cue. Heights use svh so the mobile URL bar does not push the cue off screen.
 *
 * Vertical order inside the stage: title and payoff sit high, the live figures
 * sit in the middle, and the application status sits low but fully inside the
 * dark area. `figures` and `children` are passed in rather than imported here
 * so this component stays layout-only.
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
    <>
      <div
        data-page-hero
        className="relative flex min-h-[85svh] flex-col overflow-hidden"
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

        <div className="container relative z-10 flex flex-1 flex-col pb-6 pt-24 md:pb-12 md:pt-32">
          {/* Title and payoff, held high in the stage. */}
          <div>
            <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem]">
              {JOIN_HERO.title}
            </h1>
            <p className="font-body mt-4 max-w-2xl text-body text-background/85 sm:text-body-lg md:mt-5 md:text-xl">
              {JOIN_HERO.payoff}
            </p>
          </div>

          {/* Live figures, centred in the space between title and status. */}
          <div className="flex flex-1 items-center py-4 md:py-10">{figures}</div>

          {/* Application status, low in the stage but fully inside the dark area. */}
          <div>{children}</div>
        </div>
      </div>

      {/* Remaining ~15% of the landing viewport: white, with the scroll cue. */}
      <div className="flex h-[15svh] min-h-[84px] items-center justify-center bg-background">
        <span
          className={`flex flex-col items-center gap-2 text-accent ${
            reduced ? '' : 'motion-safe:animate-[scrollCue_2.4s_ease-in-out_infinite]'
          }`}
        >
          <span className="font-serif text-base leading-none md:text-lg">
            {JOIN_HERO.scrollCue}
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M11 3.5v13M5 11l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </>
  );
}

export default JoinHeroStage;
