# Header refinements

Scope: `src/components/layout/Header.tsx` only (plus a tiny CSS-in-component addition for text/logo shadow). No route, auth, or asset changes.

## 1. Hero detection — robust, image-aware

The current allowlist `HERO_ROUTES = ["/", "/about", "/join"]` is the root cause of both reported problems: detail pages with dark photo heroes (divisions, funds, people) are excluded, and the scroll threshold (`scrollY > 20`) flips the bar to solid too early on the listed pages.

Fix in two parts:

**a. Expand the hero route set to every page that ships a dark photographic hero:**
```
const HERO_ROUTES_EXACT = new Set(["/", "/about", "/join"]);
const HERO_ROUTE_PREFIXES = [
  "/divisions/",   // equity, investment, macro, portfolio, quant
  "/funds/",       // long-short, multi-asset
  "/people/",      // members, alumni
];
const hasHero =
  HERO_ROUTES_EXACT.has(pathname) ||
  HERO_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
```

**b. Raise the scroll threshold so the bar stays transparent while the hero is still on screen.** Heroes on this site are ~100vh, so flipping at 20px is far too eager. New threshold: when the user has scrolled past roughly the viewport height (use `Math.max(window.innerHeight * 0.85, 480)`). Recompute on resize too. This guarantees the transparent state lasts for the entire visible hero and the solid state appears only once the hero has actually left the top of the screen.

## 2. Readability over any image (white text + dark-purple shadow)

In the transparent mode, add a subtle `#1D102A` shadow to every text node and to the logo, so contrast survives bright spots in the hero photo without darkening the whole bar:

```
// applied only when transparent === true
textShadow: "0 1px 2px rgba(29,16,42,0.55), 0 0 12px rgba(29,16,42,0.35)"
// logo <img>
filter: "drop-shadow(0 1px 2px rgba(29,16,42,0.55)) drop-shadow(0 0 10px rgba(29,16,42,0.35))"
```

These are removed in the solid state so navy-on-white stays crisp.

## 3. Smoother, institutional transition

Replace the current `transition-colors duration-300` on the `<header>` with a longer, eased compound transition covering background, border, shadow, color, text-shadow, and the logo's drop-shadow filter:

- duration: 600 ms
- easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` (gentle ease-in-out, no overshoot)
- properties: `background-color, border-color, box-shadow, color, text-shadow`
- logo `<img>` gets matching `transition: filter 600ms` so the shadow fades in/out in lockstep with the colour swap

All descendant links inherit `color` and `text-shadow` transitions from the header so nothing snaps.

## 4. Stable hover dropdowns (desktop)

The current dropdown relies purely on `group-hover`, which closes the instant the cursor leaves the trigger — there is no bridge across the 8 px gap, so reaching the menu is fragile.

Replace with a controlled-state pattern per item:

- Track `openDd` (already in state) for desktop too.
- On the wrapper `<div>`: `onPointerEnter` → `clearTimeout` + `setOpenDd(label)`; `onPointerLeave` → `setTimeout(() => setOpenDd(null), 220)`.
- The dropdown panel itself uses the same enter/leave handlers (cancels close while the cursor is inside it).
- Remove the `mt-2` gap and instead use `pt-2` **inside** an invisible wrapper that extends up under the trigger, so the cursor never crosses dead space between trigger and panel.
- Keep keyboard accessibility: `onFocus`/`onBlur` mirror the pointer handlers.

Result: menus stay open while traversing, close ~220 ms after the cursor leaves both trigger and panel.

## 5. Mobile/tablet menu — full screen

Currently the panel is `max-h-[calc(100vh-84px)]` below the header. Change to a true full-viewport overlay:

- When `mobileOpen` and viewport `< 880px`: render a fixed overlay `inset-0 z-[60] bg-white` that contains the close button (top-right), the full nav list, the account block at the bottom, and respects safe-area insets.
- Lock body scroll while open (`document.body.style.overflow = "hidden"` in an effect, restored on close/unmount).
- The header itself stays mounted underneath; the overlay covers it entirely so there is no double chrome.
- Animate with the same 600 ms eased opacity/translate as the colour transition for consistency.

## 6. Mobile/tablet link hover/press effect

Mirror the desktop dropdown-item treatment on every link inside the mobile overlay (parent items, sub-items, and Login/Workspace):

- Base: `font-serif text-[17px] text-[#141414]`
- Hover/active: `bg-[#F2F2F2] text-[#1F0F4D]`
- Generous tap target: `px-5 py-3`, full-row width
- Sub-items indented (`pl-9`), same hover style
- Add a draw-in underline (1.5 px, 240 ms) on the active label to echo the desktop affordance

## Technical notes

- All timing values centralised as constants at the top of the file (`NAV_TRANSITION_MS = 600`, `DROPDOWN_CLOSE_DELAY_MS = 220`) for easy tuning.
- No new dependencies, no Radix dropdown swap — staying with the current CSS-only panel keeps bundle size flat and matches the reference HTML.
- `scrollbar-gutter: stable` is already set globally (per memory), so locking body scroll for the mobile overlay will not shift the underlying layout.
- Admin route guard, route list, auth wiring, logo assets, and the three-zone grid remain untouched.
