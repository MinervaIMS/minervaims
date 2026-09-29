import { useEffect, useState } from 'react';

// Small hooks the two calendars share.

/** A media query, answered on the first render (like useIsDesktop). */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState<boolean>(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    mql.addEventListener('change', on);
    on();
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * A per-viewer preference kept in this browser, falling back quietly.
 *
 * The two calendars keep their view (Month, Agenda, Board, List) under the
 * keys that already held their zoom, `mims.zoom.workspace` and
 * `mims.zoom.editorial`, which the Cookie Policy lists as remembering how
 * a calendar is shown. A value left over from the old zoom is not one of
 * the views, so it is ignored and the default applies.
 */
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = window.localStorage.getItem(key) as T | null;
      if (v && allowed.includes(v)) return v;
    } catch { /* storage unavailable: the default stands */ }
    return fallback;
  });
  const set = (v: T) => {
    setValue(v);
    try { window.localStorage.setItem(key, v); } catch { /* not remembered */ }
  };
  return [value, set];
}
