# Fix quotation-mark rendering in "Demanding by design"

The decorative `"` watermark is positioned at `-top-12 -left-6` on a full-bleed (`w-screen`) panel, so on desktop it clips off the viewport's left edge and visually leaks into the cream margin outside the grey band (see screenshot). On mobile/tablet it also collides with the heading and sits awkwardly.

## Change (single edit in `src/pages/Join.tsx`, lines 442–467)

Reposition the watermark so it always lives **inside** the grey panel, scales with viewport, and never clips:

- Keep the section full-bleed and `overflow-hidden` on the inner panel (already there) — this guarantees no horizontal scroll even if the glyph ever overflows.
- Replace `-top-12 -left-6` with responsive insets that sit just inside the panel's content edge at every breakpoint:
  - Mobile: `top-2 left-3`
  - `md:top-4 md:left-6`
  - `lg:top-6 lg:left-10`
- Tighten the responsive font size so the glyph reads as a true pull-quote mark instead of a giant blob on small screens:
  - `fontSize: "clamp(6rem, 18vw, 18rem)"` (down from `clamp(12rem, 22vw, 22rem)`)
- Add `aria-hidden` is already present; also add `hidden sm:block` is NOT used — keep glyph visible on mobile too but at the smaller clamp floor (6rem) so it stays decorative rather than overwhelming.
- Bump the text container's top padding on mobile (`py-12` → `pt-16 md:pt-16 pb-12 md:pb-16`) so the heading clears the watermark on narrow viewports.

No copy, color, font, or other layout changes. Watermark color stays `hsl(var(--accent) / 0.06)`.

## Verification

- Desktop (1700px): watermark hangs above the heading inside the grey panel, no clipping at viewport edge.
- Tablet (~820px): watermark sits in the top-left of the panel, scaled down, heading clears it.
- Mobile (~390px): watermark renders as a small decorative `"` in the corner, no overlap with body copy, no horizontal scroll.
