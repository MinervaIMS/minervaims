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
 * The landing stage: navbar, title, payoff, live figures, application status
 * and the scroll invitation all share one dark surface that fills the whole
 * viewport. Heights use svh so the mobile URL bar cannot push the invitation
 * off screen.
 *
 * The middle zone (the figures) is the elastic one, so the composition stays
 * balanced from short laptop viewports to tall phones without any element
 * being compressed or stranded. `figures` and `children` are passed in rather
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
    <>
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
        */}
        <div className="container relative z-10 flex flex-1 flex-col pb-[3svh] pt-[max(96px,13svh)]">
          {/* Title and payoff, set a little below the navbar. */}
          <div className="mt-[1svh] md:mt-[2svh]">
            <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem] md:h-sm:text-[3.4rem]">
              {JOIN_HERO.title}
            </h1>
            <p className="font-body mt-4 max-w-2xl text-body text-background/85 sm:text-body-lg md:mt-5 md:text-xl md:h-sm:mt-3 md:h-sm:text-body-lg">
              {JOIN_HERO.payoff}
            </p>
          </div>

          {/*
            Figures take the elastic middle, so they are clearly separated from
            both the payoff above and the status rectangle below at any height.
          */}
          <div className="flex flex-1 items-center py-[2.5svh]">{figures}</div>

          {/* Application status, lifted clear of the cue beneath it. */}
          <div className="mb-[2.5svh]">{children}</div>

          {/* Scroll invitation, on the same dark stage. */}
          <div className="flex justify-center pt-1">
            <span
              className={`flex flex-col items-center gap-1.5 text-background ${
                reduced ? '' : 'motion-safe:animate-[scrollCue_2.2s_ease-in-out_infinite]'
              }`}
            >
              <span className="font-serif text-lg leading-none md:text-xl">
                {JOIN_HERO.scrollCue}
              </span>
              <svg
                width="26"
                height="26"
                viewBox="0 0 26 26"
                fill="none"
                aria-hidden="true"
                className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              >
                <path
                  d="M13 4v14M6 12.5 13 19.5 20 12.5"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

    </>
  );
}

export default JoinHeroStage;
