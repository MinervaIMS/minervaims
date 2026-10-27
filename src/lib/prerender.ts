// =====================================================================
// THE HOMEPAGE'S FIRST SCREEN, DRAWN FROM THE HTML (Step 102).
// ---------------------------------------------------------------------
// The site is a React application: until its scripts had arrived and run,
// a visitor to the homepage saw nothing of it (on a phone, the purple
// loading screen). The build now draws the first screen itself, the header
// and the hero exactly as the app draws them (components/home/HomeHero),
// and writes it into the homepage's HTML (vite.prerender.ts):
//
//   * it is kept in a <template>, which a browser does not draw, and a few
//     lines in the page copy it into place only when the address is the
//     homepage, so no other address ever shows or carries it as content;
//   * the hero figures start their count there, and the app carries the
//     same count on (HeroFigure's `countFrom`);
//   * on a phone's first visit the intro plays over it from the first
//     frame, the same animation the app plays (components/shared/Preloader),
//     and the app does not play it a second time;
//   * the app's scripts are fetched once the browser has painted that
//     screen, then React draws the same screen over it and the rest of the
//     page beneath it.
//
// This file holds what the app needs to know about it. The names it shares
// with the build, which writes them into the page, are in prerender-names.ts.
// =====================================================================

import {
  APPLICATION_ROW_ELEMENT_ID, COUNT_START_GLOBAL, PRERENDER_ATTRIBUTE, STATIC_INTRO_ATTRIBUTE,
} from './prerender-names';

export {
  PRERENDER_TEMPLATE_ID, PRERENDER_ATTRIBUTE, STATIC_INTRO_ATTRIBUTE, COUNT_START_GLOBAL,
  APPLICATION_ROW_ELEMENT_ID, HOME_HERO_FIGURES, HERO_FIGURE_FIELDS,
} from './prerender-names';

type Win = typeof window & { [COUNT_START_GLOBAL]?: number };

let taken = false;

/**
 * Whether this mount of the homepage is the one that replaces the first
 * screen drawn from the HTML; true at most once per visit, so a homepage
 * reached later by navigation behaves exactly as it always has. When true,
 * `countFrom` reads when the figures start counting (a frame time): it can
 * be in the future, or Infinity while the phone intro has not yet started
 * and its moment is not known; null where nothing counts (reduced motion).
 */
export function takePrerenderedHome(): { countFrom: (() => number) | null } | null {
  if (taken || typeof document === 'undefined') return null;
  taken = true;
  if (document.documentElement.getAttribute(PRERENDER_ATTRIBUTE) !== 'home') return null;
  const read = () => (window as Win)[COUNT_START_GLOBAL];
  return { countFrom: typeof read() === 'number' ? () => read() ?? Infinity : null };
}

/** Whether the page itself is playing (or has played) the phone intro. */
export function staticIntroInDocument(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.getAttribute(STATIC_INTRO_ATTRIBUTE) === 'static';
}

/** The application settings row, as the build read it (or null). */
export function readBuildApplicationRow<T>(): T | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(APPLICATION_ROW_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    const row = JSON.parse(el.textContent) as unknown;
    return row && typeof row === 'object' ? (row as T) : null;
  } catch {
    return null;
  }
}
