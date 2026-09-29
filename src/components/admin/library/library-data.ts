// =====================================================================
// The file libraries' data: the items, their thumbnails, and the few
// choices a reader makes that should outlive a click elsewhere.
// ---------------------------------------------------------------------
// HOOKS ONLY, no components, so the component files stay refreshable.
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { listResources, signResourceFiles, type ResourceRow } from '@/lib/resources-api';
import { coverImage, objectPathOf, type LibraryFilter, type LibrarySort } from '@/lib/library-files';

// ---------------------------------------------------------------------
// Items, drawn at once on a return visit
// ---------------------------------------------------------------------

/**
 * What each library held when it was last read, for this tab of the
 * browser only. Coming back to a library draws this at once and then
 * refreshes it, so the page never flashes empty between two visits a few
 * seconds apart. Nothing is written to the browser's storage.
 */
const cacheStore = new Map<string, ResourceRow[]>();
const cacheListeners = new Set<() => void>();
const itemCache = {
  get: (k: string) => cacheStore.get(k),
  has: (k: string) => cacheStore.has(k),
  set: (k: string, v: ResourceRow[]) => { cacheStore.set(k, v); cacheListeners.forEach((l) => l()); },
};

export function useLibraryItems(category: string, onError: (e: unknown) => void) {
  // The rows are held with the library they belong to, so a change of
  // library can never file one library's rows under the other's name.
  const [state, setState] = useState<{ category: string; rows: ResourceRow[] }>(() => ({ category, rows: itemCache.get(category) ?? [] }));
  const [loading, setLoading] = useState(!itemCache.has(category));
  const errRef = useRef(onError);
  useEffect(() => { errRef.current = onError; }, [onError]);
  const seq = useRef(0);

  const setItems = useCallback((next: ResourceRow[] | ((prev: ResourceRow[]) => ResourceRow[])) => {
    setState((prev) => ({ category: prev.category, rows: typeof next === 'function' ? (next as (p: ResourceRow[]) => ResourceRow[])(prev.rows) : next }));
  }, []);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const rows = await listResources(category);
      if (mine !== seq.current) return;
      setState({ category, rows });
    } catch (e) {
      if (mine === seq.current) errRef.current(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    const again = itemCache.get(category);
    setState({ category, rows: again ?? [] });
    setLoading(!again);
    reload();
  }, [category, reload]);

  // The cache follows what is on screen, after the render that shows it.
  useEffect(() => {
    if (!loading || state.rows.length) itemCache.set(state.category, state.rows);
  }, [state, loading]);

  const items = state.category === category ? state.rows : (itemCache.get(category) ?? []);
  return { items, setItems, loading, reload };
}

/** Warm a library before it is opened (the tabs of Brand & Social). */
export function prefetchLibrary(category: string): Promise<void> {
  if (itemCache.has(category)) return Promise.resolve();
  return listResources(category)
    .then((rows) => { if (!itemCache.has(category)) itemCache.set(category, rows); })
    .catch(() => undefined);
}

/** How many items a library holds, as last read; null until it has been. */
export function useCachedCount(category: string): number | null {
  return useSyncExternalStore(
    (cb) => { cacheListeners.add(cb); return () => { cacheListeners.delete(cb); }; },
    () => itemCache.get(category)?.length ?? null,
  );
}

// ---------------------------------------------------------------------
// Thumbnails: one request for every picture on screen
// ---------------------------------------------------------------------

/** Signed addresses last for an hour; they are renewed after 50 minutes. */
const THUMB_TTL = 50 * 60 * 1000;
const thumbCache = new Map<string, { url: string; at: number }>();

/**
 * Signed addresses for the cover picture of each item given, keyed by the
 * stored path. Only pictures are asked for, only the ones not already
 * known, and all of them in one request. A library that cannot sign them
 * simply shows each file's type instead.
 */
export function useThumbnails(items: ResourceRow[]): Record<string, string> {
  const paths = useMemo(() => {
    const out: string[] = [];
    for (const it of items) {
      for (const s of it.sources) {
        if (s.kind !== 'file') continue;
        const cover = coverImage({ sources: [s] });
        if (cover) out.push(cover.value);
      }
    }
    return out;
  }, [items]);
  const key = paths.join('|');
  const [, bump] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const missing = paths.filter((p) => {
      const hit = thumbCache.get(p);
      return !hit || now - hit.at > THUMB_TTL;
    });
    if (missing.length === 0) return;
    let live = true;
    const byObject = new Map(missing.map((p) => [objectPathOf(p), p]));
    signResourceFiles(Array.from(byObject.keys())).then((signed) => {
      const at = Date.now();
      for (const [obj, url] of Object.entries(signed)) {
        const original = byObject.get(obj);
        if (original) thumbCache.set(original, { url, at });
      }
      if (live) bump((n) => n + 1);
    });
    return () => { live = false; };
    // `key` stands for `paths`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const out: Record<string, string> = {};
  for (const p of paths) {
    const hit = thumbCache.get(p);
    if (hit) out[p] = hit.url;
  }
  return out;
}

// ---------------------------------------------------------------------
// The reader's choices, kept while the workspace is open
// ---------------------------------------------------------------------

export type LibraryView = 'grid' | 'list';

export interface LibraryChoices {
  view: LibraryView;
  sort: LibrarySort;
  filter: LibraryFilter | 'all';
  query: string;
}

/**
 * The view, the sort, the type and the search a reader chose in each
 * library, kept for as long as the workspace stays open: opening an item,
 * another page or another tab and coming back finds the library exactly
 * as it was left. Held in memory, not in the browser's storage, so a new
 * visit starts from each library's own default.
 */
const choiceMemory = new Map<string, LibraryChoices>();

export function useLibraryChoices(category: string, defaults: LibraryChoices) {
  const [choices, setChoices] = useState<LibraryChoices>(() => choiceMemory.get(category) ?? defaults);
  useEffect(() => {
    setChoices(choiceMemory.get(category) ?? defaults);
    // Only a change of library resets; `defaults` is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  const update = useCallback((patch: Partial<LibraryChoices>) => {
    setChoices((prev) => {
      const next = { ...prev, ...patch };
      choiceMemory.set(category, next);
      return next;
    });
  }, [category]);
  return [choices, update] as const;
}

// ---------------------------------------------------------------------
// What each library is for
// ---------------------------------------------------------------------

/**
 * The same library serves different jobs, and each job starts from a
 * different view and words its texts differently:
 *   instagram, linkedin  pictures and captions: grid; texts are captions
 *                        with the platform's length limit beside them.
 *   graphics             pictures first: grid.
 *   documents            templates and official papers: list.
 *   contacts             people and organisations: list.
 *   general              anything: list.
 */
export type LibraryFlavour = 'general' | 'instagram' | 'linkedin' | 'graphics' | 'documents' | 'contacts';

export const FLAVOUR_VIEW: Record<LibraryFlavour, LibraryView> = {
  general: 'list', instagram: 'grid', linkedin: 'grid', graphics: 'grid', documents: 'list', contacts: 'list',
};

/** The longest caption each platform publishes. */
export const CAPTION_LIMITS: Partial<Record<LibraryFlavour, { limit: number; where: string }>> = {
  instagram: { limit: 2200, where: 'an Instagram caption' },
  linkedin: { limit: 3000, where: 'a LinkedIn post' },
};

/** What the texts of an item are called in this library. */
export function textNoun(flavour: LibraryFlavour): { one: string; many: string } {
  return flavour === 'instagram' || flavour === 'linkedin'
    ? { one: 'Caption', many: 'Captions and texts' }
    : { one: 'Text', many: 'Texts' };
}
