import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { JOIN_DIVISIONS, type JoinDivision } from '@/lib/join-content';
import { bindPinnedScroll } from '@/lib/pinned-scroll';
import ScrollStack, { ScrollStackItem } from '@/components/shared/ScrollStack';
import './DivisionVideoRail.css';
import { clsx } from 'clsx';

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

/**
 * Horizontal travel relative to page scrolling, and now EXACTLY 1:1.
 *
 * The section reserves `overflow x SCROLL_PACING` pixels of vertical scroll
 * and spends them moving the track `overflow` pixels sideways, so the pacing
 * is the reciprocal of the speed the reader feels: at 1.15 a hundred pixels
 * of gesture produced eighty-seven pixels of travel, and every one of those
 * missing thirteen pixels reads as the section holding on. At 1.0 the cards
 * move exactly as far as the page would have moved, which is the only ratio
 * that cannot feel either slow or hurried, because it is not a ratio at all.
 *
 * The values before this were 2.4, then 1.8, then 1.15. This is where that
 * sequence was always going.
 */
const SCROLL_PACING = 1;

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

/**
 * The phone breakpoint, matching the homepage deck's own (`MOBILE_MAX_WIDTH`
 * in ScrollStack). Below it this section is the deck; above it, the pinned
 * rail, unchanged.
 */
const NARROW_MAX_WIDTH = 767;
const isNarrow = () => typeof window !== 'undefined' && window.innerWidth <= NARROW_MAX_WIDTH;

/**
 * The cinemagraphs run at double speed, on every device and in both
 * compositions.
 *
 * WHY IT IS NOT SIMPLY `el.playbackRate = 2` NEXT TO `el.play()`. The media
 * element resets `playbackRate` to `defaultPlaybackRate` every time it runs
 * the resource selection algorithm, which is to say on mount, on any change
 * of source, and after some recoveries from a stalled network. Setting only
 * the current rate therefore holds until the first time the browser reloads
 * the clip, and then silently drops back to 1x - which is exactly the kind of
 * intermittent, device-dependent behaviour that is impossible to reproduce.
 *
 * `defaultPlaybackRate` is the value the element restores TO, so setting both
 * makes double speed the element's resting state rather than a property that
 * has to be re-applied. The listeners are belt and braces for the engines
 * that reset the rate on `loadeddata` regardless: they cost nothing, they are
 * removed with the effect, and they mean the rate cannot be lost by a pause,
 * a resume, or a card leaving and re-entering the deck.
 */
const VIDEO_RATE = 2;

function useDoubleSpeed(ref: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const apply = () => {
      el.defaultPlaybackRate = VIDEO_RATE;
      if (el.playbackRate !== VIDEO_RATE) el.playbackRate = VIDEO_RATE;
    };
    apply();
    el.addEventListener('loadedmetadata', apply);
    el.addEventListener('loadeddata', apply);
    el.addEventListener('play', apply);
    return () => {
      el.removeEventListener('loadedmetadata', apply);
      el.removeEventListener('loadeddata', apply);
      el.removeEventListener('play', apply);
    };
  }, [ref, enabled]);
}

const canPlayVideo = () => {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  return (
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData !== true
  );
};

/**
 * Memoised on its four primitive props.
 *
 * The track's transform no longer goes through React, but `activeIndex` still
 * does, four times across the section. Without this, each of those four
 * changes re-rendered all five cards and their <video> elements; with it, only
 * the two whose `active` actually flipped are touched.
 */
