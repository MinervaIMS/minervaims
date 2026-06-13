## Goal
On the homepage "Latest Reports" section, keep the existing horizontal scrolling and add a soft transparency fade on the left and right edges of the rail so cards visually dissolve into the background as they enter/exit the viewport. Must work on desktop and mobile.

## Findings
- The section is rendered by `ReportsSection` (variant `cards`) in `src/pages/Index.tsx` and uses the `.v3-rail` carousel inside `.rrail-wrap`.
- Horizontal scrolling is already implemented (`.v3-rail` has `overflow-x:auto`, scroll-snap, hidden scrollbars, drag/swipe works natively on touch). No JS or layout change needed for scrolling itself.
- There is currently no edge transparency. The cards sit on the section background (`hsl(var(--secondary-bg))` / light surface) and are simply clipped at the container edges.

## Change
Edit `src/index.css` only, scoped to the `.rrail-wrap` that wraps `.v3-rail` (the cards variant on the homepage).

1. Apply a CSS `mask-image` (with `-webkit-mask-image` for Safari) to `.rrail-wrap`:
   - `linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%)`
   - `--fade: clamp(16px, 4vw, 56px)` so the fade scales from phone to desktop.
2. Allow the mask to extend slightly past the container so the fade looks soft at the page gutter: add `margin-inline: calc(var(--fade) * -1)` and matching `padding-inline: var(--fade)` to `.rrail-wrap` (kept inside `.rwrap`, so it never causes horizontal page scroll). If this risks overflow on very narrow viewports, fall back to no negative margin under `@media (max-width: 480px)` — fade still works inside the container.
3. Keep the existing scroll behavior intact: do not change `.v3-rail` overflow, snap, or scrollbar rules. The mask is purely visual.
4. Leave the navy/other variant untouched (mask scoped via `.rsec--light .rrail-wrap` or a new modifier class to avoid affecting the navy section).

## Technical notes
- `mask-image` is supported in all current evergreen browsers and iOS Safari; `-webkit-mask-image` covers older Safari. Graceful degradation: no fade, scroll still works.
- No React/TSX changes required. No new dependencies.
- No impact on dots, arrows, card click/preview behavior, or the archive CTA card.

## Files touched
- `src/index.css` (rules near the existing `.rrail-wrap` / `.v3-rail` block, around lines 277 and 300).

## Verification
- Homepage `/` → Latest Reports: cards visibly fade to transparent at left and right edges; scrolling/swiping reveals more cards.
- Mobile width (≤480px): fade still present, no horizontal page scroll introduced.
- Navy reports section (e.g. division detail pages) unchanged.