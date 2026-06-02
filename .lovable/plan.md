## Spacing audit: Divisions vs Funds pages

After reading `src/pages/DivisionDetail.tsx`, `src/pages/FundDetail.tsx`, `src/components/shared/ReportsSection.tsx` and the spacing tokens in `tailwind.config.ts` / `src/index.css`, the spacing is indeed inconsistent. Three concrete issues:

### What is wrong today

1. **Different vertical rhythm between the two pages.**
   - `DivisionDetail` → "Our Expertise" uses `py-10 md:py-14` (2.5 / 3.5 rem).
   - `FundDetail` → "Fund Overview" uses `py-section-sm md:py-section` (4 / 6 rem).
   The two pages share the same layout pattern (hero → intro text section → ReportsSection) but breathe very differently.

2. **Funds page: huge double gap between "Fund Overview" and "Performance Summary".**
   Both sections use the full `py-section-sm md:py-section`, so the gap between them stacks to **8 rem / 12 rem**. It looks like an empty band, especially on desktop.

3. **Portfolio Management division: collapsed gap between "Our Expertise" and "MIMS Virtual Portfolios".**
   The first section is overridden to `pb-6 md:pb-8` and the second to `pt-6 md:pt-8`, so the two headings sit much closer together than any other section pair in the project. Inconsistent with the standard rhythm.

The `ReportsSection` (navy block) is fine on its own — it already uses `clamp(3rem, 7vw, 6rem)` of vertical padding internally, so we only need to align the page-level sections to a comparable rhythm.

### Proposed fix

Standardize every "intro / narrative" section on both pages to the same token, and make stacked sections within the same page share padding so they don't double up.

1. **Adopt one shared section padding token for both pages**
   - Use `py-section-sm md:py-section` (4 / 6 rem) as the canonical section padding for: `Our Expertise`, `Fund Overview`, `Performance Summary`, and `MIMS Virtual Portfolios`.

2. **Funds page — avoid the doubled gap when Performance Summary follows Fund Overview**
   - Keep `Fund Overview` at full padding.
   - When `Performance Summary` is rendered (long-short, multi-asset), change `Fund Overview` to `pb-0` and `Performance Summary` to `pt-section-sm md:pt-section` only on its top (or simply give the two sections a shared `pt`/`pb` so total stacked spacing equals one section, not two).
   - Practical implementation: keep both sections at `py-section-sm md:py-section`, but when both are present collapse the inner gap by setting `pb-0` on the first and keeping `py` on the second — net visual gap = one section's worth of padding instead of two.

3. **Divisions page (Portfolio Management) — restore standard rhythm**
   - Remove the `pb-6 md:pb-8` / `pt-6 md:pt-8` overrides.
   - Apply the same collapsed-gap pattern as above so "Our Expertise" and "MIMS Virtual Portfolios" sit at the same vertical distance as "Fund Overview" → "Performance Summary" on the funds page.

4. **Keep the `ReportsSection` untouched.** Its internal `clamp(3rem,7vw,6rem)` padding already matches `section-sm`/`section` closely, so once the page sections use the same token, the transition into the navy block will feel consistent across both pages.

### Files to change

- `src/pages/DivisionDetail.tsx` — update padding on "Our Expertise" and "MIMS Virtual Portfolios" sections.
- `src/pages/FundDetail.tsx` — collapse the gap between "Fund Overview" and the two "Performance Summary" variants.

No backend, no token, no `ReportsSection` changes. Pure presentation alignment.
