## Diagnosis

The dark purple wash is missing because the overlay was never actually placed on top of the hero images.

- `src/index.css` defines two utility classes — `.hero-overlay` and `.page-intro-overlay` — that point to the uploaded `dark-purple-overlay.webp` asset.
- **Nothing in the codebase uses those classes.** A grep for `hero-overlay` / `page-intro-overlay` across `src/pages` and `src/components` returns zero matches.
- Every page that renders a hero/background image does so with a single `bg-cover bg-center` div and then puts the text directly on top — no overlay layer in between:
  - `Index.tsx` (homepage hero)
  - `About.tsx`, `Alumni.tsx`, `Archive.tsx`, `Events.tsx`, `Join.tsx`, `Readings.tsx`, `Sitemap.tsx`, `Contacts.tsx`
  - `DivisionDetail.tsx`, `FundDetail.tsx`
- `components/shared/PageIntroduction.tsx` also renders the background image without any overlay element.

The older images appeared "shaded" only because the purple wash was baked into those specific source files. The newly uploaded `MIMS_*.webp` images are clean photos with no baked-in tint, so they look bright — exposing the fact that the overlay was never wired up in JSX.

## Fix

Add a single overlay `<div>` directly after every hero/background image div, sitting below the content (`z-10` content already exists, so the overlay just needs to sit between the image and the content with no extra z-index).

For full-screen homepage hero use `hero-overlay`; for shorter page headers use `page-intro-overlay` (they currently point to the same asset, but keeping the semantic split matches the existing CSS).

### Files to update

1. `src/components/shared/PageIntroduction.tsx` — inside the `!transparentBackground && backgroundImage` branch, add `<div className="absolute inset-0 page-intro-overlay" />` right after the background div. This single change covers About, Alumni, DivisionDetail, FundDetail, Readings, Team, Sitemap, Join, and any page that passes `backgroundImage` to `PageIntroduction`.

2. Pages that render their own background div (bypassing `PageIntroduction`) — add `<div className="absolute inset-0 hero-overlay" />` immediately after the existing `bg-cover bg-center` div:
   - `src/pages/Index.tsx` (line 75 — homepage hero)
   - `src/pages/About.tsx` (line 48)
   - `src/pages/Alumni.tsx` (line 144)
   - `src/pages/Archive.tsx` (line 222)
   - `src/pages/Events.tsx` (line 161)
   - `src/pages/Sitemap.tsx` (line 72)
   - `src/pages/Contacts.tsx` (line 22)
   - `src/pages/Join.tsx` (line 216 — main hero; line 231 is already an intentional `opacity-30` decorative band further down the page, leave it alone)
   - `src/pages/DivisionDetail.tsx` (line 144)
   - `src/pages/FundDetail.tsx` (line 120)
   - `src/pages/Readings.tsx` (line 102)

Some of these pages additionally use `PageIntroduction` further down — once (1) is applied, those secondary intros also get the overlay automatically.

### Result

Every hero and page-intro background photo across the site gets the fully opaque purple wash from `dark-purple-overlay.webp` on top, restoring the uniform shaded look while keeping the new `MIMS_*` source images untouched.
