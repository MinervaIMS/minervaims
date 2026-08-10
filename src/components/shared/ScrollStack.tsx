import { Children, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { bindPinnedScroll } from '@/lib/pinned-scroll';

// =====================================================================
// ScrollStack — the scroll-driven presentation of "Our Divisions".
// ---------------------------------------------------------------------
// One section, two readings of the same five cards.
//
// WIDE SCREENS: a deck. Each card sticks under the pinned heading and the
// next one rides up over it, but the card underneath is not merely
// covered: it settles back a step, losing a little scale and light as the
// card in front arrives. That is what makes it read as a stack rather
// than as pages being dealt on top of one another. Sticky still does the
// pinning, which is cheap and never jitters; a rAF-throttled pass reads
// each card's position and adds the depth on top.
//
// PHONES: a sideways run. Vertical scrolling is converted into horizontal
// travel across the five cards, deliberately slowed, and only once the
// last card has been reached does the page carry on downwards. The
// section claims a tall block of scroll (its horizontal overflow times
// PACE) and pins itself inside it, so the browser's own scrolling drives
// everything: no wheel hijacking, no preventDefault, and a flick still
// behaves like a flick.
//
// Under reduced motion both modes fall back to a plain, fully visible
// list: nothing in the content depends on the animation.
// =====================================================================

/** How much slower the sideways run is than ordinary scrolling. */
const PACE = 1.8;
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
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export default function ScrollStack({ children, title, cardClassName }: Props) {
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

  return narrow
    ? <HorizontalRun items={items} title={title} reduced={reduced.current} />
    : <Deck items={items} title={title} height={height} reduced={reduced.current} />;
}

// --- Wide screens: the deck -------------------------------------------

function Deck({ items, title, height, reduced }: {
  items: ReactNode[]; title?: string; height: string; reduced: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Cards stick just under the fixed navbar, plus the pinned heading's own
  // height, so a card's top edge stops at the heading's baseline rule
  // instead of sliding beneath it.
  const navbar = '5.5rem';
  const headingBlock = title ? '4.75rem' : '0rem';
  const cardBase = `calc(${navbar} + ${headingBlock})`;

  const paint = useCallback(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const cards = [...root.querySelectorAll<HTMLElement>('[data-stack-card]')];

    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) {
        card.style.transform = '';
        card.style.filter = '';
        return;
      }
      // How far the following card has travelled over this one: 0 while it
      // is still a card away, 1 once it has fully covered it.
      const gap = next.getBoundingClientRect().top - card.getBoundingClientRect().top;
      const span = card.offsetHeight || 1;
      const p = Math.max(0, Math.min(1, 1 - gap / span));
      // Settle back by up to 6% and lose a little light. The card keeps its
      // own sticky position; this is purely the sense of depth.
      const scale = 1 - 0.06 * p;
      const lift = -14 * p;
      card.style.transform = `translate3d(0, ${lift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      card.style.filter = `brightness(${(1 - 0.18 * p).toFixed(3)})`;
    });
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; paint(); });
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [paint, reduced]);

  return (
    <div className="container">
      <div className="relative" ref={rootRef}>
        {title && (
          <h2
            className="sticky z-0 bg-background font-serif text-heading pb-3 mb-6 border-b border-separator text-accent"
            style={{ top: navbar }}
          >
            {title}
          </h2>
        )}
        {items.map((child, i) => (
          <div
            key={i}
            data-stack-card
            className={`sticky overflow-hidden shadow-[0_12px_28px_-16px_rgba(0,0,0,0.28)] ${height} ${i === items.length - 1 ? '' : 'mb-6 md:mb-8'}`}
            style={{
              top: `calc(${cardBase} + ${i * 0.9}rem)`,
              zIndex: i + 1,
              transformOrigin: 'center top',
              willChange: 'transform, filter',
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Phones: the sideways run -----------------------------------------

function HorizontalRun({ items, title, reduced }: {
  items: ReactNode[]; title?: string; reduced: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const geometry = useRef({ range: 0, budget: 1, top: 0 });
  const progress = useRef(0);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!wrap || !sticky || !track || reduced) return;
    const range = Math.max(0, track.scrollWidth - sticky.clientWidth);
    geometry.current.range = range;
    geometry.current.budget = Math.max(1, range * PACE);
    // The block of page the section owns: one screen to stand in, plus the
    // travel it needs. Once that is spent the page resumes as normal.
    wrap.style.height = `${sticky.offsetHeight + geometry.current.budget}px`;
    geometry.current.top = wrap.getBoundingClientRect().top + window.scrollY;
  }, [reduced]);

  const paint = useCallback(() => {
    const track = trackRef.current;
    if (!track || reduced) return;
    const { range, budget, top } = geometry.current;
    const p = Math.max(0, Math.min(1, (window.scrollY - top) / budget));
    progress.current = p;
    track.style.transform = `translate3d(${-p * range}px,0,0)`;
    setActive(Math.round(p * Math.max(1, items.length - 1)));
  }, [items.length, reduced]);

  useEffect(() => {
    if (reduced) return;
    measure();
    paint();
    let scrollFrame = 0;
    let resizeFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; paint(); });
    };
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; measure(); paint(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const unbind = wrapRef.current
      ? bindPinnedScroll(wrapRef.current, { progress: () => progress.current, enabled: () => true })
      : undefined;
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      unbind?.();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    };
  }, [measure, paint, reduced]);

  if (reduced) {
    return (
      <div className="container">
        {title && (
          <h2 className="font-serif text-heading pb-3 mb-6 border-b border-separator text-accent">{title}</h2>
        )}
        <div className="flex flex-col gap-6">
          {items.map((child, i) => (
            <div key={i} className="overflow-hidden aspect-[9/16]">{child}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dstack-wrap" ref={wrapRef}>
      <div className="dstack-sticky" ref={stickyRef}>
        {title && <h2 className="dstack-h2 font-serif text-heading text-accent">{title}</h2>}
        <div className="dstack-track" ref={trackRef}>
          {items.map((child, i) => (
            <div key={i} className="dstack-card">{child}</div>
          ))}
          <div className="dstack-tail" aria-hidden="true" />
        </div>
        <div className="dstack-dots" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className={`dstack-dot${i === active ? ' is-on' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
