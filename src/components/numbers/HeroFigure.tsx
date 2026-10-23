import { useEffect, useRef } from 'react';
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
 */
const DURATION_MS = 3200;

export function HeroFigure({ figure }: { figure: KeyNumber | null }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const countedTo = useRef<number | null>(null);
  const text = figure ? formatHeroFigure(figure) : null;
  const target = figure ? heroTarget(figure) : null;

  useEffect(() => {
    const box = boxRef.current;
    const face = faceRef.current;
    if (!box || !face || target === null || countedTo.current === target) return;
    countedTo.current = target;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* old browsers */ }
    if (reduce) return;

    let frame = 0;
    let start: number | undefined;
    face.dataset.count = '0+';
    box.dataset.counting = 'on';
    const draw = (now: number) => {
      if (start === undefined) start = now;
      const progress = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      // Written to an attribute, not to the text and not to React state.
      face.dataset.count = `${Math.round(target * eased)}+`;
      if (progress < 1) frame = requestAnimationFrame(draw);
      else delete box.dataset.counting;
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      delete box.dataset.counting;
      countedTo.current = null;
    };
  }, [target]);

  if (!figure || text === null) {
    return <span data-kn="pending" aria-hidden="true" className="inline-block align-middle" style={{ height: '1em', width: '2.2em' }} />;
  }
  // `data-kn` marks a key figure for the number-rule checks, which read its
  // text frame by frame and fail if it ever differs from the final one.
  return (
    <span data-kn="" className="kn-count" ref={boxRef}>
      <span className="kn-count-text">{text}</span>
      <span className="kn-count-face" aria-hidden="true" ref={faceRef} />
    </span>
  );
}

export default HeroFigure;
