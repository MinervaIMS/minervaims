import { lazy, Suspense, useEffect, useState } from 'react';

// =====================================================================
// ApplyBackground — the ambient layer behind the application flow.
// ---------------------------------------------------------------------
// This is the background an APPLICANT meets: the Apply form, the
// "confirm your email" step and the submitted card. It uses the same
// particle field as /join, because the two are one journey: a candidate
// reads about recruiting on /join and carries straight on into the form,
// and the page should not change character underneath them.
//
// The Workspace auth pages (sign in, sign up, password reset) and the
// event pages keep the beams: those belong to members, not to applicants,
// and they are reached from somewhere else entirely.
//
// The canvas is code-split and mounted a beat after the card has painted,
// so first paint never waits on it, and it is skipped altogether under
// reduced motion.
// =====================================================================

const DotField = lazy(() => import('@/components/shared/DotField'));

export function ApplyBackground() {
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    if (mq.matches) return () => mq.removeEventListener('change', apply);

    const id = window.setTimeout(() => setShow(true), 120);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener('change', apply);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#05030F' }} aria-hidden="true">
      {show && !reduced && (
        <Suspense fallback={null}>
          <div className="h-full w-full animate-[fadeIn_700ms_ease-out_forwards] opacity-0">
            <DotField glowRadius={0} />
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default ApplyBackground;
