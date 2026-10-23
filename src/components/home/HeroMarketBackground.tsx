import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { perfMode } from '@/lib/perf';
import { loadMarketScene } from './market-scene/load';
import type { Obstacle } from './market-scene/engine';

// =====================================================================
// HeroMarketBackground: the moving ground behind the homepage logo.
// ---------------------------------------------------------------------
// It replaces the photograph that used to sit here, and it was built
// around one requirement before any other: IT MUST NOT MAKE THE HOMEPAGE
// SLOWER TO APPEAR. It makes it faster, as it happens, because the
// photograph was a 2.1 MB download the hero waited for, and this is a
// 15 KB script (gzipped) it does not wait for at all.
//
// Three layers, of which only the middle one is ever missing:
//
//   1. THE GROUND, in CSS. The Minerva night, taken a step darker than
//      the other dark pages so the scene's lavender carries against it:
//      near-black rising to a deep indigo, a restrained purple bloom where
//      the logo stands and a faint dot lattice. It is painted with the
//      hero's first frame, needs nothing fetched and cannot fail, so the
//      opening is composed from the very first paint whatever happens
//      next.
//
//   2. THE SCENE, on a canvas: the research desk seen through a shallow
//      depth of field (see market-scene/engine.ts). Its script is fetched
//      while the page loads its data, mounted only once the hero has
//      painted and the browser is idle, built while still invisible, and
//      faded in once its first frame is actually drawn - not on mount, so
//      a scene that never draws never replaces the ground with an empty
//      box.
//
//   3. THE SHADE, in CSS again, over the canvas: the scene recedes behind
//      the logo, at the edges and under the header, so the logo and the
//      applications button stay the brightest things in the frame. Static
//      gradients, so it costs one paint, not a paint per frame.
//
// THE SCENE LAYS ITSELF OUT AROUND THE PAGE. The logo and the button are
// marked `data-hero-keepout` in Index.tsx; the scene measures them, and
// the header, and keeps its legible pieces in the space between. That is
// what lets one composition work on a phone and on a 27-inch monitor,
// with and without the applications button (which can appear after the
// hero has painted, and moves the logo up when it does).
//
// WHO GETS WHAT. Everyone gets layers 1 and 3. A capable browser gets the
// scene in motion. A reader who has asked for reduced motion, and the
// in-app and low-end browsers the site already treats as "lite" (see
// lib/perf.ts), get ONE composed frame of it: the same picture, standing
// still, drawn once and never again. Nobody gets a blank rectangle.
// =====================================================================

const MarketScene = lazy(loadMarketScene);

const GROUND = [
  'radial-gradient(ellipse 56% 54% at 50% 42%, rgba(62, 42, 138, 0.2) 0%, rgba(26, 13, 64, 0.08) 48%, rgba(3, 2, 9, 0) 78%)',
  'radial-gradient(ellipse 70% 45% at 28% 88%, rgba(110, 80, 180, 0.06) 0%, rgba(3, 2, 9, 0) 72%)',
  'linear-gradient(180deg, #07051A 0%, #050312 55%, #030209 100%)',
].join(',');

const LATTICE = 'radial-gradient(circle at center, rgba(160, 145, 214, 0.17) 0.7px, rgba(160, 145, 214, 0) 0.85px)';
const LATTICE_MASK = 'radial-gradient(ellipse 80% 75% at 50% 45%, #000 35%, transparent 100%)';

const SHADE = [
  // The calm around the logo, in the ground's own colour: the scene is
  // quieter there, not covered. Centred on the logo itself, and sized to
  // it, because the logo moves: it rises when the applications button
  // appears beneath it, and it is a different size at each breakpoint.
  'radial-gradient(ellipse var(--calm-rx) var(--calm-ry) at var(--calm-x) var(--calm-y), rgba(5, 3, 16, 0.66) 0%, rgba(5, 3, 16, 0.4) 55%, rgba(5, 3, 16, 0) 100%)',
  // The edges fall away, as they do through a lens.
  'radial-gradient(ellipse 115% 100% at 50% 45%, rgba(3, 2, 9, 0) 58%, rgba(3, 2, 9, 0.62) 100%)',
  // Under the header, and a touch at the foot, above the white band.
  'linear-gradient(180deg, rgba(3, 2, 9, 0.5) 0%, rgba(3, 2, 9, 0) 15%, rgba(3, 2, 9, 0) 90%, rgba(3, 2, 9, 0.45) 100%)',
].join(',');

/** Where the calm sits before the logo has been measured. */
const CALM_DEFAULT = {
  '--calm-x': '50%',
  '--calm-y': '45%',
  '--calm-rx': 'clamp(140px, 22vw, 330px)',
  '--calm-ry': 'clamp(130px, 18vw, 250px)',
} as CSSProperties;

