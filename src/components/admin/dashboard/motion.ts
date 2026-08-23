import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
 * THE STAGE A CHART ENTERS ON.
 *
 * Two problems are solved here, and they are the reason the Dashboard's
 * chart animations were switched off rather than tuned:
 *
 *  * A CHART MUST NOT ANIMATE FROM A BOX IT IS ABOUT TO LOSE.
 *    `ResponsiveContainer` measures its parent on mount. Mounted in the
 *    same frame as the page, it can measure zero, draw once at the wrong
 *    size and then resize when the flex row settles: the chart visibly
 *    snaps, and an animation started in that first frame plays out of the
 *    wrong geometry. `ready` turns true in a LAYOUT effect, before the
 *    browser paints, and only once the box actually has a size, so the
 *    chart is mounted into a settled cell and its first measurement is
 *    also its final one. Nothing is painted twice and nothing is delayed
 *    by a frame the reader could see.
 *
 *  * AN ENTRY ANIMATION HAPPENS ONCE, NOT ON EVERY RENDER.
 *    Recharts re-animates whenever it re-renders with new data, so
 *    hiding a fund, a window resize or any unrelated state change used to
 *    replay the whole introduction. `entering` is true from the chart's
 *    first render, and is switched off for good once the sequence has had
 *    time to finish, so every later render draws the final state directly.
 *
 * `hold` is the whole span the chart's own animation occupies, measured
 * from mount: the card's stagger, the pause before the series starts, and
 * the draw itself.
 */
export function useChartEntry(animate: boolean, hold: number): {
  ref: React.RefObject<HTMLDivElement>;
  ready: boolean;
  entering: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  /** Latched, so a remeasure or a prop change can never rearm the entry. */
  const played = useRef(false);

  // NO DEPENDENCY LIST, DELIBERATELY. The element this measures may not
  // exist on the first render: a block that has no data yet renders a
  // message or a skeleton instead, and mounts its chart cell only when
  // the data arrives. An effect keyed on anything else would have run
  // once, found no element, and never looked again, leaving that chart
  // permanently unmounted. Once `ready` is true this returns immediately,
  // so the cost is one measurement per render until the cell exists.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || ready) return;
    // A cell narrower or shorter than this is not a laid-out chart cell.
    const settled = () => {
      const r = el.getBoundingClientRect();
      return r.width > 16 && r.height > 16;
    };
    const arm = () => {
      setReady(true);
      if (animate && !played.current) {
        played.current = true;
        setEntering(true);
      }
    };
    if (settled()) { arm(); return; }
    // The cell is not laid out yet (a hidden ancestor, a font still
    // settling). Watch it rather than guessing at a delay.
    if (typeof ResizeObserver !== 'function') { arm(); return; }
    const ro = new ResizeObserver(() => { if (settled()) { ro.disconnect(); arm(); } });
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), hold);
    return () => window.clearTimeout(id);
  }, [entering, hold]);

  return { ref, ready, entering };
}

/**
 * Sign colours for performance. The design system defines no positive or
 * negative token, so these are the exact pair the public fund charts
 * already use, which keeps a return the same colour on the website and in
 * the workspace.
 */
export const POSITIVE = 'hsl(142 52% 34%)';
export const NEGATIVE = 'hsl(0 62% 46%)';
