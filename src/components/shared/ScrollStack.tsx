import { Children, ReactNode } from 'react';

// =====================================================================
// ScrollStack — a smooth, scroll-driven stack of cards. Each card sticks
// near the top as you scroll and the next one slides up over it. The effect
// is pure CSS (position: sticky), so it is buttery on every device with no
// scroll listeners. Cards are constrained to the site content width.
//
// The heading stays in sight for the whole run of the stack, so the reader
// always knows which section the cards belong to. Two details make that
// work without the artefact seen in earlier attempts, where the pinned
// title visibly sat on top of the last card as it left:
//
//   · the cards stick BELOW the pinned heading, never underneath it, so
//     during the stacking phase the two never occupy the same pixels;
//   · the heading is painted BEHIND the cards (z-index 0 against the
//     cards' 1..n). At the end of the section the last card rides up over
//     the heading, which reads as the card leaving rather than the title
//     covering it.
//
// Because heading and cards share one sticky container, they also release
// together: the section holds until every division has been shown, then
// the whole block scrolls away as one.
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
  // Cards stick just under the fixed navbar, plus the pinned heading's own
  // height when there is one, so a card's top edge stops at the heading's
  // baseline rule instead of sliding beneath it.
  const navbar = '5.5rem';
  const headingBlock = title ? '4.75rem' : '0rem';
  const cardBase = `calc(${navbar} + ${headingBlock})`;

  return (
    <div className="container">
      <div className="relative">
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
