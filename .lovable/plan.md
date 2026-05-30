## Header updates (`src/components/layout/Header.tsx`)

### 1. Navigation label & structure
- `ABOUT US` → `ABOUT` (→ `/about`)
- `MEMBERS` dropdown → `PEOPLE`:
  - `Members` → `/people/members`
  - `Alumni` → `/people/alumni`
- Remove top-level `EVENTS`.
- Add top-level `JOIN US` → `/join`.

Final order: `ABOUT` · `DIVISIONS` · `FUNDS` · `PEOPLE` · `JOIN US` (+ `HOME` prepended off-homepage).

### 2. Login button
- Add `LOGIN` button on the right (desktop + mobile), shown only when logged out, linking to `/auth`.
- Same styling pattern as existing `WORKSPACE` button (transparent-aware on homepage hero).

### 3. Mobile menu icon
- Replace `MENU` / `CLOSE` text with `Menu` / `X` icons from `lucide-react`.
- Keep `currentColor`; add `aria-label`.

## Route updates

Update `src/App.tsx`:
- Rename routes:
  - `/members/team` → `/people/members`
  - `/members/alumni` → `/people/alumni`
  - `/members` (MembersIndex landing) → `/people`
- Add redirect routes for the old paths so any bookmarked/indexed link still resolves:
  - `/members` → `/people`
  - `/members/team` → `/people/members`
  - `/members/alumni` → `/people/alumni`

Sweep and update every internal link to the new paths:
- `src/components/layout/Header.tsx` (nav dropdown)
- `src/components/layout/Footer.tsx`
- `src/pages/Sitemap.tsx`
- `src/pages/MembersIndex.tsx` (card links)
- `src/pages/Index.tsx`, `src/pages/About.tsx`, `src/pages/Team.tsx`, `src/pages/Alumni.tsx`, `src/pages/Join.tsx`, `src/pages/DivisionDetail.tsx`, `src/pages/MinervaWorkspace.tsx`, and any other file referencing `/members/...` (verified via grep before editing).

## Page title / heading updates

- `src/pages/About.tsx` — heading "About Us" → "About".
- `src/pages/Team.tsx` — heading "Our Team" → "Members".
- `src/pages/MembersIndex.tsx` — heading "Members" → "People"; cards stay labeled "Members" and "Alumni".
- `src/pages/Join.tsx` — heading → "Join Us" (if not already).
- Update corresponding `<title>` / SEO meta tags and any breadcrumbs to match.
- Footer + Sitemap labels updated alongside the link paths.

## Notes
- `/events` page itself stays reachable via direct URL; only the top-nav entry is removed per your request. Flag if it should also be dropped from Footer/Sitemap.
- Routes for `/divisions/*` and `/funds/*` are unchanged.

### Out of scope
- No auth/business-logic changes, no content rewrites beyond title swaps, no backend changes.
