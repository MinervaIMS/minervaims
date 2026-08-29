// =====================================================================
// The applicant's own application, read once and shared.
// ---------------------------------------------------------------------
// An applicant's workspace now depends on their application in more
// places than one. The navigation itself does: the Interview section
// only exists once a division has invited them, and the Offer section
// only once an offer has been sent. So do the three pages that read the
// application to render themselves.
//
// If each of those called `getMyApplication()` on mount, opening the
// Offer page would fetch the same row the rail had just fetched to
// decide whether to show the link to it, and accepting an offer would
// update one copy of the row while the rail kept the other. So the row
// is fetched ONCE per session and held here, with a single explicit
// refresh that every reader hears.
//
// It is a module-level store rather than a React context because the
// navigation is computed in `MinervaWorkspace` ABOVE the tree that would
// hold such a provider, and hoisting a provider over the whole workspace
// to serve applicants only would put a fetch in every member's path too.
//
// `useSyncExternalStore` is the sanctioned way to read an external store
// in React 18: it subscribes, it re-renders on change, and it cannot tear
// between two components reading in the same paint.
// =====================================================================

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getMyApplication, type ApplicationRow } from '@/lib/applications-api';

type Snapshot = {
  application: ApplicationRow | null;
  loading: boolean;
  error: string | null;
};

let snapshot: Snapshot = { application: null, loading: true, error: null };
let inflight: Promise<void> | null = null;
let started = false;

const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Read the application from the database and publish it.
 *
 * Concurrent callers share the one request: the promise is held while it
 * is in flight and handed to anybody else who asks in the meantime, so a
 * page and the rail mounting in the same tick make one round trip.
 */
export function loadMyApplication(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const application = await getMyApplication();
      emit({ application, loading: false, error: null });
    } catch (e) {
      emit({ application: null, loading: false, error: e instanceof Error ? e.message : 'Could not load your application.' });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Re-read the application, e.g. after accepting or declining an offer. */
export function refreshMyApplication(): Promise<void> {
  inflight = null;
  return loadMyApplication();
}

/** Forget everything. Called on sign-out so the next account starts clean. */
export function resetMyApplication() {
  started = false;
  inflight = null;
  emit({ application: null, loading: true, error: null });
}

/**
 * The applicant's application, loading state and a refresh.
 *
 * `enabled` is how a member avoids the fetch entirely: the workspace
 * passes `isCandidate`, so nothing is requested for anybody whose
 * workspace does not depend on an application row.
 */
export function useMyApplication(enabled = true) {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

  useEffect(() => {
    if (!enabled || started) return;
    started = true;
    void loadMyApplication();
  }, [enabled]);

  const refresh = useCallback(() => refreshMyApplication(), []);

  return {
    application: state.application,
    // Nothing is ever loading for somebody who is not asking.
    loading: enabled ? state.loading : false,
    error: state.error,
    refresh,
  };
}
