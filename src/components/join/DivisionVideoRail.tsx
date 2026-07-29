import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { JOIN_DIVISIONS, type JoinDivision } from '@/lib/join-content';
import './DivisionVideoRail.css';

// =====================================================================
// Our Divisions — vertical-to-horizontal-to-vertical scroll sequence.
// ---------------------------------------------------------------------
// The section pins for a distance proportional to the rail width, and the
// scroll that would have moved the page vertically is translated into
// horizontal travel across the five cards. Pacing is deliberately slowed
// (SCROLL_PACING) so each division has time to be read.
//
// gsap/lenis are not needed here: the whole interaction is a single
// transform driven from the pinned wrapper's own scroll progress, which
// is cheaper, does not fight the page's native scrolling, and degrades to
// a plain horizontal scroller when motion is reduced or the viewport is
// too small to pin comfortably.
// =====================================================================

/** Horizontal travel is stretched by this factor relative to normal scrolling. */
const SCROLL_PACING = 2.4;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether this device gets the pinned sequence. Resolved during the first
 * render rather than in an effect: the pinned section is several viewports
 * tall, so deciding it after paint would move everything below it and post a
 * large layout shift.
 */
const canPin = () => {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  return (navigator.hardwareConcurrency ?? 4) >= 4;
};

const canPlayVideo = () => {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  return (
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData !== true
  );
};

function DivisionCard({
  division,
  index,
  active,
  canPlay,
}: {
  division: JoinDivision;
  index: number;
  active: boolean;
  canPlay: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canPlay) return;
    if (active) {
      // Autoplay can be refused (data saver, low power mode). The poster
      // remains, so the card is never blank and never throws.
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active, canPlay]);

  return (
    <article className="jd-card" aria-labelledby={`jd-title-${division.key}`}>
      <div className="jd-media">
        {/*
          Poster carries the finished report page, so the still frame a user
          sees before playback is the completed analysis. Dimensions are fixed
          by the 9:16 card, so no media can shift the layout.
        */}
        <img
          src={division.poster}
          alt=""
          width={540}
          height={960}
          className="jd-poster"
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
        {canPlay && (
          <video
            ref={videoRef}
            className={`jd-video ${ready ? 'is-ready' : ''}`}
            src={division.video}
            poster={division.poster}
            width={810}
            height={1440}
            muted
            loop
            playsInline
            preload={index === 0 ? 'auto' : 'metadata'}
            aria-hidden="true"
            tabIndex={-1}
            onCanPlay={() => setReady(true)}
          />
        )}
        <div className="jd-scrim" aria-hidden="true" />
      </div>

      <div className="jd-body">
        <h3 id={`jd-title-${division.key}`} className="jd-title">
          {division.name}
        </h3>
        <p className="jd-text">{division.description}</p>
      </div>
    </article>
  );
}

export function DivisionVideoRail() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [pinDistance, setPinDistance] = useState(0);
  const [overflow, setOverflow] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Resolved during the first render so the reserved height is correct from
  // the very first paint. Constrained devices and reduced motion keep the
  // static path: a plain horizontal scroller with no pinning and no video.
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [canPlay, setCanPlay] = useState(canPlayVideo);
  const [pinned, setPinned] = useState(canPin);

  // Follow later changes to the motion preference.
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(motion.matches);
      setPinned(canPin());
      setCanPlay(canPlayVideo());
    };
    motion.addEventListener('change', apply);
    return () => motion.removeEventListener('change', apply);
  }, []);

  const measure = useCallback(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    if (!rail || !track) return;
    const extra = Math.max(0, track.scrollWidth - rail.clientWidth);
    setOverflow(extra);
    setPinDistance(Math.round(extra * SCROLL_PACING));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Drive horizontal travel from the pinned wrapper's scroll progress.
  useEffect(() => {
    if (!pinned || overflow <= 0) {
      setProgress(0);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / total));
      setProgress(p);
      setActiveIndex(Math.min(JOIN_DIVISIONS.length - 1, Math.round(p * (JOIN_DIVISIONS.length - 1))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned, overflow]);

  // Static path: track the nearest card from native horizontal scrolling so the
  // dot indicator and video playback still follow the reader.
  useEffect(() => {
    if (pinned) return;
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 0 ? rail.scrollLeft / max : 0;
      setActiveIndex(Math.min(JOIN_DIVISIONS.length - 1, Math.round(p * (JOIN_DIVISIONS.length - 1))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      rail.removeEventListener('scroll', onScroll);
    };
  }, [pinned]);

  const goTo = (index: number) => {
    if (pinned) {
      const section = sectionRef.current;
      if (!section) return;
      const total = section.offsetHeight - window.innerHeight;
      const target =
        section.offsetTop + (total * index) / Math.max(1, JOIN_DIVISIONS.length - 1);
      window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    } else {
      const rail = railRef.current;
      const card = rail?.children[index] as HTMLElement | undefined;
      card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const translate = pinned ? -(progress * overflow) : 0;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="join-divisions-heading"
      className="bg-background"
      style={pinned && overflow > 0 ? { height: `calc(100svh + ${pinDistance}px)` } : undefined}
    >
      <div className={pinned && overflow > 0 ? 'jd-pin' : ''}>
        <div className="container">
          <h2
            id="join-divisions-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            Our divisions
          </h2>
        </div>

        <div
          ref={railRef}
          className={`jd-rail ${pinned && overflow > 0 ? 'is-pinned' : 'is-static scrollbar-hide'}`}
        >
          <div
            ref={trackRef}
            className="jd-track"
            style={pinned && overflow > 0 ? { transform: `translate3d(${translate}px,0,0)` } : undefined}
          >
            {JOIN_DIVISIONS.map((division, i) => (
              <DivisionCard
                key={division.key}
                division={division}
                index={i}
                active={i === activeIndex}
                canPlay={canPlay}
              />
            ))}
          </div>
        </div>

        <div className="jd-dots" role="tablist" aria-label="Divisions">
          {JOIN_DIVISIONS.map((division, i) => (
            <button
              key={division.key}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={division.name}
              className={`jd-dot ${i === activeIndex ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default DivisionVideoRail;
