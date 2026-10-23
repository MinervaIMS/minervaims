import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  isKeyNumbersSnapshot, readEmbeddedKeyNumbers, type KeyNumber, type KeyNumbersSnapshot,
} from '@/lib/key-numbers';

// =====================================================================
// useKeyNumbers: the registry, for any public component (Step 92).
// ---------------------------------------------------------------------
// WHERE THE FIGURES COME FROM, IN ORDER:
//   1. the JSON the build embedded in the page. Read synchronously when
//      this module loads, so React's first render already has the final
//      values: no loader, no zero, no count-up;
//   2. failing that (a development server, or a build that could not
//      reach the database), the copy this browser kept from an earlier
//      visit;
//   3. failing that, one live read of public_key_numbers(), shown once
//      it arrives. Until then a figure has no text at all.
//
// A VALUE ON SCREEN IS NEVER REPLACED. The live read refreshes the copy
// kept for next time, and fills in only what had nothing to show; it
// never swaps one value for another in front of the reader, which is the
// number rule.
//
// STAYING CURRENT BETWEEN PUBLISHES. The registry is recomputed every
// night, the embedded copy only at each Publish. So when the copy in use
// is more than a day old, one quiet live read refreshes the kept copy, and
// the next page load starts from whichever of the two was computed later.
// Crawlers keep no copy: they read what the last Publish embedded, which
// is also what /data/key-numbers.json says.
// =====================================================================

const CACHE_KEY = 'mims_key_figures';
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function readCache(): KeyNumbersSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isKeyNumbersSnapshot(parsed) ? { ...parsed, source: 'cache' } : null;
  } catch {
    return null;
  }
}

function writeCache(snap: KeyNumbersSnapshot) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(snap)); } catch { /* private mode, full quota */ }
}

const computedAt = (snap: KeyNumbersSnapshot | null) => (snap?.computed_at ? Date.parse(snap.computed_at) || 0 : 0);

/** The later of the embedded copy and the kept one; the embedded copy on a tie. */
function newest(a: KeyNumbersSnapshot | null, b: KeyNumbersSnapshot | null) {
  if (!a) return b;
  if (!b) return a;
  return computedAt(b) > computedAt(a) ? b : a;
}

let state: KeyNumbersSnapshot | null = newest(readEmbeddedKeyNumbers(), readCache());
let requested = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (requested) return;
  if (state && Date.now() - computedAt(state) < STALE_AFTER_MS) return;
  requested = true;
  void (async () => {
    try {
      const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)('public_key_numbers');
      if (error || !isKeyNumbersSnapshot(data)) return;
      const live: KeyNumbersSnapshot = { ...data, source: 'live' };
      writeCache(live);
      if (!state) {
        state = live;
        listeners.forEach((l) => l());
      }
    } catch {
      // The figures stay absent; nothing on the page depends on them.
    }
  })();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

/** The whole registry, or null while there is none. */
export function useKeyNumbers(): KeyNumbersSnapshot | null {
  ensureLoaded();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** One figure by its slug, or null. */
export function useKeyNumber(slug: string): KeyNumber | null {
  const snap = useKeyNumbers();
  return snap?.numbers[slug] ?? null;
}

/** A page's figures, in their order, with their slugs. */
export function usePageKeyNumbers(pageKey: string): (KeyNumber & { slug: string })[] {
  const snap = useKeyNumbers();
  if (!snap) return [];
  return (snap.pages[pageKey] ?? [])
    .map((slug) => (snap.numbers[slug] ? { ...snap.numbers[slug], slug } : null))
    .filter((n): n is KeyNumber & { slug: string } => n !== null);
}
