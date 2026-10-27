import { useEffect, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect';
import { formatHeroFigure, heroTarget, type KeyNumber } from '@/lib/key-numbers';
import './numbers.css';

/**
 * One of the hero figures on the homepage and /join: "250+".
 *
 * PEOPLE SEE IT COUNT UP, AS IT ALWAYS HAS: from zero to the figure rounded
 * down to its ten, with a "+", over 3.2 seconds, easing out.
 *
 * MACHINES READ THE FINAL VALUE AT EVERY INSTANT. The page text of the
 * figure is "250+" from the first frame (and in the static HTML), and it
 * never changes. The moving digits are not text: they are drawn by an
 * `aria-hidden` overlay from its `data-count` attribute, through CSS
 * generated content, while the real text sits underneath at opacity 0.
 * A crawler, a screen reader or anything reading the page's text at any
 * moment gets "250+", never a number on its way there.
 *
 * Under reduced motion there is no count: the figure is simply shown.
 * With no figure yet (a development server, a first visit with nothing
 * embedded) it keeps an empty box of about the right size, never a zero.
 *
 * ON THE HOMEPAGE'S FIRST SCREEN THE COUNT MAY HAVE STARTED ALREADY (Step
 * 102). That screen is drawn from the HTML before the app has arrived
 * (vite.prerender.ts), and a few lines in the page start the same count on
 * it, from the same zero, with the same duration and curve. `countFrom`
 * reads when that count starts (lib/prerender.ts): the figure carries on
 * from where it has got to, set before the browser paints, so the digits
 * never jump back.
 */
const DURATION_MS = 3200;

/**
 * Run the count on `box`; returns its stop. It starts on the next frame, or
 * at the moment `from` reads (a frame time, possibly still to come).
 */
function runCount(box: HTMLSpanElement, face: HTMLSpanElement, target: number, from: (() => number) | undefined) {
  let frame = 0;
  let begun: number | undefined;
  // Never an earlier moment than one already drawn: a frame's time can be a
  // little before the moment the count was taken over, and the digits must
  // not step back.
  let latest = -Infinity;
  const at = (time: number) => {
    const now = (latest = Math.max(latest, time));
    const start = from ? from() : begun;
    const progress = start === undefined || !(start <= now) ? 0 : Math.max(0, Math.min((now - start) / DURATION_MS, 1));
    const eased = 1 - Math.pow(1 - progress, 3);
    // Written to an attribute, not to the text and not to React state.
    face.dataset.count = `${Math.round(target * eased)}+`;
    return progress;
  };
  if (from && at(performance.now()) >= 1) return () => {};
  if (!from) face.dataset.count = '0+';
  box.dataset.counting = 'on';
  const draw = (now: number) => {
    if (!from && begun === undefined) begun = now;
    if (at(now) < 1) frame = requestAnimationFrame(draw);
    else delete box.dataset.counting;
  };
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    delete box.dataset.counting;
  };
}

export function HeroFigure({ figure, countFrom = null }: { figure: KeyNumber | null; countFrom?: (() => number) | null }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const countedTo = useRef<number | null>(null);
  const text = figure ? formatHeroFigure(figure) : null;
  const target = figure ? heroTarget(figure) : null;

  const start = (from: (() => number) | undefined) => {
    const box = boxRef.current;
    const face = faceRef.current;
    if (!box || !face || target === null || countedTo.current === target) return undefined;
    countedTo.current = target;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* old browsers */ }
    if (reduce) return undefined;
    const stop = runCount(box, face, target, from);
    return () => {
      stop();
      countedTo.current = null;
    };
  };

  // Carrying on a count the first screen started: before the paint.
  useIsomorphicLayoutEffect(() => {
    if (countFrom === null) return undefined;
    return start(countFrom);
  }, [target, countFrom]);

  // Every other mount counts from zero, as it always has.
  useEffect(() => {
    if (countFrom !== null) return undefined;
    return start(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, countFrom]);

  if (!figure || text === null) {
    return <span data-kn="pending" aria-hidden="true" className="inline-block align-middle" style={{ height: '1em', width: '2.2em' }} />;
  }
  // `data-kn` marks a key figure for the number-rule checks, which read its
  // text frame by frame and fail if it ever differs from the final one.
  return (
    // `data-target` is the figure the count ends on, for the first screen's
    // count (vite.prerender.ts); it is the same number as the text.
    <span data-kn="" className="kn-count" ref={boxRef} data-target={target ?? undefined}>
      <span className="kn-count-text">{text}</span>
      <span className="kn-count-face" aria-hidden="true" ref={faceRef} />
    </span>
  );
}

export default HeroFigure;
