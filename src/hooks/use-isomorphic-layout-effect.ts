import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in the browser, `useEffect` where there is no document:
 * the build draws the homepage's first screen in Node (vite.prerender.ts,
 * Step 102), where a layout effect cannot run and React warns about one.
 * In the browser it is exactly `useLayoutEffect`.
 */
export const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;
