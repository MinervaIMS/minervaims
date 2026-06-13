## Problem

The decorative `"` watermark in the "Demanding by design" panel (`src/pages/Join.tsx`, lines 445–454) uses `clamp(10rem, 28vw, 28rem)` and sits flush at `top-0 left-0`. At narrow widths the glyph's left side-bearing pushes it past the panel edge (and on some breakpoints the glyph's height pushes the heading down too much), so it visually clips off-screen — exactly what the attached screenshot shows.

## Fix

Rework only the watermark span (lines 445–454). No copy, color, or panel layout changes.

1. **Tame the size curve** — replace `clamp(10rem, 28vw, 28rem)` with `clamp(7rem, 18vw, 18rem)`. This keeps it readable on desktop while preventing the glyph from outgrowing the panel on phones/tablets.
2. **Inset from the corner at every breakpoint** — replace `top-0 left-0 md:top-0 md:left-2 lg:top-0 lg:left-4` with `top-2 left-3 md:top-3 md:left-6 lg:top-4 lg:left-10`. The small inset accounts for the serif glyph's side-bearing so the visible mark sits inside the grey panel rather than hugging the very edge.
3. **Prevent any residual overflow** — add `max-w-full overflow-hidden` semantics via inline style `maxWidth: '100%'` is unnecessary since the parent already has `overflow-hidden`; instead add `whitespace-nowrap` and rely on the parent clip. (No change to parent needed — `bg-secondary relative overflow-hidden` already handles edge clipping.)
4. **Heading clearance** — keep container padding at `pt-16 md:pt-16 pb-12 md:pb-16`; with the smaller glyph this remains sufficient at all breakpoints.

## Verification

- Mobile 390px: glyph ~70px tall, sits at top-left inside grey panel, heading clears it.
- Tablet 820px: glyph ~148px, inset 6px from left, no overlap with heading.
- Desktop 1440px+: glyph caps at 18rem (288px), inset 40px from left, reads as a true pull-quote watermark.
- No horizontal scroll at any width.
