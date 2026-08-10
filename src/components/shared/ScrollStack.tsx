import { Children, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { bindPinnedScroll } from '@/lib/pinned-scroll';

// =====================================================================
// ScrollStack — the scroll-driven presentation of "Our Divisions".
// ---------------------------------------------------------------------
// One reading at every width: a sideways run. Vertical scrolling is
// converted into horizontal travel across the five 9:16 cards,
// deliberately slowed, and only once the last card has been reached does
// the page carry on downwards. The section claims a tall block of scroll
// (its horizontal overflow times PACE) and pins itself inside it, so the
// browser's own scrolling drives everything: no wheel hijacking, no
// preventDefault, and a flick still behaves like a flick.
//
// Phones keep the dot indicators in a row under the rail; wide screens
// carry them as a column on the right, along the cards' long side.
//
// Under reduced motion it falls back to a plain, fully visible list:
// nothing in the content depends on the animation.
// =====================================================================

/** How much slower the sideways run is than ordinary scrolling. */
const PACE = 1.8;

export function ScrollStackItem({ children }: { children: ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

interface Props {
  children: ReactNode;
  /** Heading pinned above the cards for the whole run of the section. */
  title?: string;
}


function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export default function ScrollStack({ children, title }: Props) {
  const items = Children.toArray(children);
  const reduced = useRef(prefersReducedMotion());

  // One reading at every width: the pinned sideways run. Wide screens size the
  // 9:16 cards by height and carry the dot column on the right; phones keep the
  // horizontal dot row beneath the rail.
  return <HorizontalRun items={items} title={title} reduced={reduced.current} />;
}

// --- The sideways run -------------------------------------------------


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
