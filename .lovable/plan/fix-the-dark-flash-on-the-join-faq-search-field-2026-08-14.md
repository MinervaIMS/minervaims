# Fix the dark flash on the /join FAQ search field

## What happens

The FAQ search field on /join briefly shows a dark tint the moment it is clicked or tabbed into, then settles into its white state.

## Likely cause (to confirm first)

The field is the only `input type="search"` in the project and it carries `transition-all duration-200`. `transition-all` animates every animatable property, including the browser's own focus ring / outline colour and background, so the native focus styling that the field's `focus:outline-none` is meant to suppress becomes a visible 200ms fade in the browser's dark default colour instead of disappearing instantly. Safari on macOS is the engine that paints this ring on search inputs.

This diagnosis is not yet proven, so step 1 of the work is to confirm it before changing anything.

## Work

1. Reproduce in a headless browser: focus the field and capture element screenshots a few frames apart to see which property carries the dark colour (outline, box-shadow, or background).
2. Fix the confirmed property in `src/components/join/JoinFaq.tsx`:
   - Replace `transition-all duration-200` with a narrow `transition-colors` so only the border colour animates.
   - Keep focus visible and instant: explicit `outline-none` plus `focus:border-accent` (no transition on the ring), and an explicit background so no user-agent fill can appear mid-transition.
3. If the capture shows the colour comes from the user-agent search-field appearance rather than the transition, neutralise it in `src/index.css` alongside the existing `input[type='search']` rules (appearance and focus-ring reset scoped to search inputs) rather than adding a one-off style in the component.
4. Re-check with the same capture that focus now goes straight to the white field with a purple hairline, and that the clear button and typing behaviour are unchanged.

## Scope

Presentation only: `src/components/join/JoinFaq.tsx`, and `src/index.css` only if the reset belongs there. No changes to the FAQ data, search logic, or accordion behaviour.
