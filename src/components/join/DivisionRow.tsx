import { useEffect, useRef, useState } from 'react';
import type { DivisionBlurb } from './content';
import { ROW_MEDIA_HEIGHT, ROW_MEDIA_WIDTH, divisionMedia } from './media';

// =====================================================================
// One division row: its own world, barely breathing.
//
// The poster paints first and is the only thing the LCP can ever land on.
// The loop mounts lazily, plays only while its row is substantially in
// view, and is never fetched at all under still mode, on a narrow screen,
// or for a division that has no clean loop.
//
// The dark shade sits above the media so the blurb always meets contrast.
// =====================================================================

interface Props {
  division: DivisionBlurb;
  still: boolean;
  index: number;
}

const MOBILE_BREAKPOINT = 768;

export function DivisionRow({ division, still, index }: Props) {
  const media = divisionMedia[division.key];
  const rowRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mountVideo, setMountVideo] = useState(false);
  const [inView, setInView] = useState(false);
  const [parallax, setParallax] = useState(0);

  const black = division.tone === 'black';
  const wantsVideo =
    !still && media.loop !== null && typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT;

  // Mount and play only while the row is substantially on screen, so at
  // most one or two loops are ever decoding at once.
  useEffect(() => {
    const el = rowRef.current;
    if (!el || !wantsVideo || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView(entry.isIntersecting);
          if (entry.isIntersecting) setMountVideo(true);
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wantsVideo]);

  // Playback is driven from an effect rather than from the observer
  // callback: on the first intersection the element has only just been
  // asked to mount, so the ref is still empty at that point.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      video.play().catch(() => {
        /* Autoplay refused: the poster stays, which is a valid state. */
      });
    } else {
      video.pause();
    }
  }, [inView, mountVideo]);

  // Scroll-driven parallax on the backdrop. Cheap: a single transform,
  // rAF-throttled, and disabled entirely under still mode.
  useEffect(() => {
    if (still) return;
    const el = rowRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const centre = rect.top + rect.height / 2;
      setParallax(((centre - vh / 2) / vh) * -26);
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
      ref={rowRef}
      aria-labelledby={`division-${division.key}`}
      className="relative overflow-hidden"
      style={{ backgroundColor: black ? 'var(--join-bg-black)' : 'var(--join-bg)' }}
    >
      {/* Reserved box: the media never changes the row's height, so this
          page contributes no layout shift. */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          transform: `translate3d(0, ${parallax}px, 0) scale(${black ? 1.1 : 1.06})`,
          willChange: still ? undefined : 'transform',
        }}
      >
        <picture>
          <source srcSet={media.posterAvif} type="image/avif" />
          <img
            src={media.posterWebp}
            alt=""
            width={ROW_MEDIA_WIDTH}
            height={ROW_MEDIA_HEIGHT}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>

        {mountVideo && media.loop && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            width={ROW_MEDIA_WIDTH}
            height={ROW_MEDIA_HEIGHT}
            poster={media.posterWebp}
            preload="none"
            muted
            loop
            playsInline
            aria-hidden
            tabIndex={-1}
          >
            <source src={media.loop} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Load-bearing for contrast: every blurb sits on the shade, never
          on the raw image. */}
      <div className={`absolute inset-0 ${black ? 'join-shade-black' : 'join-shade'}`} aria-hidden />

      <div className="relative container py-24 md:py-32 lg:py-40">
        <div className="join-reveal max-w-2xl" data-reveal-delay={0}>
          <span className="join-label">{String(index + 1).padStart(2, '0')}</span>
          <h3
            id={`division-${division.key}`}
            className="font-serif text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight mt-3"
            style={{ color: 'var(--join-ink)' }}
          >
            {division.name}
          </h3>
          <p className="font-body text-body-lg leading-relaxed mt-5" style={{ color: 'var(--join-body)' }}>
            {division.blurb}
          </p>
        </div>
      </div>

      {/* The backdrop is decorative, but its subject is meaningful, so it
          is described for readers who cannot see it. */}
      <span className="sr-only">{division.imageAlt}</span>
    </section>
  );
}

export default DivisionRow;
