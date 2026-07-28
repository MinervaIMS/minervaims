import { useEffect, useRef, useState } from 'react';

// =====================================================================
// Motion primitives for /join.
//
// Every animated element on this page has a static path. `useStillMode`
// is the single switch: it is true under prefers-reduced-motion, on a
// constrained device, or when the reader has asked the browser to save
// data. Components read it and render the still equivalent rather than
// gating an effect that has already started.
// =====================================================================

const STILL_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the page should render its static equivalents. */
export function useStillMode(): boolean {
  const [still, setStill] = useState<boolean>(() => detectStill());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(STILL_QUERY);
    const update = () => setStill(detectStill());
    update();
    // Safari < 14 only supports the deprecated listener API.
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    window.addEventListener('resize', update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return still;
}

function detectStill(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.(STILL_QUERY).matches) return true;
  // Save-Data and low-memory devices: keep the page to its static form.
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
  return false;
}

/** True once the browser is idle enough to mount decorative work. */
export function useDeferredMount(delay = 200): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true));
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return ready;
}

/**
 * Adds `is-in` to every `.join-reveal` inside the container as it scrolls
 * into view. One observer for the whole page rather than one per element.
 * Under still mode everything is revealed immediately.
 */
export function useRevealOnScroll(still: boolean) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.join-reveal'));
    if (still || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const step = Number(el.dataset.revealDelay ?? 0);
          if (step > 0) window.setTimeout(() => el.classList.add('is-in'), step);
          else el.classList.add('is-in');
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    nodes.forEach((n) => io.observe(n));

    // Content that arrives after the first paint (FAQ rows, figures) still
    // needs observing, so watch the subtree for new reveal targets.
    const mo = new MutationObserver(() => {
      root.querySelectorAll<HTMLElement>('.join-reveal:not(.is-in)').forEach((n) => io.observe(n));
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [still]);

  return ref;
}

/**
 * Smooth scrolling for this page only. lenis is already a dependency and
 * is what the scroll choreography is tuned against; it is never started
 * under still mode, and it is fully torn down on unmount so the rest of
 * the site keeps native scrolling.
 */
export function useLenisScroll(still: boolean) {
  useEffect(() => {
    if (still) return;
    let raf = 0;
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;

    import('lenis')
      .then(({ default: Lenis }) => {
        if (destroyed) return;
        instance = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.4 });
        const tick = (time: number) => {
          instance?.raf(time);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        /* Smooth scrolling is an enhancement: native scroll is the fallback. */
      });

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      instance?.destroy?.();
    };
  }, [still]);
}

/**
 * Scroll progress of an element through the viewport, 0 to 1. Used by the
 * admissions rail and the hero recede. rAF-throttled, passive listeners.
 */
export function useScrollProgress(still: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      setProgress(1);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the top edge reaches 85% of the viewport, 1 once the block
      // has travelled its own height past that point.
      const travelled = vh * 0.85 - rect.top;
      const span = Math.max(rect.height * 0.82, 1);
      setProgress(Math.max(0, Math.min(1, travelled / span)));
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

  return { ref, progress };
}
