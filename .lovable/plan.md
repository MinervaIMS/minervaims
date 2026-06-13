## Goal

On the homepage **Latest Reports** carousel (the `cards` variant in `ReportsSection.tsx`), make the rail extend to the full viewport width with a soft transparency fade on the left and right edges. The first card's resting position (at scroll start) and the last card's resting position (at scroll end) must remain visually identical to today — only the *scroll travel* benefits from the extra width.

## Behaviour spec

- At `scrollLeft = 0`: first card sits exactly where it sits today (inside the current `.rwrap` gutter). No content visible to its left.
- As the user scrolls right: earlier cards slide past the left gutter into a fade zone, gradually becoming transparent before disappearing at the viewport edge. The rail uses the full page width for scrolling.
- At the right end: the last card stops at exactly the position it stops at today (inside the current right gutter). No empty space pulled in beyond it.
- While scrolling in the middle: both left and right edges show the fade. The right fade hides automatically once the user reaches the end; the left fade hides at the very start.
- Works on all viewports (mobile through desktop). No change to card sizes, gap, snap behaviour, dots, or any other content.

## Implementation (technical)

Single file touched for layout: **`src/index.css`** (rules for `.rrail-wrap` and `.v3-rail` in the V3 cards section, ~lines 277, 300–303). Optional tiny JS toggle in **`src/components/shared/ReportsSection.tsx`** `CardsVariant` to drop the fades at start/end.

1. **Break the rail out of `.rwrap` to full-bleed.** Inside `CardsVariant`, wrap only the rail (`.rrail-wrap` + `.v3-rail`) in a full-width container that escapes the centered `.rwrap` max-width using the standard full-bleed trick:
   ```css
   .v3-rail-bleed {
     width: 100vw;
     margin-left: calc(50% - 50vw);
     margin-right: calc(50% - 50vw);
   }
   ```
   The section heading and footer stay inside `.rwrap` (unchanged).

2. **Preserve current start/end positions** by adding horizontal padding to `.v3-rail` equal to the current `.rwrap` gutter, plus the same `scroll-padding-inline-start` so snap still aligns the first card at the gutter:
   ```css
   .v3-rail {
     padding-inline: max(clamp(1rem,4vw,1.5rem), calc((100vw - 1280px) / 2 + clamp(1rem,4vw,1.5rem)));
     scroll-padding-inline-start: max(clamp(1rem,4vw,1.5rem), calc((100vw - 1280px) / 2 + clamp(1rem,4vw,1.5rem)));
   }
   ```
   This ensures: at `scrollLeft = 0`, the first card lines up with where the old `.rwrap` content edge was; at max scroll, the last card stops at the symmetric right gutter.

3. **Edge transparency fade** via CSS mask on the bleed wrapper (mobile-safe, no JS required):
   ```css
   .v3-rail-bleed {
     -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
             mask-image: linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
     --fade: clamp(1rem, 4vw, 4rem);
   }
   ```
   Width of fade scales with viewport so it stays subtle on mobile and pronounced on desktop.

4. **Hide fade at the extremes** (so the start/end *feels* like a hard stop, not a fade-out of the first/last card sitting at rest):
   - Reuse the existing `onScroll` handler in `CardsVariant` to set two boolean state flags `atStart` / `atEnd` (with a small tolerance, e.g. `<= 2px`).
   - Apply `data-at-start` / `data-at-end` attributes on the bleed wrapper.
   - CSS toggles the gradient stops:
     ```css
     .v3-rail-bleed[data-at-start="true"] { /* drop left transparent stop */ }
     .v3-rail-bleed[data-at-end="true"]   { /* drop right transparent stop */ }
     ```
     Implemented by swapping the `mask-image` to a one-sided gradient when at start or at end (and to no mask when both).

5. **No changes to**: dots, pagination logic, card markup, hover effects, `useRealCover`, the navy variant, or any other carousel on the site. Only the V3 cards rail used by the homepage Latest Reports section is affected.

## Files to edit

- `src/index.css` — add `.v3-rail-bleed` rules, tweak `.v3-rail` padding/scroll-padding (only the cards-variant rail).
- `src/components/shared/ReportsSection.tsx` — wrap the existing `.rrail-wrap` of `CardsVariant` in a `<div className="v3-rail-bleed" data-at-start data-at-end>`; extend `update()` to also set `atStart`/`atEnd`.

## Out of scope

- Reveal fade-ins (already removed).
- Application Journey (already addressed).
- Other carousels (`DivisionArchiveCarousel`, `FundArchiveCarousel`, `LatestArchiveCarousel`) — not requested.
