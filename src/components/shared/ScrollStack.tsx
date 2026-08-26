import { Children, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useLiteMotion } from '@/hooks/usePerfMode';

// =====================================================================
// ScrollStack — the scroll-driven presentation of "Our Divisions".
// ---------------------------------------------------------------------
// One reading of the five cards at every width: a deck. Each card sticks
// under the pinned heading and the next one rides up over it, but the card
// underneath is not merely covered: it settles back a step, losing a
// little scale and light as the card in front arrives. Sticky does the
// pinning, which is cheap and never jitters; a rAF-throttled pass reads
// each card's position and adds the depth on top.
//
// On phones the cards take the FULL COLUMN WIDTH at a comfortable
// portrait proportion rather than a strict 9:16. A 9:16 card is only as
// wide as its height allows, so on a shorter phone it stood well inside
// the column with empty margins on both sides and left the title and the
// description a narrow measure. The scroll dots still run down a vertical
// rail on the card's right long side, marking which card is on top.
//
// Under reduced motion the section falls back to a plain, fully visible
// list: nothing in the content depends on the animation.
// =====================================================================

const MOBILE_MAX_WIDTH = 767;

export function ScrollStackItem({ children }: { children: ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

interface Props {
  children: ReactNode;
  /** Heading pinned above the cards for the whole run of the section. */
  title?: string;
  /** Card height on wide screens. */
  cardClassName?: string;
  /**
   * Which card is on top, reported as it changes.
   *
   * Added for the /join deck, whose cards carry video: only the card in
   * front should be playing, and the deck is the only thing that knows
   * which that is. The homepage passes nothing and is unaffected.
   */
  onActiveChange?: (index: number) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export default function ScrollStack({ children, title, cardClassName, onActiveChange }: Props) {
  const items = Children.toArray(children);
  const height = cardClassName ?? 'h-[62vh] max-h-[520px] min-h-[360px]';

  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH,
  );
  const reduced = useRef(prefersReducedMotion());

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= MOBILE_MAX_WIDTH);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (reduced.current) {
    return (
      <div className="container">
        {title && (
          <h2 className="font-serif text-heading pb-3 mb-6 border-b border-separator text-accent">{title}</h2>
        )}
        <div className="flex flex-col gap-6">
          {items.map((child, i) => (
            <div key={i} className={`overflow-hidden ${narrow ? 'aspect-[1/1.45]' : height}`}>{child}</div>
          ))}
        </div>
      </div>
    );
  }

  return <Deck items={items} title={title} height={height} narrow={narrow} onActiveChange={onActiveChange} />;
}

// --- The deck ---------------------------------------------------------

function Deck({ items, title, height, narrow, onActiveChange }: {
  items: ReactNode[]; title?: string; height: string; narrow: boolean;
  onActiveChange?: (index: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Held in a ref so `paint` stays a stable callback: rebuilding it would
  // tear down and re-add the scroll listener on every render.
  const onActiveRef = useRef(onActiveChange);
  onActiveRef.current = onActiveChange;
  useEffect(() => { onActiveRef.current?.(active); }, [active]);
  const [colWidth, setColWidth] = useState(0);
  // Read through a ref inside `paint`, which is a stable callback and must
  // not be rebuilt (and the scroll listener with it) when the mode changes.
  const lite = useLiteMotion();
  const liteRef = useRef(lite);
  liteRef.current = lite;

  // Cards stick just under the fixed navbar, plus the pinned heading's own
  // height, so a card's top edge stops at the heading's baseline rule
  // instead of sliding beneath it. Extra room is given on phones so the
  // section title does not sit flush against the navbar.
  const navbar = narrow ? '6.5rem' : '5.5rem';
  const headingBlock = title ? (narrow ? '4rem' : '4.75rem') : '0rem';
  const cardBase = `calc(${navbar} + ${headingBlock})`;

  /**
   * ALL THE READS, THEN ALL THE WRITES.
   *
   * This runs on every scroll frame. It used to read
   * `getBoundingClientRect()` twice and `offsetHeight` once PER CARD and
   * write that card's transform and filter immediately afterwards, so the
   * loop went read, write, read, write: each read after a write forces the
   * browser to flush the layout it has just invalidated. With five cards
   * that is fifteen forced reflows in a single frame, sixty times a second,
   * for the whole time the section is on screen.
   *
   * Chrome and Safari on a laptop absorb it. The browsers embedded in other
   * apps do not, and this is one of the two places on the homepage where
   * that shows up as the reported jumping. Measuring every card first and
   * writing afterwards costs one layout per frame instead of fifteen, and
   * looks identical.
   *
   * NOTHING IS WRITTEN THAT HAS NOT CHANGED. The values are rounded to the
   * precision they are used at and compared with what the element already
   * carries, so a frame in which nothing moved touches no style at all.
   *
   * AND THE FILTER IS DROPPED ON A WEAK COMPOSITOR. `filter: brightness()`
   * promotes each card and repaints it on every frame, which is expensive
   * exactly where the budget is smallest. In lite mode the cards keep their
   * scale and lift, which carry the depth, and lose only the shading.
   */
  const paint = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>('[data-stack-card]')];
    if (!cards.length) return;

    // --- reads ---
    const tops = cards.map((c) => c.getBoundingClientRect().top);
    const spans = cards.map((c) => c.offsetHeight || 1);

    // --- writes ---
    let top = 0;
    const lite = liteRef.current;
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (i === cards.length - 1) {
        if (card.style.transform) card.style.transform = '';
        if (card.style.filter) card.style.filter = '';
        continue;
      }
      // How far the following card has travelled over this one: 0 while it
      // is still a card away, 1 once it has fully covered it.
      const p = Math.max(0, Math.min(1, 1 - (tops[i + 1] - tops[i]) / spans[i]));
      if (p > 0.5) top = i + 1;
      // Settle back by up to 6% and lose a little light. The card keeps its
      // own sticky position; this is purely the sense of depth.
      const transform = `translate3d(0, ${(-14 * p).toFixed(1)}px, 0) scale(${(1 - 0.06 * p).toFixed(4)})`;
      if (card.style.transform !== transform) card.style.transform = transform;
      const filter = lite ? '' : `brightness(${(1 - 0.18 * p).toFixed(3)})`;
      if (card.style.filter !== filter) card.style.filter = filter;
    }
    setActive(top);
  }, []);

  useEffect(() => {
    let frame = 0;
    // THE STACK ONLY DOES THIS WORK WHILE IT IS ON SCREEN. The listener used
    // to run for the life of the page: on the homepage that is a layout read
    // and a style write per card on every scroll frame of every other
    // section, for a section the reader is nowhere near.
    let near = true;
    const measure = () => {
      const root = rootRef.current;
      if (root) setColWidth(root.clientWidth);
    };
    const onScroll = () => {
      if (frame || !near) return;
      frame = requestAnimationFrame(() => { frame = 0; paint(); });
    };
    const onResize = () => { measure(); onScroll(); };
    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    const root = rootRef.current;
    const io = root && typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
        near = entries.some((e) => e.isIntersecting);
        if (near) onScroll();
      }, { rootMargin: '50% 0px' })
      : null;
    if (io && root) io.observe(root);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      io?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [paint, narrow]);


  // On phones the card is the FULL WIDTH OF THE COLUMN, and its height is
  // whatever the space under the header and heading allows, clamped into a
  // portrait range so it is always clearly vertical and never squat: no
  // shorter than 1.15 times its width, no taller than 1.45 times it.
  const w = Math.round(colWidth);
  const portraitHeight = `clamp(${w * 1.15}px, calc(100svh - 11rem), ${w * 1.45}px)`;


  return (
    <div className="container">
      <div className="relative" ref={rootRef} style={narrow ? { ['--dstack-card-h' as string]: portraitHeight } : undefined}>
        {title && (
          <h2
            className="sticky z-0 bg-background font-serif text-heading pb-3 mb-6 border-b border-separator text-accent"
            style={{ top: navbar }}
          >
            {title}
          </h2>
        )}

        {/* The dot rail: one sticky, zero-height layer that hangs over the
            right long side of whichever card is on top. */}
        {narrow && (
          <div className="dstack-vrail" style={{ top: cardBase }} aria-hidden="true">
            <div className="dstack-dots dstack-dots--v">
              {items.map((_, i) => (
                <span key={i} className={`dstack-dot${i === active ? ' is-on' : ''}`} />
              ))}
            </div>
          </div>
        )}

        {items.map((child, i) => (
          <div
            key={i}
            data-stack-card
            className={`sticky overflow-hidden shadow-[0_12px_28px_-16px_rgba(0,0,0,0.28)] ${narrow ? 'mx-auto' : height} ${i === items.length - 1 ? '' : 'mb-6 md:mb-8'}`}
            style={{
              top: `calc(${cardBase} + ${i * 0.9}rem)`,
              zIndex: i + 1,
              transformOrigin: 'center top',
              willChange: 'transform, filter',
              ...(narrow
                ? {
                    height: 'var(--dstack-card-h)',
                    width: '100%',
                  }
                : null),
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
