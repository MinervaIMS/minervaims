## Fixes for `ReportsSection` (navy variant)

### 1. Align the "Recently published" cards (desktop strip)

Symptom: the 5th card sits lower than the others because card titles wrap to a different number of lines and the PDF cover heights aren't strictly locked, so each card has a slightly different total height.

Changes in `src/index.css` (`.v2-card` / `.v2-strip-rail`):
- Make `.v2-card` a column flex container so its inner blocks align consistently across all 5 grid cells.
- Lock the cover to a fixed A4-style aspect ratio (`aspect-ratio: 1 / 1.414`) on `.v2-card .rcover` so every preview renders at the exact same height regardless of PDF page proportions.
- Give `.v2-card .t` a fixed `min-height` equal to 3 lines (matching the existing `-webkit-line-clamp:3`) so the title block reserves the same vertical space whether the title is 1, 2 or 3 lines.
- Keep grid `repeat(5, 1fr)` on desktop; behaviour on tablet/mobile (snap rail + dots) stays unchanged.

Result: covers line up at the same top and bottom edge; titles line up at the same baseline; the last card stops being visually offset.

### 2. Fix the "Read more" bug on desktop (featured report)

Symptom (second screenshot): when the user expands the description, the extra text overflows out of the bounded info column and overlaps the "Open report" / "Browse the archive" buttons, and "Read less" appears far below the cover.

Root cause: `FeaturedInfo` pins the info column's `height` / `min-height` / `max-height` to the cover's height (so the description can be clamped and Read more can trigger). When the user expands, the wrapper switches to `overflow:visible` but the column stays capped at the cover's height, so the expanded text and the bottom-pinned actions render on top of each other.

Changes in `src/components/shared/ReportsSection.tsx` (`FeaturedInfo` component only):
- Make the height-syncing effect depend on `expanded`.
- When `expanded === true` on desktop, clear all inline height constraints (`height`, `minHeight`, `maxHeight`) so the info column grows naturally to fit the full description, and the actions row (which uses `margin-top:auto`) is pushed below it.
- When `expanded === false`, keep the current behaviour (height matches the cover so Read more correctly clamps and the buttons align with the bottom of the cover).
- No change to mobile behaviour (5-line CSS clamp + Read more) and no change to the lightbox variant logic beyond inheriting the same `FeaturedInfo` fix.

### Scope

- Files touched: `src/index.css`, `src/components/shared/ReportsSection.tsx`.
- Variants affected: navy variant on `/funds/multi-asset`, `/funds/long-short`, plus the same component when rendered inside the preview lightbox.
- No data, routing, or business-logic changes.
