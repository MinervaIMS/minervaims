import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { JOIN_HERO } from '@/lib/join-content';
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
 * The /join opening: title, payoff and the live key figures on one dark band.
 *
 * IT IS AN INTRODUCTION NOW, NOT A STAGE. It used to be a full 100svh
 * composition holding the words, the figures, the application card and a
 * scroll invitation, spaced by elastic gaps so the four filled whatever
 * height the viewport had. That made /join the only page on the site whose
 * opening claimed the entire screen, and it put the one thing a candidate
 * came for - whether they can apply - above the fold but below everything
 * else.
 *
 * It now follows the same shape as the fund and division pages: a dark band
 * deep enough to hold its content comfortably and no deeper, and then the
 * white page. The title and payoff keep exactly the type and hierarchy
 * PageIntroduction uses on those pages, so the three openings are visibly the
 * same family; the key figures are the one addition, set below the payoff
 * they qualify and clearly part of the same introduction.
 *
 * The height is the content plus its padding, with no viewport unit anywhere:
 * about 545px on a wide screen and about 460px on a phone, against a viewport
 * that was previously filled edge to edge. The white section, and therefore
 * the application card, is visible without scrolling on both.
 *
 * `figures` is passed in rather than imported so this component stays
 * layout-only.
 */
export function JoinHeroStage({ figures }: { figures: ReactNode }) {
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
      className="relative overflow-hidden"
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
        The top inset clears the fixed header, which is 84px plus the iOS
        status bar, and then adds the band of space the fund pages leave above
        their own titles. There is no viewport unit in this block at all: the
        band is exactly as tall as what it holds, which is what makes it read
        as an introduction rather than as a screen.
      */}
      <div className="container relative z-10 pb-20 pt-[calc(84px+env(safe-area-inset-top)+theme(spacing.10))] md:pb-32 md:pt-[calc(84px+env(safe-area-inset-top)+theme(spacing.14))]">
        {/* Title and payoff carry the same type as PageIntroduction, so the
            opening of /join reads as a member of the same family as the fund
            and division pages rather than as its own thing. */}
        <h1 className="font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem]">
          {JOIN_HERO.title}
        </h1>
        <p className="font-body mt-4 max-w-2xl text-body text-background/85 sm:text-body-lg md:mt-5 md:text-xl">
          {JOIN_HERO.payoff}
        </p>

        {/* THE FIGURES BELONG TO THE INTRODUCTION. They sit under the payoff
            they qualify, at a distance that reads as "and here is what that
            means" rather than as a separate band that happens to share a
            background. The space beneath them, before the white begins, is
            the page's own rhythm rather than a leftover. */}
        <div className="mt-10 md:mt-12">{figures}</div>
      </div>
    </div>
  );
}

export default JoinHeroStage;
