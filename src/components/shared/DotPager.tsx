import { useRef, type KeyboardEvent, type MouseEvent } from 'react';

// =====================================================================
// THE DOTS UNDER A CAROUSEL, AS ONE CONTROL (Step 102).
// ---------------------------------------------------------------------
// The dots used to be one button each: 6px wide, 6px apart. A finger
// cannot aim at a 6px target with another 6px away, and that is what the
// accessibility check (WCAG 2.5.8, target size) reported on the homepage.
// Making each dot 24px wide would have spread them out and changed the
// design, so the dots stay exactly as they are drawn and become a picture
// of where the reader is, and the strip they sit in becomes ONE control,
// at least 24px tall, that answers wherever it is pressed:
//
//   * a click or tap goes to the nearest dot, as it always did;
//   * the arrow keys move one item, Home and End go to the first and the
//     last, and the strip is a single stop for the Tab key instead of one
//     stop per item;
//   * a screen reader hears "Reports, slider, 3 of 10" rather than a row of
//     tabs that open no tab panels.
//
// The strip is taller than the dots only by an invisible margin that is
// taken back (`.dot-pager` in index.css), so nothing on the page moves.
// =====================================================================

interface DotPagerProps {
  /** How many dots. */
  count: number;
  /** The dot drawn as the current one (from 0). */
  active: number;
  /** Go to item `i` (from 0). */
  onSelect: (i: number) => void;
  /** What the control moves through, read out by a screen reader. */
  label: string;
  /** How the current position is read out, e.g. "Report 3 of 10". */
  valueText?: (i: number, count: number) => string;
  /** The dot class (`rdot` or `mdot`) and its "current" modifier. */
  dotClass?: 'rdot' | 'mdot';
  activeClass?: string;
}

const defaultValueText = (i: number, count: number) => `${i + 1} of ${count}`;

/** How long a press is remembered while the rail scrolls to it. */
const SETTLE_MS = 700;

export function DotPager({
  count,
  active,
  onSelect,
  label,
  valueText = defaultValueText,
  dotClass = 'rdot',
  activeClass = 'is-active',
}: DotPagerProps) {
  // Where the rail was last sent. It takes a moment to scroll there, and
  // `active` follows only once it has: a second press of an arrow in the
  // meantime moves on from where it was sent, not from where it still is.
  const sent = useRef<{ index: number; at: number } | null>(null);
  const from = () => (sent.current && performance.now() - sent.current.at < SETTLE_MS ? sent.current.index : active);
  const go = (i: number) => {
    const target = from();
    const next = Math.max(0, Math.min(count - 1, i));
    sent.current = { index: next, at: performance.now() };
    if (next !== target) onSelect(next);
  };

  const onClick = (e: MouseEvent<HTMLSpanElement>) => {
    // The nearest dot to the point pressed.
    const dots = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-dot]'));
    let best = active;
    let bestDistance = Infinity;
    dots.forEach((dot, i) => {
      const r = dot.getBoundingClientRect();
      const distance = Math.abs(e.clientX - (r.left + r.width / 2));
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    // As each button did, even on the current dot (which settles the rail
    // back onto it if it was left between two items).
    sent.current = { index: best, at: performance.now() };
    onSelect(best);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in step) go(from() + step[e.key]);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(count - 1);
    else return;
    e.preventDefault();
  };

  return (
    <span
      className="dot-pager"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={active + 1}
      aria-valuetext={valueText(active, count)}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          data-dot=""
          aria-hidden="true"
          className={`${dotClass}${i === active ? ` ${activeClass}` : ''}`}
        />
      ))}
    </span>
  );
}

export default DotPager;
