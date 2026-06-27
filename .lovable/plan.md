## Problem
On large screens, a white strip appears in the upper-right corner of the login page (`/auth`). The Beams Three.js canvas sits behind the card but does not fully cover the rotated top-right area, so the `bg-background` (white) of the `<main>` element shows through.

## Fix
1. **Add a dark fallback background** on the `<main>` element in `AuthLayout.tsx` so any uncovered canvas area blends with the beams instead of showing white. Use a dark tone close to the beams' black diffuse (e.g. `#05030F` or `#0a0614`).
2. **Verify canvas coverage** — ensure the `div` wrapping `<Beams>` and the `.beams-container` CSS both fill the container height/width at all breakpoints.
3. **If needed**, slightly widen or reposition the beams geometry (e.g. tweak `beamNumber`, `beamWidth`, or camera FOV/position) so the rotated planes cover the top-right corner on wide viewports.

## Files
- `src/components/shared/AuthLayout.tsx`
- `src/components/shared/Beams.css` (if container sizing needs adjustment)
- `src/components/shared/Beams.tsx` (if geometry/camera needs adjustment)