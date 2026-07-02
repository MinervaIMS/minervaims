### Goal
Replace the current square mark (`logo-color.svg`) with the full Minerva emblem in its colored (deep purple) version on:
1. 404 page (`src/pages/NotFound.tsx`)
2. Application form — open and closed states (`src/pages/Apply.tsx`)
3. Event registration form (`src/pages/EventRegister.tsx`)

### Context
- The login page currently uses `legal-hero-logo.svg` (white full emblem).
- The site accent color is `#1F0F4D` (deep purple).
- There is no existing colored full-logo asset; `logo-color.svg` is a different embed/resolution.

### Plan

1. **Generate colored full-logo asset**
   - Create a deep purple (`#1F0F4D`) version of the full Minerva emblem matching the white `legal-hero-logo.svg` design.
   - Save as `src/assets/logo-full-color.png` (transparent background).
   - Size: 1024 × 1024 px, scaled appropriately for display.

2. **Update 404 page**
   - Import `logoFullColor` from the new asset.
   - Replace the current `logoColor` import and `<img>` tag.
   - Adjust size: increase from `h-32 w-32` to a larger height (e.g., `h-40 w-auto` or `h-44 w-auto`) to show the full emblem detail.
   - Keep responsive sizing (`sm:h-52 sm:w-auto`).

3. **Update Application form (`Apply.tsx`)**
   - Import the new asset.
   - Replace `logoMark` in the `Shell` component.
   - Increase from `h-20 w-20` to `h-28 w-auto` (or similar) for the full emblem.
   - Apply to both the open-form state and the closed-form state (the `Shell` wrapper is shared).

4. **Update Event registration form (`EventRegister.tsx`)**
   - Import the new asset.
   - Replace `logoMark` in the `Shell` component.
   - Increase from `h-20 w-20` to `h-28 w-auto`.
   - Apply to all states: loading, not-found, registration-closed, success, and the active form.

5. **Verify**
   - Confirm TypeScript compiles cleanly (`tsc --noEmit`).
   - Spot-check the 404 page, Apply page, and an EventRegister page in the preview to confirm the emblem renders crisply and is centered.

### Sizing rationale
The current `h-20 w-20` (80 px) and `h-32 w-32` (128 px) sizes were chosen for the square mark. The full emblem is more detailed and looks best slightly larger. Proposed display heights:
- 404 page: ~160–200 px (`h-40`–`h-48`)
- Form shells: ~112 px (`h-28`)

These keep the emblem prominent without dominating the card layout.