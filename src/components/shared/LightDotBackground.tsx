import { lazy, Suspense, useEffect, useState } from 'react';
import { perfMode } from '@/lib/perf';

// =====================================================================
// LightDotBackground: the light version of the /join dot field (Step 105).
// ---------------------------------------------------------------------
// The ground behind a report's own page (/archive/<address>). It is the
// same particle field as /join and the Apply flow, on white instead of
// near-black, built the way the dark one has been since it was first
// added, so it behaves the same:
//
//   * a CSS ground is there from the first frame: a white page with a
//     faint lavender bloom, and a dot lattice standing in for the canvas;
//   * the canvas is code-split and mounted a beat after the page has
//     painted, so first paint never waits for it;
//   * the lattice cross-fades out only once the canvas has drawn its
//     first dots (DotField's `onReady`), so a canvas that never draws
//     never takes the stand-in away, and the page carries one grid;
//   * nothing moves under reduced motion, and the browsers that run a
//     canvas without the GPU (lib/perf.ts) keep the CSS ground alone.
//
// THE DARK FIELD IS UNTOUCHED: `ApplyBackground`, `JoinHeroStage` and the
// "in numbers" bands use DotField with its own colours on their own
// ground. Here the dots are a deeper purple, and a quarter larger, than
// on the dark ground, because lavender that glows on black is faint on
// white.
// =====================================================================

const DotField = lazy(() => import('@/components/shared/DotField'));

/** On white the dots need more weight than on black to read the same. */
export const LIGHT_DOTS = { from: '#4A3290', to: '#7A66BE', radius: 1.25 } as const;

const LIGHT_WASH = [
  'radial-gradient(115% 75% at 50% 15%, rgba(126,91,194,0.10) 0%, rgba(176,162,218,0.05) 50%, rgba(255,255,255,0) 78%)',
  'linear-gradient(180deg, #FFFFFF 0%, #FBFAFE 100%)',
].join(',');

const LIGHT_LATTICE = 'radial-gradient(circle at center, rgba(74,50,144,0.5) 1.05px, rgba(74,50,144,0) 1.2px)';

export function LightDotBackground() {
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fieldPainted, setFieldPainted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setFieldPainted(false);
    };
    apply();
    mq.addEventListener('change', apply);
    if (mq.matches || perfMode() === 'lite') return () => mq.removeEventListener('change', apply);
    const id = window.setTimeout(() => setShow(true), 120);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener('change', apply);
    };
  }, []);

  const lattice = !fieldPainted || reduced;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ backgroundColor: '#FFFFFF' }} aria-hidden="true">
      <div className="absolute inset-0" style={{ backgroundImage: LIGHT_WASH }} />
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ backgroundImage: LIGHT_LATTICE, backgroundSize: '18px 18px', opacity: lattice ? 1 : 0 }}
      />
      {show && !reduced && (
        <Suspense fallback={null}>
          <div className="h-full w-full animate-[fadeIn_700ms_ease-out_forwards] opacity-0">
            <DotField glowRadius={0} dotRadius={LIGHT_DOTS.radius} gradientFrom={LIGHT_DOTS.from} gradientTo={LIGHT_DOTS.to} onReady={() => setFieldPainted(true)} />
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default LightDotBackground;
