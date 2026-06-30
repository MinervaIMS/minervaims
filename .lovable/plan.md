# Homepage Division ScrollStack

Add a window-scroll ScrollStack section to `src/pages/Index.tsx`, placed immediately after the "Our Alumni Stand at the Forefront of Global Markets and Academia" block (the `<AlumniTicker />`) and before `<TestimonialsSection />`. Five cards, one per division, each using its division-page background image with a left-to-right dark gradient, division name top-left, About-page description, and a CTA to the division page bottom-right.

## What gets built

1. **Install dependency**
   - `bun add lenis`

2. **New component `src/components/shared/ScrollStack.tsx`**
   - Port the provided React Bits component to TSX with proper types.
   - Square edges (no `border-radius`) to match site aesthetic — override the library's 40px.
   - Cards rendered as `<article>` with `position: relative` so we can layer background image + gradient + content absolutely.
   - Default props tuned for 5 cards: `useWindowScroll`, `itemDistance≈80`, `itemScale=0.03`, `itemStackDistance=40`, `baseScale=0.9`.

3. **New component `src/components/shared/DivisionScrollStack.tsx`**
   - Wraps `ScrollStack` with the 5 division cards.
   - Each card layout:
     - Full-bleed `<img>` background (the existing `MIMS_Equity_Research`, `MIMS_Investment_Research`, `MIMS_Macro_Research`, `MIMS_Portfolio_Management`, `MIMS_Quant_Research` webp assets already in `src/assets/`).
     - Overlay: `bg-gradient-to-r from-black/75 via-black/45 to-transparent` (darker left → no shade right).
     - Top-left: `<h3>` serif division name (Times New Roman, white, generous padding `p-10 md:p-14`).
     - Below name: short description (reused from About `divisionData`) in white/85, max-width ~50%.
     - Bottom-right: `cta-link`-style `<Link>` "Visit division →" pointing to `/divisions/{division}`.
   - Card height ~70vh so background imagery reads on desktop; min-height for mobile.

4. **Edit `src/pages/Index.tsx`**
   - Import `DivisionScrollStack`.
   - Insert a new `<section className="bg-background">` between `<AlumniTicker />` and `<TestimonialsSection />` containing an h2 ("Our Divisions" with the standard heading styling — serif, `text-heading`, `mb-6 pb-3 border-b border-separator text-accent`) inside `container`, then the `<DivisionScrollStack />` rendered full-width below.

## Technical details

- Window-scroll mode: the ScrollStack uses `window.scrollY`; no inner fixed-height wrapper is needed. Cards naturally pin as the user scrolls past the section.
- The component's CSS (`scroll-stack-inner { padding: 20vh 5rem 50rem }`) is what gives the pin its runway — we keep that but reduce horizontal padding on mobile via Tailwind responsive overrides.
- Division → asset mapping reuses already-imported `MIMS_*` webp `.asset.json` files in `src/assets/` (same ones the division detail pages use), so no new images are added.
- Descriptions are copied verbatim from `divisionData` in `src/pages/About.tsx` to keep wording consistent (and the user already approved them on About).
- No animations elsewhere on the page change; this respects the project's "no animations except /join" rule only as a *targeted* exception — flagging here because the homepage currently has none. If you'd rather skip this exception, say so and I'll use a static stacked-cards layout instead.
- Accessibility: each card is a single `<article>` with the CTA `<Link>` as the only interactive element; alt text on the background `<img>` describes the division.

## Out of scope

- No changes to division pages, About, or any data.
- No new images generated — reusing existing assets.
- No edits to `index.css` beyond the component's scoped CSS file.
