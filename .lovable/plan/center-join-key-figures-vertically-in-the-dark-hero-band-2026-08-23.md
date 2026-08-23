# Center /join key figures vertically in the dark hero band

## Goal
Fix the layout so the three key figures (80+, 160+, 310+) are vertically centered in the remaining dark space between the subtitle and the start of the white section, rather than sitting at the top of that space.

## Current state
- `src/components/join/JoinHeroStage.tsx` uses `flex flex-col` on the hero and a `flex-1 items-center justify-center` wrapper around the figures.
- The hero has no explicit height; it is sized only by its content plus bottom padding. Because the parent has no definite height, the `flex-1` wrapper cannot expand to fill and center the figures.
- The result is the figures sit immediately under the subtitle with empty black space below them.

## Changes
1. Give the dark hero band a minimum height (e.g., `min-h-[60svh] md:min-h-[70svh]`) so the flex layout has real vertical space to distribute.
2. Keep the existing `flex-1` figures wrapper so it fills the space between the subtitle and the bottom of the dark band and centers the figures within it.
3. Reduce the container's bottom padding if needed so the figures center in the visible dark area rather than being pushed up by excessive padding.
4. Run TypeScript typecheck.

## Files
- `src/components/join/JoinHeroStage.tsx`

## Verification
- `bunx tsc --noEmit -p tsconfig.app.json` passes.
- Visual check in preview: figures appear centered in the dark band between the subtitle and the white section.