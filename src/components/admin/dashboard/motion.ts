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
