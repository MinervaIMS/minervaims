## Goal

Replace the static London-skyline photo behind the "Join Minerva" hero on `/join` with the interactive dot-field animation from the uploaded preview.

## What already exists

`src/components/shared/DotField.tsx` is already the exact component from the uploaded module — same defaults (dotRadius 1, dotSpacing 17, cursorRadius 500, bulgeOnly, bulgeStrength 10, gradient `#7E5BC2` → `#B0A2DA`). No new component is needed; the uploaded files match it. Only difference in the preview: `glowRadius: 0` (no cursor glow) — I'll match the preview and pass `glowRadius={0}`.

## Changes (src/pages/Join.tsx only)

1. In the `data-page-hero` block, drop the `backgroundImage` div and the `hero-overlay` div; render instead a black-filled container (`#000`) with `<DotField glowRadius={0} />` absolutely filling it, behind the existing `PageIntroduction` (which already runs in `transparentBackground` mode).
2. Give the hero a defined height so the canvas has a box to size against (it already gets one from `PageIntroduction`'s `min-h-[320px] md:min-h-[380px]`).
3. Keep the heading/description in white — unchanged, already `text-background`.

## Left untouched

- The CTA band lower on the page still uses the London image at 30% opacity, so the asset stays in use. Say the word if you'd like that swapped too.
- The `useImagePreload([joinBg.url])` gate stays, since the image is still used further down.

## Notes

The animation is canvas-based and pointer-driven; it respects container resize and is passive on touch devices (dots simply sit still without a cursor).