// =====================================================================
// TourHost: the part of the guided tour that is always there (Step 106).
// ---------------------------------------------------------------------
// It listens for a request to start a tour (How To Use, the help panel)
// and only then loads the tour itself, which is its own chunk: a member
// who never takes a tour never downloads it. One host is mounted by each
// shell of the workspace.
//
// THE TOUR IS FITTED TO THE READER HERE, from the same access the pages
// use (`fitTour` in lib/workspace-tours.ts): the steps about pages this
// role cannot open are left out, and a page it can only read is
// described as read-only. A request for a tour this reader is not
// offered starts nothing.
// =====================================================================
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { START_TOUR_EVENT, tourFor } from '@/lib/workspace-tours';

const WorkspaceTour = lazy(() => import('./WorkspaceTour'));

export default function TourHost() {
  const access = useAccess();
  const [tourId, setTourId] = useState<string | null>(null);
  useEffect(() => {
    const onStart = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof id === 'string' && id) setTourId(id);
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, []);
  // Fitted once, when the tour starts: a tour in progress keeps its steps
  // even if the window is resized across the phone breakpoint.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tour = useMemo(() => (tourId ? tourFor(tourId, access) : undefined), [tourId]);
  const close = useCallback(() => setTourId(null), []);
  if (!tourId || !tour) return null;
  return (
    <Suspense fallback={null}>
      <WorkspaceTour key={tourId} tour={tour} onClose={close} />
    </Suspense>
  );
}
