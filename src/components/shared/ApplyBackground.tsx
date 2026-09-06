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
//
// UNDERNEATH IT, ALWAYS, IS `AmbientGround`. The flat #05030F rectangle
// this used to fall back to is what a visitor saw whenever the field was
// skipped, deferred or unavailable, and it is why the background was
// reported as often not loading at all. The CSS ground draws the same
// lattice with nothing to fetch and nothing to compile, so the page is
// composed from the first frame and the canvas, when it arrives, fades in
// over the top of a picture rather than into an empty box.
//
// AND THE GROUND'S OWN LATTICE THEN STANDS DOWN. Two 18px grids painted
// at once, one anchored top left and one centred in the box, sit a pixel
// or two apart and read as two layers of dots. The ground's wash stays
// (it is where this page's colour comes from); its dots cross-fade out as
// the canvas's cross-fade in, over the same 700ms, so the page carries
// one grid at every moment. The handover is driven by the canvas's first
// painted frame, not by its mount, so a canvas that never draws never
// takes the stand-in away.
// =====================================================================

import { perfMode } from '@/lib/perf';
import { AmbientGround } from '@/components/shared/AmbientGround';

const DotField = lazy(() => import('@/components/shared/DotField'));

export function ApplyBackground() {
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Set by the canvas itself, on the first frame it actually draws dots.
  // Not on mount: see DotField's `onReady`.
  const [fieldPainted, setFieldPainted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(mq.matches);
      // Asking for reduced motion unmounts the canvas, so the ground has
      // to be a whole background again.
      if (mq.matches) setFieldPainted(false);
    };
    apply();
    mq.addEventListener('change', apply);
    if (mq.matches) return () => mq.removeEventListener('change', apply);
    // A WebGL particle field is the single most expensive thing on this page
    // and the browsers embedded in other apps frequently run it without GPU
    // rasterisation. The card, the form and the deep navy ground are the
    // page; the field is ambience, so on those browsers it is simply never
    // mounted. See lib/perf.ts.
    if (perfMode() === 'lite') return () => mq.removeEventListener('change', apply);

    // Short and unconditional. An idle callback would be tidier and is
    // exactly what the /join hero used to do, but on a busy main thread
    // "idle" can be most of a second away, and a background that arrives
    // that late has already been experienced as a background that did not
    // arrive.
    const id = window.setTimeout(() => setShow(true), 120);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener('change', apply);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#05030F' }} aria-hidden="true">
      <AmbientGround kind="dots" lattice={!fieldPainted || reduced} />
      {show && !reduced && (
        <Suspense fallback={null}>
          <div className="h-full w-full animate-[fadeIn_700ms_ease-out_forwards] opacity-0">
            <DotField glowRadius={0} onReady={() => setFieldPainted(true)} />
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default ApplyBackground;
