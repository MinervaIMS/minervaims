# Our Divisions on phones: same stack animation as desktop, 9:16 cards, dots on the right

## What changes

On the homepage, the "Our Divisions" section currently has two different behaviours:

- Desktop: the five cards stack — each one sticks under the pinned heading and the next rides up over it, settling the one behind a step back with a little less light.
- Phones: a sideways run — vertical scrolling is converted into horizontal travel across the five cards, with a row of scrolling dots underneath.

After this change, phones use the same stacking animation as desktop. The differences on phones:

- Each card is 9:16 (portrait), sized to fit the phone viewport under the header and heading.
- The scrolling dots are kept, but move to a vertical rail running down the right-hand long side of the card, tracking which card is currently on top.
- The horizontal sideways run is retired for this section (no more sideways gesture bridge here).

Reduced-motion readers keep the plain, fully visible list of cards.

## Details

- `src/components/shared/ScrollStack.tsx`
  - Drop the phone-only `HorizontalRun` branch and render the deck at every width, keeping the reduced-motion list fallback.
  - Card sizing becomes responsive: on narrow screens the card is a 9:16 portrait capped to the available viewport height (viewport minus header and heading block); on wide screens the current landscape height is unchanged.
  - Extend the existing rAF paint pass to also derive the active card index (the topmost card not yet covered) and expose it for the dot rail. No new scroll listeners.
  - Render a vertical dot rail on narrow screens only, absolutely positioned against the right edge of the stack, vertically centred, one dot per card, active dot highlighted — same dot styling tokens already used elsewhere (`.dstack-dot` / shared dot rule), just laid out in a column.
  - Dots are decorative and mirror scroll position (`aria-hidden`), matching the current behaviour.

- `src/index.css`
  - Add a vertical-layout modifier for the dot rail (column direction, right-side placement, small gap) reusing the shared dot appearance rule so no colours or sizes are duplicated.
  - Remove the now-unused `.dstack-*` horizontal-run rules for this section, and its comment block.

- `src/components/shared/DivisionScrollStack.tsx`
  - Padding and type scale inside the card tightened at the small breakpoint so the title, paragraph and "Visit Division" button all breathe inside a 9:16 frame, and add right-side room so the text never sits under the dot rail. Content and copy unchanged.

- `src/lib/pinned-scroll.ts` stays as is — it is still used by `/join` and the history timeline.

## Verification

Check the section at 390x844 and at 1280 wide: cards stack correctly at both, phone cards read as 9:16, the dot rail sits on the right long side and advances as each card arrives, and the page resumes normally after the last card.
