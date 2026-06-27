
## Audit findings

The site uses a tight typography scale defined in `tailwind.config.ts`:

```text
heading      2rem      section H2
subheading   1.5rem    sub H3 / large lead
body-lg      1.125rem  primary paragraph
body         1rem      standard paragraph
small        0.875rem  meta / captions
xs          0.75rem    uppercase labels
```

Reference pages (Join, Events, Readings) consistently use these tokens plus `text-xl sm:text-heading` for section H2s, `text-body-lg` for intro paragraphs, and `text-xs` + uppercase tracking for eyebrow labels.

Contacts and Partnerships currently mix tokens with arbitrary values (`text-[1.75rem]`, `text-[1.6rem]`, `text-[1.05rem]`, `text-[.72rem]`, `text-[.7rem]`, `text-[15px]`), and several legibility issues. The Partnerships matrix is small (`text-sm` / `text-[.7rem]`) for what is the densest content on the page; the Contacts email feels oversized relative to neighbouring copy; the navy block on Partnerships uses an email two steps smaller than the same email on Contacts.

## Changes — Contacts.tsx

1. Email link `text-2xl md:text-[1.75rem]` → `text-2xl md:text-3xl` (token, ~1.875rem — still prominent but aligned with `text-3xl` used elsewhere on the site for headline links).
2. Remove the three leftover empty nodes from prior edits (uppercase label `<div>` with `"\n"`, helper `<p>` with `"\n"`, and the rotated arrow span with `"\n"`). They add phantom vertical space.
3. Sidebar "Meet the members" `<Link>` — add `text-sm tracking-wider uppercase` to match the standard button styling used across Events/Readings.
4. "Visit Partnerships" `<Link>` in the second section — same button standardization (`text-sm tracking-wider uppercase`).
5. Aside intro paragraph: keep `text-body-lg` (already matches left intro — good).
6. Confirm both eyebrow labels keep `font-body uppercase tracking-[.1em] text-xs text-muted-foreground` (already correct).

## Changes — Partnerships.tsx

1. Lead paragraph `text-2xl md:text-[1.6rem]` → `text-xl sm:text-2xl md:text-subheading` (1.5rem; matches the "lead/sub-hero" pattern used on Join).
2. Intro paragraph below it stays `text-body-lg` (correct).
3. Mobile format cards:
   - Card title `text-lg` → `text-subheading` (1.5rem — the matrix headers should not be smaller than body copy).
   - Eyebrow `text-[.72rem]` → `text-xs`.
   - Value `text-body` (1rem) stays.
4. Desktop comparison matrix:
   - Column header `text-[1.05rem]` → `text-lg` (1.125rem — readable, still snug).
   - Row label `text-[.7rem]` → `text-xs`.
   - Cell text `text-sm` → `text-small` (same 0.875rem but using the project token; keep `leading-relaxed`).
5. Navy "Establish a partnership" block:
   - Heading `text-xl sm:text-heading` stays.
   - Paragraph `text-base md:text-body-lg` → `text-body-lg` (consistent body-lg throughout the page).
   - "Write to" eyebrow `text-xs` stays.
   - Email `text-xl` → `text-2xl md:text-3xl` so it matches the Contacts page email exactly. (The email is the call-to-action; it should be the largest type in this block after the H2.)
6. Engagement framework section:
   - Intro paragraph `text-base` → `text-body-lg` (matches every other section intro on the site).
   - Topic column `text-base md:text-[1.05rem]` → `text-base md:text-lg` (token-aligned, same visual weight).
   - Terms column `text-[15px]` → `text-body` (1rem; loses the half-pixel quirk, gains consistency with body copy elsewhere).

## Out of scope

No layout, color, spacing, or component-structure changes. Strictly font-size/line-height token normalization and removal of leftover empty text nodes from earlier edits. Global components (Header, Footer, PageIntroduction, Layout) are not touched.

## Verification

After edits, run `tsgo` to confirm no type regressions, then visually verify Contacts and Partnerships at mobile (375px) and desktop (1280px) widths via Playwright screenshots to confirm hierarchy reads cleanly.