const DivisionCard = memo(function DivisionCard({
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

  useDoubleSpeed(videoRef, canPlay);

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
});

/**
 * The phone card: the homepage's composition, with /join's own content.
 *
 * WHY THE PHONE GETS A DIFFERENT COMPONENT AT ALL. The pinned rail below is
 * a good desktop interaction and a poor phone one: it converts vertical
 * scrolling into horizontal travel, which on a touch device means the reader
 * cannot pass the section without playing it through, and a sideways swipe
 * near its ends competes with the browser's own back gesture. The homepage
 * solved the same problem for the same five divisions with a sticky deck
 * driven by ORDINARY vertical scrolling: nothing is intercepted, nothing is
 * pinned in place, and the reader can simply keep going.
 *
 * So the phone adopts that interaction wholesale - the deck, the card
 * progression, the recede-and-cover animation, the dot rail, the reduced
 * motion fallback - and keeps everything that makes this section /join's:
 * the division's own wording and its own cinemagraph. The homepage's static
 * photographs and its homepage copy are not borrowed.
 */
const JoinStackCard = memo(function JoinStackCard({ division, active, canPlay }: {
  division: JoinDivision;
  active: boolean;
  canPlay: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useDoubleSpeed(videoRef, canPlay);

  // ONLY THE CARD IN FRONT PLAYS. Five cinemagraphs decoding at once on a
  // phone is the thing to avoid here; the card element itself is never
  // remounted by the deck, so pausing and resuming does not reload anything
  // and the frame on screen never blinks.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canPlay) return;
    if (active) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active, canPlay]);

  return (
    <article className="relative h-full w-full" aria-labelledby={`jds-title-${division.key}`}>
      <img
        src={division.poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {canPlay && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={division.video}
          poster={division.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {/* The homepage's phone scrim: top to bottom, heaviest where the
          words are. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(168deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.86) 32%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.34) 80%, rgba(0,0,0,0.2) 100%)',
        }}
      />
      <div className="relative z-10 flex h-full flex-col justify-start p-6 pr-10">
        <h3
          id={`jds-title-${division.key}`}
          className="font-serif text-2xl sm:text-3xl text-white mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        >
          {division.name}
        </h3>
        <p className="font-body text-body text-white/90 leading-relaxed max-w-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {division.description}
        </p>
      </div>
    </article>
  );
});

/** The phone composition: the homepage deck, carrying the /join cards. */
function DivisionDeck({ canPlay }: { canPlay: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <ScrollStack title="Our divisions" onActiveChange={setActive}>
      {JOIN_DIVISIONS.map((division, i) => (
        <ScrollStackItem key={division.key}>
          <JoinStackCard division={division} active={i === active} canPlay={canPlay} />
        </ScrollStackItem>
      ))}
    </ScrollStack>
  );
}

export function DivisionVideoRail() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  /** The sticky stage. Its own height is the exact vertical travel available. */
  const pinRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  /** The page container, measured so the rail can respect its content edges. */
  const boundsRef = useRef<HTMLDivElement | null>(null);

  const [pinDistance, setPinDistance] = useState(0);
  const [overflow, setOverflow] = useState(0);
  const [edgePad, setEdgePad] = useState(24);
  // Progress is NOT React state: it drives a transform on every frame of a
  // gesture, and a render per frame is exactly what made the section heavy.
  // The scroll bridge reads it synchronously for the same reason.
  const progressRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Resolved during the first render so the reserved height is correct from
  // the very first paint. Constrained devices and reduced motion keep the
  // static path: a plain horizontal scroller with no pinning and no video.
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [canPlay, setCanPlay] = useState(canPlayVideo);
  const [pinned, setPinned] = useState(canPin);
  // Resolved during the first render, like the others, so the section never
  // renders one composition and then swaps to the other.
  const [narrow, setNarrow] = useState(isNarrow);

  // Follow later changes to the motion preference, and to the width.
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(motion.matches);
      setPinned(canPin());
      setCanPlay(canPlayVideo());
    };
    const onResize = () => setNarrow(isNarrow());
    motion.addEventListener('change', apply);
    window.addEventListener('resize', onResize);
    return () => {
      motion.removeEventListener('change', apply);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const measure = useCallback(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    const bounds = boundsRef.current;
    if (!rail || !track) return;

    // The track is full-bleed, so its inner padding has to reproduce the page
    // container's gutter. Measuring the real container keeps the first card on
    // the left content boundary at every breakpoint, including the stepped
    // max-widths Tailwind's container uses.
    if (bounds) {
      // The container is full-width with an inner gutter, so the content edge
      // is its box left plus its own padding, not the box left alone.
      const pad = Math.round(
        bounds.getBoundingClientRect().left +
          parseFloat(getComputedStyle(bounds).paddingLeft || '0'),
      );
      if (pad >= 0) setEdgePad(pad);
    }

    const extra = Math.max(0, track.scrollWidth - rail.clientWidth);
    setOverflow(extra);
    setPinDistance(Math.round(extra * SCROLL_PACING));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (railRef.current) ro.observe(railRef.current);
    if (boundsRef.current) ro.observe(boundsRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Drive horizontal travel from the pinned wrapper's scroll progress.
  //
  // THE TRANSFORM IS WRITTEN STRAIGHT TO THE NODE, NOT THROUGH REACT.
  // This is the whole of the heaviness. `progress` used to be React state,
  // set on every scroll frame and read back in the JSX to build the track's
  // inline transform. So each frame of the gesture scheduled a render of the
  // section, reconciled five cards with their posters and video elements, and
  // only then committed the transform: the cards were always a render behind
  // the gesture, and under any load at all they were several. That lag is
  // what reads as resistance, as weight, and as the cards moving more slowly
  // than the scroll suggests, quite apart from the pacing ratio.
  //
  // Written directly, the transform lands in the same frame the scroll event
  // arrived in, which is what makes the movement feel attached to the hand.
  // React is left with the one thing that genuinely changes rarely - which
  // card is active, four times across the whole section - and is told even
  // that only when the answer differs.
  useEffect(() => {
    if (narrow || !pinned || overflow <= 0) {
      progressRef.current = 0;
      const track = trackRef.current;
      if (track) track.style.transform = '';
      return;
    }
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    let lastIndex = -1;
    const paint = (p: number) => {
      const track = trackRef.current;
      if (track) track.style.transform = `translate3d(${-(p * overflow).toFixed(2)}px,0,0)`;
      const index = Math.min(
        JOIN_DIVISIONS.length - 1,
        Math.round(p * (JOIN_DIVISIONS.length - 1)),
      );
      if (index !== lastIndex) {
        lastIndex = index;
        setActiveIndex(index);
      }
    };

    const update = () => {
      frame = 0;
      // Travel is expressed purely as a transform; any residual scrollLeft on
      // the rail would offset the track and break the boundary alignment.
      const rail = railRef.current;
      if (rail && rail.scrollLeft !== 0) rail.scrollLeft = 0;
      const rect = section.getBoundingClientRect();
      // THE TRAVEL IS MEASURED, NOT ASSUMED. The pinned stage is `100svh` and
      // `window.innerHeight` is the LARGE viewport, so on a phone with a
      // retractable URL bar the two differ by the height of that bar. Taking
      // the difference against `window.innerHeight` therefore mapped the
      // gesture onto a distance the section does not actually have, and the
      // last card never quite arrived. The stage's own height is exact at
      // every viewport and on every engine.
      const stage = pinRef.current?.offsetHeight ?? window.innerHeight;
      const total = section.offsetHeight - stage;
      if (total <= 0) {
        progressRef.current = 0;
        paint(0);
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / total));
      progressRef.current = p;
      paint(p);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // A sideways gesture over the pinned rail advances it as well: once the
    // cards are visibly travelling horizontally, that is what a reader
    // reaches for, and it used to do nothing at all.
    const unbind = bindPinnedScroll(section, {
      progress: () => progressRef.current,
      enabled: () => true,
      // A sideways gesture is scaled by the pacing so the cards travel exactly
      // as far as the gesture did. Without this the reading pace intended for
      // vertical scrolling was also applied sideways, and the section felt as
      // though it were pushing back.
      pacing: () => SCROLL_PACING,
    });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      unbind();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned, overflow, narrow]);

  // Static path: track the nearest card from native horizontal scrolling so the
  // dot indicator and video playback still follow the reader.
  useEffect(() => {
    if (pinned || narrow) return;
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
  }, [pinned, narrow]);

  // Keyboard: the rail is focusable and the arrow keys step one card at a
  // time, in whichever mode the section is running.
  const step = (direction: 1 | -1) => {
    const count = JOIN_DIVISIONS.length;
    if (pinned && sectionRef.current && overflow > 0) {
      const perCard = (overflow * SCROLL_PACING) / (count - 1);
      window.scrollBy({ top: direction * perCard, behavior: 'smooth' });
    } else if (railRef.current) {
      const perCard = railRef.current.scrollWidth / count;
      railRef.current.scrollBy({ left: direction * perCard, behavior: 'smooth' });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  // THE PHONE TAKES THE HOMEPAGE'S DECK, and takes it early: this returns
  // before any of the pinned rail's geometry, listeners or reserved height
  // exist, so none of that machinery runs on a phone at all. The deck brings
  // its own heading, its own dot rail and its own reduced-motion fallback.
  //
  // The desktop path below is untouched.
  //
  // No `aria-labelledby` on the section below: the deck renders its own
  // heading and nothing there carries the id the pinned rail uses.
  if (narrow) {
    return (
      <section aria-label="Our divisions" className="bg-background">
        <DivisionDeck canPlay={canPlay} />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="join-divisions-heading"
      className="bg-background"
      style={pinned && overflow > 0 ? { height: `calc(100svh + ${pinDistance}px)` } : undefined}
    >
      <div ref={pinRef} className={pinned && overflow > 0 ? 'jd-pin' : ''}>
        <div className="container" ref={boundsRef}>
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
          tabIndex={0}
          role="group"
          aria-label="Divisions, use the left and right arrow keys to move through them"
          onKeyDown={onKeyDown}
        >
          <div
            ref={trackRef}
            className="jd-track"
            style={{
              // Gutters equal to the page container, so the sequence opens on
              // the left content boundary and closes on the right one.
              paddingLeft: edgePad,
              paddingRight: edgePad,
            }}
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

        <div className="mdots mt-6" aria-hidden="true">
          {JOIN_DIVISIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (pinned && sectionRef.current) {
                  const maxScroll = sectionRef.current.offsetHeight - window.innerHeight;
                  const targetProgress = i / (JOIN_DIVISIONS.length - 1);
                  window.scrollTo({ top: sectionRef.current.offsetTop + maxScroll * targetProgress, behavior: 'smooth' });
                } else if (railRef.current) {
                  const max = railRef.current.scrollWidth - railRef.current.clientWidth;
                  railRef.current.scrollTo({ left: max * (i / (JOIN_DIVISIONS.length - 1)), behavior: 'smooth' });
                }
              }}
              className={clsx('mdot', i === activeIndex && 'is-on')}
              aria-label={`Go to division ${i + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

export default DivisionVideoRail;
