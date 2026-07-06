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
  /** Card height. */
  cardClassName?: string;
}

export default function ScrollStack({ children, cardClassName }: Props) {
  const items = Children.toArray(children);
  const height = cardClassName ?? 'h-[62vh] max-h-[520px] min-h-[360px]';

  return (
    <div className="container">
      <div className="relative">
        {items.map((child, i) => (
          <div
            key={i}
            className={`sticky overflow-hidden shadow-2xl ${height} ${i === items.length - 1 ? '' : 'mb-6 md:mb-8'}`}
            // Each card sticks a little lower than the previous one, leaving a
            // thin peek of the card behind it as they stack.
            style={{ top: `calc(5.5rem + ${i * 0.9}rem)`, zIndex: i + 1 }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
