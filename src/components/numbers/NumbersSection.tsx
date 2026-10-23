import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AmbientGround } from '@/components/shared/AmbientGround';
import { KeyFigureValue } from '@/components/numbers/KeyFigureValue';
import { usePageKeyNumbers } from '@/hooks/useKeyNumbers';
import {
  describeKeyNumber, formatAsOf, latestAsOf, STATS_SECTION_SUBTITLES, STATS_SECTION_TITLES,
} from '@/lib/key-numbers';
import { perfMode } from '@/lib/perf';
import './numbers.css';

const DotField = lazy(() => import('@/components/shared/DotField'));

// =====================================================================
// "<Page> in numbers": the last section of every content page (Step 92).
// ---------------------------------------------------------------------
// Black, with the purple dot field of the /join hero, and the page's key
// figures set exactly as the /join figures are: EB Garamond, white, the
// same sizes, the same thin white rules between them. The grid follows
// the number of figures the page has (one, three, five, six, nine), and
// a page with none shows nothing.
//
// It is a <section> named by its heading, and the figures are a <dl>:
// the label is the term, the value the description, so the figures are
// structured in the HTML itself. "Definitions" is a native <details>:
// every definition is in the page, one click away for a reader.
//
// THE NUMBER RULE. The values are final from the first frame (see
// useKeyNumbers). The only motion is the characters rising into place
// the first time the section comes into view, by transform and opacity;
// a section already on screen when the page opens does not move at all.
//
// THE DOT FIELD costs nothing until it is wanted: it is loaded only when
// the section comes near the viewport, paused whenever the section is off
// screen or the tab is hidden, and replaced by the static CSS lattice
// under reduced motion or on a browser that cannot afford it. It sits in
// an absolutely positioned layer, so it can never move the layout.
// =====================================================================

/** Columns per breakpoint for N figures: 3 by 2 for six on a desktop, 2 by 3 on a phone. */
function gridClass(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-3';
  if (n === 4) return 'grid-cols-2 md:grid-cols-4';
  if (n === 5) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
  return 'grid-cols-2 sm:grid-cols-3';
}

/** A last figure left alone on a two-column phone row spans the row. */
function orphanClass(n: number, i: number): string {
  if (i !== n - 1 || n % 2 === 0 || n < 5) return '';
  return n === 5 ? 'col-span-2 md:col-span-1' : 'col-span-2 sm:col-span-1';
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function NumbersSection({ pageKey, title, subtitle }: { pageKey: string; title?: string; subtitle?: string }) {
  const figures = usePageKeyNumbers(pageKey);
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDListElement>(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [painted, setPainted] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const [lite] = useState(() => perfMode() === 'lite');
  const [reveal, setReveal] = useState<'idle' | 'go' | 'none'>('idle');
  const hasFigures = figures.length > 0;

  // Where the section is: near (load the field), on screen (run it).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); setOnScreen(true); return; }
    const nearIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '400px 0px' });
    const seenIo = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0 });
    nearIo.observe(el);
    seenIo.observe(el);
    return () => { nearIo.disconnect(); seenIo.disconnect(); };
  }, [hasFigures]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // The characters rise once, as the figures come up from below. Figures
  // already in view when the page opens stay exactly as they are.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || reduced) { setReveal('none'); return; }
    if (typeof IntersectionObserver === 'undefined') { setReveal('none'); return; }
    let first = true;
    const io = new IntersectionObserver(([e]) => {
      if (first) {
        first = false;
        if (e.isIntersecting) { setReveal('none'); io.disconnect(); return; }
        return;
      }
      if (e.isIntersecting) { setReveal('go'); io.disconnect(); }
    }, { rootMargin: '0px 0px 8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, hasFigures]);

  if (figures.length === 0) return null;

  const heading = title ?? STATS_SECTION_TITLES[pageKey] ?? 'Minerva in numbers';
  const line = subtitle ?? STATS_SECTION_SUBTITLES[pageKey];
  const asOf = formatAsOf(latestAsOf(figures));
  const n = figures.length;
  const showField = near && !reduced && !lite;

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      data-numbers-section={pageKey}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#000' }}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <AmbientGround kind="dots" lattice={!painted || !showField} />
        {showField && (
          <Suspense fallback={null}>
            <div className="h-full w-full animate-[fadeIn_700ms_ease-out_forwards] opacity-0">
              <DotField glowRadius={0} paused={!onScreen || tabHidden} onReady={() => setPainted(true)} />
            </div>
          </Suspense>
        )}
      </div>

      <div className="container relative py-section-sm md:py-section">
        <h2 id={headingId} className="text-center font-serif text-heading text-background md:text-display">
          {heading}
        </h2>
        {line && (
          <p className="mx-auto mt-3 max-w-2xl text-center font-body text-sm text-background/80 md:text-body">{line}</p>
        )}

        <div className="kn-rules mx-auto mt-10 max-w-5xl md:mt-14" style={{ ['--kn-rule' as string]: 'rgba(255,255,255,0.25)' }}>
          <dl ref={gridRef} data-kn-reveal={reveal} className={`grid ${gridClass(n)}`}>
            {figures.map((f, i) => (
              <div
                key={f.slug}
                className={`flex flex-col items-center px-2 py-6 text-center md:py-8 ${orphanClass(n, i)}`}
              >
                <dt className="order-2 mt-3 font-body text-[0.7rem] uppercase leading-tight tracking-wider text-background/80 sm:text-xs md:text-body">
                  {f.label}
                </dt>
                <dd
                  className="order-1 whitespace-nowrap font-serif text-[2.25rem] leading-none text-background sm:text-5xl md:text-hero"
                  title={describeKeyNumber(f)}
                >
                  <KeyFigureValue figure={f} reveal={reveal !== 'none'} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <details className="kn-defs mx-auto mt-8 max-w-3xl text-center font-body text-sm text-background/70">
          <summary className="inline">
            {asOf ? <>Figures as of {asOf}. </> : null}
            <span className="underline underline-offset-4 hover:text-background">Definitions</span>
          </summary>
          <dl className="mt-6 space-y-4 text-left">
            {figures.map((f) => (
              <div key={f.slug}>
                <dt className="font-semibold text-background">{f.label}</dt>
                <dd className="mt-1 text-background/80">{describeKeyNumber(f)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-left text-background/70">
            Computed automatically from the association&apos;s own records. Every figure, with its definition, is on{' '}
            <Link to="/numbers" className="underline underline-offset-4 hover:text-background">Minerva in Numbers</Link>.
          </p>
        </details>
      </div>
    </section>
  );
}
