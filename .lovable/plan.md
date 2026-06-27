## Plan

### Problem
Section spacing is inconsistent on division and fund pages because the second section uses a conditional `pb-0` override. This collapses the gap between sections 2 and 3, making it smaller than the gap between sections 3 and the final Reports section.

### Where the overrides are
- `src/pages/DivisionDetail.tsx` line 156 — `pb-0 md:pb-0` when `isPortfolio`
- `src/pages/FundDetail.tsx` line 132 — `pb-0 md:pb-0` when fund is `long-short` or `multi-asset`

### Fix
1. **Remove both `pb-0` overrides** so every section uses its full `py-section-sm md:py-section` padding.
2. **Increase the global section spacing values** in `tailwind.config.ts` to add more breathing room:
   - `section-sm`: `4rem` -> `5rem`
   - `section`: `6rem` -> `8rem`
3. **Update ReportsSection CSS** in `src/index.css` to keep its padding in sync with the new Tailwind values:
   - `.rsec--light` and `.rsec--navy` padding: `clamp(3rem, 7vw, 6rem)` -> `clamp(3.5rem, 7.5vw, 8rem)`

This makes the vertical rhythm identical on every division and fund page, and gives all sections more breathing room without touching any other pages beyond the shared spacing tokens.

### Files to change
- `src/pages/DivisionDetail.tsx`
- `src/pages/FundDetail.tsx`
- `tailwind.config.ts`
- `src/index.css`