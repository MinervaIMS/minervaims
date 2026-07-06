import { Children, ReactNode } from 'react';

// =====================================================================
// ScrollStack — a smooth, scroll-driven stack of cards. Each card sticks
// near the top as you scroll and the next one slides up over it. The effect
// is pure CSS (position: sticky), so it is buttery on every device with no
// scroll listeners. Cards are constrained to the site content width.
//
// An optional `title` stays pinned just beneath the site header while the
// cards scroll underneath it, so the section heading, its separator line and
// a little breathing space stay visible the whole time. The title sits at a
// low z-index so it always passes *below* the fixed navbar (z-50).
// =====================================================================

export function ScrollStackItem({ children }: { children: ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

interface Props {
  children: ReactNode;
  /** Optional heading pinned above the stack while the cards scroll. */
  title?: string;
  /** Card height. */
  cardClassName?: string;
}

export default function ScrollStack({ children, title, cardClassName }: Props) {
  const items = Children.toArray(children);
  const height = cardClassName ?? 'h-[62vh] max-h-[520px] min-h-[360px]';
  // When a pinned title is present, cards stop lower so the title, its
  // separator line and a gap remain visible above the first card.
  const cardBase = title ? '11.5rem' : '5.5rem';

  return (
    <div className="container">
      {title && (
        <h2 className="font-serif text-heading pb-3 mb-4 border-b border-separator text-accent sticky top-[88px] z-10 bg-background">
          {title}
        </h2>
      )}
      <div className="relative">
        {items.map((child, i) => (
          <div
            key={i}
            className={`sticky overflow-hidden shadow-[0_12px_28px_-16px_rgba(0,0,0,0.28)] ${height} ${i === items.length - 1 ? '' : 'mb-6 md:mb-8'}`}
            // Each card sticks a little lower than the previous one (and below
            // the pinned title), leaving a thin peek of the card behind it.
            style={{ top: `calc(${cardBase} + ${i * 0.9}rem)`, zIndex: i + 1 }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
