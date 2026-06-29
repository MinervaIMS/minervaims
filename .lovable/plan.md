## Why this happens

Every section title across the site uses the same Tailwind pattern:

```
font-serif text-xl sm:text-heading ...
```

- `text-xl` = **1.25rem (20px)** → applied below 640px (mobile)
- `text-heading` = **2rem (32px)** → applied from `sm:` (≥640px) upward

So on a 390px viewport, section `<h2>` titles render at **20px**. The "secondary" labels inside those sections use `text-lg md:text-xl` → **18–20px**. The two end up visually identical, and the hierarchy collapses. This is exactly what happens to "Engagement Framework" vs. the row labels ("Topic", terms, etc.) in `src/pages/Partnerships.tsx` (line 208 vs. 221).

The pattern is duplicated in **22 places** across 11 page files (Team, Readings, Alumni, Archive, FundDetail, DivisionDetail, Join, Contacts, Partnerships, Events, …). Each file repeats the same `text-xl sm:text-heading` string, so the problem is structural, not a single-page mistake.

There is already a single source of truth defined in `src/index.css`:

```css
.section-heading { @apply font-serif text-heading mb-6 pb-3 border-b border-separator text-accent; }
```

…but nearly no page uses it; they re-implement the heading inline and add the mobile shrink.

## Fix

Two coordinated changes so section titles stay clearly larger than sub-labels on every screen, and the rule lives in one place going forward.

### 1. Make `text-heading` intrinsically responsive (one place)

In `tailwind.config.ts`, replace the fixed value:

```ts
// before
'heading': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
// after
'heading': ['clamp(1.625rem, 4.5vw + 0.5rem, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
```

Result: section titles render at ~**26px on a 390px mobile**, scale smoothly, and cap at **32px on desktop** (current desktop look is preserved). No HTML changes needed for the size to recover.

### 2. Drop the `text-xl sm:` mobile override on section `<h2>`s

Across the 22 occurrences, remove `text-xl sm:` so the heading uses `text-heading` at every breakpoint. Two equivalent shapes depending on the site convention you prefer:

- **Minimal diff:** replace `font-serif text-xl sm:text-heading` → `font-serif text-heading` on each `<h2>` (keeps the rest of the className intact).
- **Cleaner / future-proof:** where the full pattern matches `font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent`, replace the whole className with the existing `section-heading` utility from `src/index.css`. This guarantees future titles can't drift again.

Special cases to handle while editing:
- `src/pages/Partnerships.tsx:182` — title sits on a dark background and uses `text-background`. Keep that color; only drop the size override.
- `src/pages/Readings.tsx:117,150` — currently use `text-lg sm:text-xl md:text-heading` (even smaller on mobile). Normalize these to `text-heading` as well.
- `src/pages/Alumni.tsx:306` — this is an `<h3>` subsection title. Keep it visually smaller than the section `<h2>`s, e.g. `text-2xl` on mobile, `text-heading` from `sm:` — or leave it as-is, since the `<h2>`s above it will now be larger and hierarchy is restored.

### 3. Verify

- On 390×844, "Engagement Framework" should render noticeably larger than the row topic labels ("Engagement Topic", "Terms", etc.).
- Spot-check Team, Join FAQs, Contacts, Archive, Events list — all section titles should look the same size as each other and clearly dominate sub-labels.
- Desktop view should be unchanged (cap at 2rem / 32px).

## Files touched

- `tailwind.config.ts` — update the `heading` font-size token to `clamp(...)`.
- 11 page files under `src/pages/` — strip the `text-xl sm:` (and `text-lg sm:text-xl md:`) mobile overrides on section `<h2>`s; optionally swap matching ones to the `.section-heading` class.

No business logic, data, or component-API changes.
