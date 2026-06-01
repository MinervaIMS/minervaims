# Replace site header — precise port of the uploaded reference

Rewrite `src/components/layout/Header.tsx` as a 1:1 port of the uploaded `Header.tsx` / `MIMS Navbar — Final.html`. No deviations from the reference behaviour or styling. Only the placeholders called out in the reference comments are wired to the real project.

## Adherence to the reference (no changes)

- Fixed header, `inset-x-0 top-0 z-50`, height **84px**, `border-b` transition.
- Two modes via scroll listener at `scrollY > 20`.
  - Transparent: `bg-transparent border-transparent`, white serif links (`rgba(255,255,255,.92)` → `#fff` on hover/active), white logo mark.
  - Solid: `bg-white border-[#E0E0E0] shadow-[0_1px_3px_0_rgba(0,0,0,0.07)]`, navy (`#1F0F4D`) links, colour logo mark.
- Three-zone grid `grid-cols-[1fr_auto_1fr]`, max-width 1280, padding `px-10`, gap 28px. Logo `justify-self-start`, account `justify-self-end`, nav centred.
- Nav: serif 17px, gap 34px, draw-in 1.5px underline under each link, persistent underline on `is-active`. Caret `▾` for dropdown items at `0.62em / opacity .6`.
- Dropdowns open on `group-hover`: 266px min-width, white panel, `#E0E0E0` border, elevated shadow, items 16px serif, hover bg `#F2F2F2` + navy text. Centred under the trigger (`left-1/2 -translate-x-1/2 mt-2`).
- Account cluster:
  - Logged out → "Login" text link with the same underline draw-in.
  - Logged in → "Workspace" label + 32px circular avatar to its right (gap 12px). Avatar shows photo when present, else **uppercase initials** on `#1F0F4D` with white Calibri 700 12.5px. Avatar ring: `rgba(255,255,255,.55)` when transparent, `#E0E0E0` when solid.
- Hamburger button shown `< 880px` (matches the reference's `@media (max-width:880px)`). Hides nav + account, switches grid to `1fr auto`. Icon colour follows mode.
- Active-state rule: matches `location.pathname === to` for `/`, else `startsWith(to)`.
- No focus ring, no divider before the account.
- Not rendered on `/admin*` (early return; Layout already guards this too).

## Project-specific wiring (the only adaptations)

1. **Logo assets** — the reference uses `logo-mark-color.png` / `logo-mark-white.png`. The project has `@/assets/logo-color.svg` and `@/assets/logo-white.svg` (the same brand mark, already used by the current header). Use those imports — visually identical, just SVG.
2. **Routes** — map `NAV_LINKS` to actual app routes:
   - About → `/about`
   - Divisions → `/divisions/equity`, `/divisions/investment`, `/divisions/macro`, `/divisions/portfolio`, `/divisions/quant`
   - Funds → `/funds/long-short`, `/funds/multi-asset`
   - People → `/people/members`, `/people/alumni`
   - Join → `/join`
   - Parent labels (`Divisions`, `Funds`, `People`) have **no `to`** — they're hover triggers only (caret + dropdown), not links. Matches reference: parent items don't navigate, dropdown items do.
3. **HERO_ROUTES** = `["/", "/about", "/join"]` (exact list from the reference).
4. **Auth** — `useAuth()` from `@/contexts/AuthContext`:
   - Logged out → "Login" → `/auth` (project has no `/login` route; `/auth` is the login page).
   - Logged in → "Workspace" → `/admin`.
   - `fullName` from `profile?.full_name ?? user.email`.
   - `avatarUrl`: profiles table has no photo column, so always render initials (matches the reference's `initials` state — the most common case).
5. **Mobile menu panel** — the reference only ships the burger button with no open behaviour. I will add a minimal panel (slide-down, serif links, expanded dropdowns inline, Login/Workspace at bottom) using the same colours so the burger is functional. If you'd rather keep the burger inert exactly like the reference, say so.

## Files

- Rewrite: `src/components/layout/Header.tsx`
- No other files touched (Layout, routes, assets, auth context unchanged).
