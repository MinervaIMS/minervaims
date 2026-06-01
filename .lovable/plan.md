## Goal

Reproduce the handoff's `legal-system.css` editorial layout 1:1 across all 5 legal/technical pages, keeping only the site Header, Footer, and existing English legal copy.

## What changes

### 1. Scoped CSS — `src/styles/legal-system.css` (new)
Port `legal-system.css` verbatim, scoped under `.legal-doc`. Imported once in `src/index.css`. This brings in the exact:
- Hero: `.lp-hero` 60/72 padding, `.lp-title` 58px Times New Roman navy, `.lp-intro` 19px muted, `.lp-eyebrow`, `.lp-meta` hairline strip with Last updated / Effective date.
- Body grid: `.lp-body` `248px 1fr` with 72px gutter.
- Sticky numbered TOC: `.lp-toc` `position:sticky; top:32px`, 2px left rail per item, navy active state, "On this page" eyebrow, optional progress bar.
- Mobile collapsible TOC: `<details class="lp-toc-collapse">`.
- Sections: `.lp-section` `56px 1fr` grid with serif numeral `.lp-num` in muted lavender `#AFA2D2` on the left margin, `.lp-h2` 27px navy, hairline separators between sections.
- Lists with square lavender bullets, inline navy underlined links, `.lp-callout` block (navy left border).
- Back-to-top button `.lp-backtop`.
- Related pages strip `.lp-related` on grey, with hover slide.
- Statute-only language toggle `.lp-lang` (EN/IT segmented control).
- Responsive: `.vp-tablet` (no sticky TOC, collapsible appears) and `.vp-mobile` (stacked, 32px title, logo behind heading).

### 2. Rewritten `LegalLayout.tsx`
Match `legal-render.js` markup exactly:
- `<article class="legal-doc vp-desktop|vp-tablet|vp-mobile">` chosen via `useIsDesktop` / `useIsMobile`.
- `<header class="lp-hero">` with title + intro + logo image (existing footer-logo.svg, faded) + `.lp-meta` strip rendering Last updated / Effective date.
- `.lp-body` with sticky `.lp-toc` (numbered `01`, `02`…, active scroll-spy via IntersectionObserver, navy active rail) AND a parallel `<details class="lp-toc-collapse">` shown only on tablet/mobile.
- `.lp-content` rendering children as `.lp-section` blocks.
- `.lp-backtop-row` with working Back-to-top button.
- Optional `toolbar` slot (used by Cookie Policy for "Manage preferences").
- Optional `languageToggle` slot (used by Statute for EN/IT switch).
- No background image. No `PageIntroduction`. No `PageLoader`.

### 3. Rewritten `LegalSectionBlock`
Renders the exact `.lp-section` structure: `.lp-num` numeral column + `.lp-h2-wrap` containing `.lp-h2` (with hover `#` anchor) and body content. Hairline separator between sections handled by CSS sibling selector.

### 4. Page updates (existing English copy preserved)
- `PrivacyPolicy.tsx`, `TermsOfUse.tsx`, `CookiePolicy.tsx`, `Disclaimer.tsx`, `Statute.tsx`: remove `backgroundImage` props, supply `effectiveDate` alongside `lastUpdated`, keep current section text unchanged.
- `Statute.tsx`: add EN/IT segmented language toggle via new `languageToggle` slot. Italian translations come from the handoff `legal-content.js` (sectionsIt). English copy on the page remains the current placeholder under-revision text unless you'd rather adopt the handoff's English statute copy — confirmed earlier you want to keep existing text content.
- `CookiePolicy.tsx`: "Manage Cookie Preferences" rendered via `toolbar` slot using `.mims-btn-outline` styling.

### 5. Header offset
Sticky TOC `top` value bumped from 32px to clear the existing site `Header` (≈96px) so it sits below the navbar, matching the handoff's visual intent within our shell.

## Files touched
- **new:** `src/styles/legal-system.css`
- **edit:** `src/index.css` (one `@import`)
- **rewrite:** `src/components/shared/LegalLayout.tsx`
- **edit:** `src/pages/PrivacyPolicy.tsx`, `TermsOfUse.tsx`, `CookiePolicy.tsx`, `Disclaimer.tsx`, `Statute.tsx`

## Assumptions / open questions

1. **Logo asset** — handoff uses `assets/logo-full-color.png`. I'll use the existing `src/assets/footer-logo.svg` at 50% opacity as the faded hero logo (closest equivalent already in the project).
2. **English copy** — kept as currently shipped on each page (per your earlier instruction "the only thing to keep is text content"). The handoff's `legal-content.js` is used only as the source for Italian Statute translations and for the `effective date` values where you haven't already set one.
3. **Related pages strip & prev/next** — handoff includes them but they navigate via in-page anchors in the demo. I'll wire them to real routes (`/privacy-policy`, `/terms-of-use`, etc.). Tell me if you'd rather omit the related-pages strip.
4. **Reading time** — handoff exposes it on a component variant but not on the main page meta strip; I'll omit it from the meta strip to match the rendered handoff exactly.
