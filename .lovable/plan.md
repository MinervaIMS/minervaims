## Goal

Clean up inconsistencies introduced by many iterative edits. Keep the current look (B&W minimal, #1F0F4D accent, EB Garamond serif headings, Calibri body), but make the implementation coherent, token-driven, and responsive — no redesign.

## Approach

Work in passes, each across the whole `src/` tree. After each pass, build + spot-check desktop / tablet / mobile in preview.

### Pass 1 — Token & theme audit (no visual change)

- Audit `src/index.css` + `tailwind.config.ts` to confirm the canonical tokens: `background`, `foreground`, `primary`, `accent`, `muted`, `secondary`, `separator`, `card`, `border`, plus the type scale (`hero`, `display`, `heading`, `subheading`, `body-lg`, `body`, `small`, `xs`).
- Document the intended roles in a short comment block at top of `index.css` so future edits stop drifting.
- Remove unused or duplicate CSS rules in `src/App.css` (Vite template leftovers like `.logo`, `.read-the-docs`, `#root` padding) that conflict with the real layout.

### Pass 2 — Color & font hardcodes → tokens

Replace hardcoded color and font usage with semantic tokens. Targets identified:

- `text-white` / `text-black` / `bg-white` / `bg-black` → `text-background`/`text-foreground`/`bg-background`/`bg-foreground`. Hotspots: `Alumni.tsx`, `Index.tsx`, `Archive.tsx`, `Readings.tsx`, `MinervaWorkspace.tsx`, `About.tsx`, `ActivityManagement.tsx`, `FileManagement.tsx`, cookie components, several shared carousels.
- Arbitrary `text-[…]`, `font-[…]`, `px-[…]`, `py-[…]`, `min-w-[…]` values across ~35 files → map to the scale (`text-hero|display|heading|subheading|body-lg|body|small|xs`) and to spacing tokens. Keep arbitrary values only where genuinely needed (e.g. `min-h-[320px]` hero, PdfThumbnail fixed 200px canvas — already memoised as required).
- `style={{ ... }}` inline styles: keep only where dynamic (background images, computed widths, PDF canvas). Move static ones into Tailwind classes.

### Pass 3 — Typography hierarchy & font roles

Enforce the memorised rule: serif (`font-serif`, EB Garamond / Times New Roman) for headings + buttons/labels styled as display; body (`font-body`, Calibri) for paragraphs and form text. Search-and-fix:

- Headings (`h1`–`h4`) missing `font-serif` or using `font-body`.
- Body paragraphs accidentally wearing `font-serif`.
- `font-bold` usage: replace with `font-medium` or `font-semibold` where the design calls for weight, not boldness. Headings should rely on the serif weight, not `font-bold`.
- Normalise section heading pattern to the memorised standard: `font-serif text-heading mb-6 pb-3 border-b border-separator text-accent`. Apply consistently on `Index`, `About`, `Alumni`, `Archive`, `Readings`, `Events`, `Join`, `Team`, `DivisionDetail`, `FundDetail`.
- Standardise `PageIntroduction` usage (currently the only hero pattern) so every page-level intro goes through it instead of bespoke headers.

### Pass 4 — Spacing, radius, borders, separators

- Section padding: standardise to `py-10 md:py-14` (content) and `py-20 md:py-28` (CTA blocks) — already the dominant pattern in `Index.tsx`. Apply across pages.
- Container: always use the Tailwind `container` from `tailwind.config.ts`, drop ad-hoc `max-w-*` + `mx-auto px-*` combos where they duplicate it.
- Border radius: the design system sets `--radius: 0`. Remove stray `rounded-md`, `rounded-lg`, `rounded-full` on cards / buttons / inputs where they conflict (keep where intentional: avatars, badges).
- Replace ad-hoc dividers with `border-separator` (or the `.hairline` utility) for visual consistency.
- Button pattern: align all primary CTAs to the memorised style — white background, accent border, serif text, accent hover fill — currently inlined many times in `Index.tsx`, `About.tsx`, etc. Extract to a `cta-link` utility or button variant rather than copy-pasting the long class string.

### Pass 5 — Responsive / mobile overflow

- Audit every `min-w-[…]` and `overflow-x-auto` — the homepage companies image, alumni table, archive lists, org chart, admin tables. Confirm they don't break the body width. Wrap genuinely wide content in `overflow-x-auto` containers and avoid `min-w` on the page-level wrappers.
- Tables (`AlumniTable`, admin tables) must scroll inside a wrapper, not push the page.
- Header / Footer: verify on 320–414px widths; fix any flex rows that wrap badly.
- Hero typography: confirm clamp behaviour from `text-[2.5rem] sm:text-hero md:text-[4.5rem]` is consistent across hero variants; remove competing sizes when both `text-hero` and arbitrary `text-[4.5rem]` are stacked.
- `MinervaWorkspace.tsx` (807 lines): biggest source of one-off styling. Pass it last with extra care — normalise sidebar item classes, ensure subsections share a single styled component instead of repeated class strings.

### Pass 6 — Component dedup

- `EventsList` vs `EventsListNew` — confirm which is live, mark the other for removal (note only, no deletion without confirmation).
- Carousels (`LatestArchiveCarousel`, `DivisionArchiveCarousel`, `FundArchiveCarousel`) share ~80% of layout — extract shared card/thumbnail markup into a single sub-component, keep behaviour identical.
- `DivisionCard` / `FundCard` — align padding, typography, hover transitions.
- Admin tables (`UserManagement`, `AlumniManagement`, `FileManagement`, `ReadingsManagement`, `TeamManagement`, `ActivityManagement`) — unify row/header/cell classes via the shared `ui/table` primitives, drop bespoke colour and weight overrides.

### Pass 7 — Verify

- Run the build.
- Walk each route in preview at desktop (1580), tablet (768), mobile (390): `/`, `/about`, `/members/team`, `/members/alumni`, `/archive`, `/events`, `/divisions/equity` (sample), `/readings`, `/join`, `/auth`, `/admin` workspace.
- Check no horizontal scrollbar appears on mobile.
- Spot-check console for hydration / class warnings.

## Out of scope (explicitly)

- No new design language, no new colours, no new fonts.
- No content changes, no copy edits.
- No layout restructuring of pages.
- No backend / data / auth changes.
- No deletion of files without flagging first (will list candidates in the final summary).

## Deliverables

1. Cleaned-up code across the files listed above.
2. A summary in chat covering: tokens enforced, hardcoded values removed, components deduplicated, mobile overflow fixes, and a short list of "needs manual review" items (e.g. potentially-dead `EventsList`, any layout that should be redesigned rather than patched).

## Technical notes

- All colour changes go through `hsl(var(--token))` via Tailwind classes — never raw hex.
- Where a class string is repeated 3+ times, extract a utility in `index.css` `@layer components` or a small wrapper component.
- Keep edits surgical with `line_replace`; do not rewrite whole files unless cleanup density justifies it.
- Do not touch `src/integrations/supabase/*`, `supabase/` SQL, or `.env`.
