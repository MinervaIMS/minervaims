# Roles & Divisions headings + visible carousel dots

## 1. Rename the structure section

- `src/pages/About.tsx`: section heading "Organisational Structure" becomes "Roles & Divisions" (the `id="organisational-structure"` anchor stays).
- `src/pages/Team.tsx`: same heading change, plus the intro CTA becomes "Roles & Divisions" linking to `#organisational-structure` (same-page scroll) instead of `/about#organisational-structure`.

## 2. Fix the "Latest Reports" dots on the homepage

Confirmed cause: in the reports rail every inactive dot renders with a fully transparent background, so only the single active lozenge is visible. The reset rule `.rsec button { background:none; }` in `src/index.css` outranks the shared dot rule `.rdot { background: hsl(var(--accent)/.28) }` on specificity, while the active state (`.rdot.is-active`) is specific enough to survive. Fix by raising the specificity of the shared inactive-dot rule (e.g. `button.mdot, button.rdot, button.dstack-dot`) so it is not stripped inside `.rsec` sections, without changing the dot design.

## 3. Audit every dots indicator

Verified in the browser: the reports rail (home) is the broken one; the funds strip dots (`.v2-strip-dots`, on navy) render correctly. After the CSS fix, re-check each indicator on the live pages — homepage reports rail and pinned divisions, fund detail strip, archive/division/fund PDF carousels (`.mdots--ondark`) — confirming inactive dots are visible on both light and navy grounds and that active state still reads.

## Technical notes

- Single CSS change in `src/index.css` in the shared dots block; no component-level dot styling added.
- Verification via a Playwright pass reading computed `background-color` of inactive dots on each page that renders an indicator.
