## Changes

### 1. `src/components/shared/AlumniTicker.tsx`
- **Desktop dimensions**
  - Logo `maxWidth`: 400px → **650px**
  - `TickerBand` height: 152px → **114px** (−25% row spacing)
  - Logo `maxHeight`: 40px (unchanged), gap: 100px (unchanged)
- **Mobile (<768px) — all section dimensions at 50%**
  - Logo `maxHeight`: 40 → 20px
  - Logo `maxWidth`: 650 → 325px
  - Inter-logo `gap`: 100 → 50px
  - Band `height`: 114 → 57px
  - Edge-vignette fade zone scales naturally (percentage-based, no change needed)
  - Title `paddingTop` and section `paddingBottom`: 24 → 12px
- Implement via a small `useIsMobile` hook (matchMedia `(max-width: 767px)`) so the inline-style values switch reactively. Speed math (`SECONDS_PER_LOGO`) is unchanged — perceived speed stays uniform on both breakpoints because the entire track scales proportionally.

### 2. `src/pages/Index.tsx`
- Remove the **"Companies Image"** section (the static `companiesImage` block, lines ~167–178 — this is the image the user attached, now superseded by the ticker).
- Remove the **"Our Divisions"** section (lines ~183–199).
- Clean up the now-unused `companiesImage` import and the `divisions` / `divisionLabels` imports if no longer referenced elsewhere in the file.

No other files affected. No backend, routing, or data changes.
