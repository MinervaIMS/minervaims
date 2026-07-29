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
 * Navbar, hero and status share one dark stage occupying ~85% of the landing
 * viewport, with the remaining ~15% a white band carrying the scroll cue.
 * Heights use svh so the mobile URL bar does not push the cue off screen.
 */
export function JoinHeroStage({ children }: { children: ReactNode }) {
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

        <div className="container relative z-10 flex flex-1 flex-col justify-center pb-14 pt-32 md:pb-20 md:pt-40">
          <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem]">
            {JOIN_HERO.title}
          </h1>
          <p className="font-body mt-6 max-w-2xl text-body-lg text-background/85 md:text-xl">
            {JOIN_HERO.payoff}
          </p>

          <div className="mt-10 md:mt-14">{children}</div>
        </div>
      </div>

      {/* Remaining ~15% of the landing viewport: white, with the scroll cue. */}
      <div className="flex h-[15svh] min-h-[76px] items-center justify-center bg-background">
        <span
          className={`flex flex-col items-center gap-2 text-muted-foreground ${
            reduced ? '' : 'motion-safe:animate-[scrollCue_2.4s_ease-in-out_infinite]'
          }`}
        >
          <span className="font-body text-[0.7rem] uppercase tracking-[0.22em]">Scroll</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M9 3v11M4 9.5 9 14.5 14 9.5"
              stroke="currentColor"
              strokeWidth="1.4"
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
