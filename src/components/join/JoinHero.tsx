import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useIsDesktop } from '@/hooks/use-desktop';
import { heroMedia } from './media';
import { useDeferredMount } from './useJoinMotion';

const HeroScene = lazy(() => import('./HeroScene'));

// =====================================================================
// Hero.
//
// H1 and payoff line only: no scroll cue, no secondary action, no badges.
//
// First paint is text on a flat dark ground. Nothing is awaited: the
// static capture fades in when it decodes, and the WebGL scene fades in
// over it, later still, only when the browser is idle and the reader has
// not asked for less motion. If either never arrives the hero is complete
// without them, which is what the old build got wrong by holding the
// whole page behind a 1.8 MB image.
// =====================================================================

interface Props {
  still: boolean;
}

export function JoinHero({ still }: Props) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [stillLoaded, setStillLoaded] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [scrollOut, setScrollOut] = useState(0);
  const idle = useDeferredMount();
  const isDesktop = useIsDesktop();

  // The scene is an enhancement on top of a complete hero. Phones and
  // tablets keep the static capture: a WebGL particle field is not worth
  // the battery or the memory on a device that will scroll straight past
  // it, and the still says the same thing.
  const wantsScene = !still && isDesktop && idle && !sceneFailed;

  useEffect(() => {
    if (still) return;
    const el = heroRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const h = rect.height || 1;
      setScrollOut(Math.max(0, Math.min(1, -rect.top / h)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [still]);

  return (
    <section
      ref={heroRef}
      data-page-hero
      className="relative flex min-h-[100svh] items-center overflow-hidden"
      style={{ backgroundColor: 'var(--join-bg)' }}
    >
      {/* Static capture of the same scene. Decorative: the hero reads
          completely from its text alone. */}
      <picture aria-hidden>
        <source srcSet={heroMedia.stillAvif} type="image/avif" />
        <img
          src={heroMedia.stillWebp}
          alt=""
          width={heroMedia.width}
          height={heroMedia.height}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setStillLoaded(true)}
          onError={() => setStillLoaded(false)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out"
          style={{ opacity: stillLoaded ? 1 : 0 }}
        />
      </picture>

      {wantsScene && (
        <Suspense fallback={null}>
          <HeroScene still={still} scrollOut={scrollOut} onFailure={() => setSceneFailed(true)} />
        </Suspense>
      )}

      {/* Keeps the headline at contrast whatever settles behind it. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,3,15,0.92) 0%, rgba(5,3,15,0.74) 45%, rgba(5,3,15,0.35) 100%)',
        }}
      />

      <div className="relative container pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="max-w-3xl">
          <h1
            className="font-serif leading-[1.05] text-[clamp(2.75rem,7.5vw,4.75rem)]"
            style={{ color: 'var(--join-ink)' }}
          >
            Join Minerva
          </h1>
          <p
            className="font-body text-body-lg md:text-xl leading-relaxed mt-6 max-w-2xl"
            style={{ color: 'var(--join-body)' }}
          >
            Built like an investment firm, run by students. Your first step towards a career in finance.
          </p>
        </div>
      </div>
    </section>
  );
}

export default JoinHero;
