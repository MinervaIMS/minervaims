# Homepage "Our Divisions" — desktop gets the sideways 9:16 rail

Today the homepage section behaves differently by width: phones already get the pinned sideways run with dot indicators, while wide screens get the stacked deck of wide cards. The desktop reading will be replaced by the same pinned sideways run, with cards in 9:16 and the dot indicators moved to a vertical column on the right of the rail.

## What changes

- **One behaviour at every width.** Desktop uses the pinned sideways run: the section holds a tall block of page, sticks to the viewport, and scrolling moves the five division cards horizontally until the last one is reached, then the page continues. The deck-of-cards stacking is retired.
- **Cards become 9:16 on desktop**, sized by height so several are in play at once without overflowing vertically (the same approach as the /join rail), with the first card opening on the page's left content boundary.
- **Card content is unchanged**: existing background photo, division title, description and the "Visit Division" link, re-laid out to fit the taller, narrower card.
- **Dots move to the right side**, stacked vertically and centred against the card height on desktop; they stay clickable (jump to a division) and keep tracking the active card. On phones they stay exactly where they are now, horizontal under the rail.
- **Reduced motion / low-power** keeps the current fallback: a plain, fully visible list of cards, no pinning.

## Technical notes

- `src/components/shared/ScrollStack.tsx`: drop the `Deck` branch for the divisions usage and route all widths through the pinned `HorizontalRun`, generalising it beyond the phone breakpoint (card sizing driven by height on wide screens, per-card gap and gutter matched to the page container). Scroll bridging keeps using `bindPinnedScroll` from `src/lib/pinned-scroll.ts`.
- `src/index.css` (`.dstack-*` block): add wide-screen rules — card sized `height`-first with `aspect-ratio: 9 / 16`, and a `.dstack-dots` variant that switches to a vertical column pinned to the right of the sticky stage (flex row wrapper: rail then dots). Dot appearance still comes from the shared `.mdot/.dstack-dot` rule, with the active lozenge growing in height instead of width when vertical.
- `src/components/shared/DivisionScrollStack.tsx`: adjust the card inner layout for the narrower 9:16 frame (padding, title/description scale, the "Visit Division" link anchored at the bottom).
- No data, backend or content changes; `/join`'s own rail (`DivisionVideoRail`) is untouched.

## Verification

- Desktop 1440px and 1280px: cards read as 9:16, sideways travel tracks scrolling, dots run vertically on the right and highlight the active card; clicking a dot jumps to it.
- Phone 392px: unchanged from today.
- Reduced motion: plain list, no pinned block.
