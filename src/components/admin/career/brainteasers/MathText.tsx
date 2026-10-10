import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import 'katex/dist/katex.min.css';
import './brainteasers.css';
import { renderMathText } from './render-math';

// A question or a solution, as the reader should see it (see render-math.ts).
//
// A formula set on its own line is drawn at the size of the text when it
// fits the column. One that is wider (a long chain of equalities, a sum
// with its working) is drawn smaller until it fits, down to MIN_SCALE,
// which stays comfortably readable; only a formula still too wide at that
// size scrolls sideways, and then a fade at its edge says there is more.
// This is what keeps a solution readable on a phone without the page
// itself ever moving sideways.

/** The smallest a formula is drawn to fit its column. */
const MIN_SCALE = 0.72;

function markEnd(box: HTMLElement) {
  box.classList.toggle('bt-scroll-end', box.scrollLeft + box.clientWidth >= box.scrollWidth - 2);
}

function fitFormulas(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.bt-display').forEach((box) => {
    const inner = box.querySelector<HTMLElement>('.katex-display');
    if (!inner) return;
    inner.style.fontSize = '';
    const natural = box.scrollWidth;
    const room = box.clientWidth;
    let scrolls = false;
    if (room > 0 && natural > room + 1) {
      const scale = Math.max(MIN_SCALE, Math.floor(((room - 2) / natural) * 100) / 100);
      inner.style.fontSize = `${scale}em`;
      scrolls = box.scrollWidth > box.clientWidth + 1;
    }
    box.classList.toggle('bt-scroll', scrolls);
    // A formula that scrolls can be reached and scrolled from the keyboard.
    if (scrolls) {
      box.tabIndex = 0;
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', 'Formula: scroll sideways to read all of it');
    } else {
      box.removeAttribute('tabindex');
      box.removeAttribute('role');
      box.removeAttribute('aria-label');
    }
    markEnd(box);
  });
}

/** Rendered once per text; the result is the page's own escaped HTML and KaTeX output. */
export const MathText = memo(function MathText({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => renderMathText(text), [text]);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !root.querySelector('.bt-display')) return;
    let live = true;
    const fit = () => { if (live) fitFormulas(root); };
    fit();
    // Again when the column changes width (a window resized, a phone
    // turned) and once the maths fonts have arrived, since a formula is
    // measured in them.
    let width = root.clientWidth;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (root.clientWidth !== width) { width = root.clientWidth; fit(); }
    });
    ro?.observe(root);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.ready.then(fit).catch(() => undefined);
    fonts?.addEventListener?.('loadingdone', fit);
    // Scrolling does not bubble: listen on the way down.
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.classList?.contains('bt-display')) markEnd(t);
    };
    root.addEventListener('scroll', onScroll, true);
    return () => {
      live = false;
      ro?.disconnect();
      fonts?.removeEventListener?.('loadingdone', fit);
      root.removeEventListener('scroll', onScroll, true);
    };
  }, [html]);

  return <div ref={ref} className={`bt-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
});

export default MathText;
