import { Children, ReactNode } from 'react';

// =====================================================================
// ScrollStack — a smooth, scroll-driven stack of cards. Each card sticks
// near the top as you scroll and the next one slides up over it. The effect
// is pure CSS (position: sticky), so it is buttery on every device with no
// scroll listeners. Cards are constrained to the site content width.
// =====================================================================

export function ScrollStackItem({ children }: { children: ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

interface Props {
  children: ReactNode;
  /** Optional heading that stays pinned above the stack while the cards scroll. */
  title?: string;
  /** Card height. */
  cardClassName?: string;
}

export default function ScrollStack({ children, title, cardClassName }: Props) {
  const items = Children.toArray(children);
  const height = cardClassName ?? 'h-[62vh] max-h-[520px] min-h-[360px]';

  return (
    <div className="container">
      {/* The title sticks just below the header so it remains visible the whole
          time the cards are stacking beneath it. */}
      {title && (
        <h2 className="font-serif text-heading mb-4 pb-3 border-b border-separator text-accent sticky top-[5.5rem] z-[60] bg-background">
          {title}
        </h2>
      )}
      <div className="relative">
        {items.map((child, i) => (
          <div
            key={i}
            className={`sticky overflow-hidden shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)] ${height} ${i === items.length - 1 ? '' : 'mb-6 md:mb-8'}`}
            // Each card sticks a little lower than the previous one (and below
            // the pinned title), leaving a thin peek of the card behind it.
            style={{ top: `calc(8.6rem + ${i * 0.9}rem)`, zIndex: i + 1 }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