/**
 * The header, the logo and the applications button, relative to the
 * background's own box. The logo and the button carry
 * `data-hero-keepout` in the page; the header is the site's fixed one,
 * counted by its height because it is fixed to the top of the viewport
 * and the hero starts at the top of the page.
 */
function measureHero(root: HTMLElement): Obstacle[] {
  const base = root.getBoundingClientRect();
  const out: Obstacle[] = [];
  const header = document.querySelector('header');
  if (header) out.push({ kind: 'header', top: 0, bottom: header.getBoundingClientRect().height, left: 0, right: base.width });
  root.parentElement?.querySelectorAll<HTMLElement>('[data-hero-keepout]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    out.push({
      kind: el.dataset.heroKeepout || 'block',
      top: r.top - base.top,
      bottom: r.bottom - base.top,
      left: r.left - base.left,
      right: r.right - base.left,
    });
  });
  return out;
}

/** The box holding the logo and the button: it resizes when they move. */
function heroContent(root: HTMLElement): Element[] {
  const logo = root.parentElement?.querySelector('[data-hero-keepout="logo"]');
  return logo?.parentElement ? [logo.parentElement] : [];
}

type Mode = 'motion' | 'still';

export function HeroMarketBackground() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shadeRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const decide = () => setMode(mq.matches || perfMode() === 'lite' ? 'still' : 'motion');
    // Two frames, then the first idle moment. The frames let the hero
    // commit and be painted, so the page's first paint - the logo, which
    // is what LCP measures here - never includes any of the scene's work.
    // The idle wait keeps the scene's one-off build out of the way of the
    // page's own work right after load (its figures counting up, the
    // sections below mounting): on a fast device idle arrives within a
    // frame or two, on a slow one it is capped at 1.2s. Safari has no
    // idle callback, and gets a short timeout instead.
    const idle = (window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    });
    let second = 0;
    let waiting = 0;
    let timer = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (idle.requestIdleCallback) waiting = idle.requestIdleCallback(decide, { timeout: 1200 });
        else timer = window.setTimeout(decide, 250);
      });
    });
    // Changing the preference mid-visit swaps the scene for its other
    // form. The new one fades in when it has drawn, like the first did.
    const onChange = () => {
      setPainted(false);
      decide();
    };
    mq.addEventListener('change', onChange);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      if (waiting) idle.cancelIdleCallback?.(waiting);
      window.clearTimeout(timer);
      mq.removeEventListener('change', onChange);
    };
  }, []);

  // The calm follows the logo. Measured on mount and whenever the hero or
  // its content changes size, which is when the logo can have moved; it
  // is a CSS variable on a static layer, so following it costs one paint.
  useEffect(() => {
    const root = rootRef.current;
    const shade = shadeRef.current;
    if (!root || !shade) return;
    const place = () => {
      const logo = measureHero(root).find((o) => o.kind === 'logo');
      if (!logo) return;
      const w = logo.right - logo.left;
      const h = logo.bottom - logo.top;
      shade.style.setProperty('--calm-x', `${Math.round((logo.left + logo.right) / 2)}px`);
      shade.style.setProperty('--calm-y', `${Math.round((logo.top + logo.bottom) / 2)}px`);
      shade.style.setProperty('--calm-rx', `${Math.round(w * 0.78)}px`);
      shade.style.setProperty('--calm-ry', `${Math.round(h * 0.72)}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(root);
    heroContent(root).forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  const onPainted = useCallback(() => setPainted(true), []);
  const obstacles = useCallback(() => (rootRef.current ? measureHero(rootRef.current) : []), []);
  const watch = useCallback(() => (rootRef.current ? heroContent(rootRef.current) : []), []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ backgroundColor: '#030209' }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: GROUND }} />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: LATTICE, backgroundSize: '22px 22px', maskImage: LATTICE_MASK, WebkitMaskImage: LATTICE_MASK }}
      />
      {mode && (
        <Suspense fallback={null}>
          <div
            className={`absolute inset-0 transition-opacity ease-out ${mode === 'motion' ? 'duration-[1400ms]' : 'duration-500'}`}
            style={{ opacity: painted ? 1 : 0 }}
          >
            <MarketScene key={mode} animate={mode === 'motion'} onPainted={onPainted} obstacles={obstacles} watch={watch} />
          </div>
        </Suspense>
      )}
      <div ref={shadeRef} className="absolute inset-0" style={{ ...CALM_DEFAULT, backgroundImage: SHADE }} />
    </div>
  );
}

export default HeroMarketBackground;
