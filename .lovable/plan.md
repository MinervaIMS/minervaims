## Problem

In `src/components/shared/ScrollStack.tsx`, the "Our Divisions" heading and the stacked cards are siblings inside the same `.container`, both using `position: sticky`:

- Title: `top: 88px`
- Last card: `top: calc(11.5rem + (N-1) * 0.9rem)` ≈ 19–20rem

A sticky element unsticks when its containing block's bottom reaches `viewport_top + top`. Because the last card has a much larger `top` value than the title, the container's bottom crosses the card's release point **first**, so the last card slides up while the title stays pinned. The title only lets go much later when the container bottom finally reaches 88px. That's the "locked in place, then jumps at the end" glitch.

Same-parent geometry cannot fix this: any sticky child with a larger `top` will always release before one with a smaller `top`.

## Fix

Remove the sticky behaviour from the title inside `ScrollStack.tsx`. Render "Our Divisions" as a normal heading above the cards. It will scroll away naturally when the user starts scrolling through the stack, and each card sticks near the top of the viewport as before.

### Changes to `src/components/shared/ScrollStack.tsx`

1. Drop the `sticky top-[88px] z-10 bg-background` classes from the `<h2>` — keep it as a plain heading with the existing serif/border styling.
2. Since the title no longer occupies the pinned space, use the smaller card offset (`cardBase = '5.5rem'`) in every case, so cards stick just under the fixed navbar (which is `z-50` and already sits above them).
3. No changes to `DivisionScrollStack.tsx`, `About.tsx`, or the CSS file. The stacked-cards effect and section spacing stay identical; only the "Our Divisions" label stops pinning.

### Result

- The heading scrolls away with the first card, exactly like a normal section title.
- Each card sticks under the navbar and the next slides over it, unchanged.
- The last card and the section end together — no more delayed jump of the title.
