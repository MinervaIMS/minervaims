import { useEffect, useState } from 'react';

// =====================================================================
// The Dashboard's three motion facts, in one place.
// ---------------------------------------------------------------------
// Kept out of the component files so a fast refresh of a component never
// reloads a hook, and so every block asks the same question the same way.
// =====================================================================

/** True when the reader has asked the system for reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const mq = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/** False while the tab is in the background, so ambient loops can stop. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const apply = () => setVisible(!document.hidden);
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, []);
  return visible;
}

/**
 * A media query, ANSWERED ON THE FIRST RENDER.
 *
 * `useIsDesktop` starts as `undefined` and settles in an effect, so a
 * component reading it renders once as "narrow" and again as "wide" one
 * frame later. For an ornament that is one long CSS animation, that
 * second render REPLACES the element and restarts the animation from its
 * first frame: the report columns jump back to the top, the swarm snaps
 * into a different shape. Reading the query synchronously in the state
 * initialiser means the answer is right the first time and every ornament
 * is built exactly once.
 */
export function useMediaMatch(query: string): boolean {
  const [matches, setMatches] = useState(() => (
    typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(query).matches : false
  ));
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const mq = globalThis.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);
  return matches;
}

/** True once, `delay` ms after mount. Drives the one entry animation. */
export function useEntered(delay = 0): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return entered;
}

/**
 * Sign colours for performance. The design system defines no positive or
 * negative token, so these are the exact pair the public fund charts
 * already use, which keeps a return the same colour on the website and in
 * the workspace.
 */
export const POSITIVE = 'hsl(142 52% 34%)';
export const NEGATIVE = 'hsl(0 62% 46%)';
