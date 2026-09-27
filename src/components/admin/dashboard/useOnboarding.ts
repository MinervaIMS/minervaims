import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadOnboarding, latestReports, saveOnboarding,
  type LatestReport, type OnboardingContext, type OnboardingProgress,
} from '@/lib/onboarding';

// =====================================================================
// The state of the getting started checklist, for the Dashboard. Loaded
// with the rest of the page, so whether the checklist replaces "Research
// by division" is known before the page appears. See
// OnboardingChecklistBlock.tsx and src/lib/onboarding.ts.
// =====================================================================

interface State {
  settled: boolean;
  context: OnboardingContext | null;
  progress: OnboardingProgress;
  reports: LatestReport[];
  /** The reports are the division's own, not the association's. */
  reportsOfDivision: boolean;
  /** Completed on an earlier visit: the checklist is over. */
  completedBefore: boolean;
}

const EMPTY: OnboardingProgress = { items: {}, hidden_at: null, completed_at: null };

export function useOnboarding(userId: string | null) {
  const [state, setState] = useState<State>({ settled: false, context: null, progress: EMPTY, reports: [], reportsOfDivision: false, completedBefore: false });
  const progressRef = useRef<OnboardingProgress>(EMPTY);

  useEffect(() => {
    let active = true;
    if (!userId) { setState((s) => ({ ...s, settled: true })); return; }
    (async () => {
      try {
        const { context, progress } = await loadOnboarding();
        const p = progress ?? EMPTY;
        const open = context.eligible && !p.hidden_at && !p.completed_at;
        const latest = open ? await latestReports(context.division).catch(() => ({ reports: [], ofDivision: false })) : { reports: [], ofDivision: false };
        if (!active) return;
        progressRef.current = p;
        setState({
          settled: true, context, progress: p, reports: latest.reports, reportsOfDivision: latest.ofDivision,
          completedBefore: !!p.completed_at,
        });
      } catch (e) {
        console.error('Could not read the getting started checklist', e);
        if (active) setState((s) => ({ ...s, settled: true, context: null }));
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const save = useCallback(async (next: OnboardingProgress) => {
    const before = progressRef.current;
    progressRef.current = next;
    setState((s) => ({ ...s, progress: next }));
    if (!userId) return;
    try {
      await saveOnboarding(userId, next);
    } catch (e) {
      progressRef.current = before;
      setState((s) => ({ ...s, progress: before }));
      throw e;
    }
  }, [userId]);

  const ctx = state.context;
  const show = !!ctx?.eligible && !state.progress.hidden_at && !state.completedBefore;
  return { ...state, show, save, progressRef };
}

export type OnboardingState = ReturnType<typeof useOnboarding>;
