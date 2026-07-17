## Goal
Make every Lucide icon across the app render with a thinner, consistent 1.25× stroke using a single global CSS override.

## Why this works
Lucide React renders each icon as an `<svg class="lucide ...">`. Setting `stroke-width: 1.25` on that SVG scales with the icon’s viewBox, so the stroke stays proportional at every icon size — equivalent to passing `strokeWidth={1.25}` on every icon without needing to edit 60+ files.

## Implementation
1. Add a global rule in `src/index.css` (near the existing iconography/design-system comments):
   ```css
   /* Global Lucide stroke width — 1.25× relative scaling */
   svg.lucide,
   .lucide svg {
     stroke-width: 1.25 !important;
   }
   ```
   The `!important` ensures it overrides any inline `stroke-width` attributes set by Lucide or explicit props in components.

2. Add a short note in `src/components/admin/BrandDesignSystem.tsx` under the Iconography section documenting the 1.25× stroke convention.

## Verification
- Visually check the workspace help button, navigation, form inputs, shadcn buttons/selects, and public pages to confirm icons look thinner and remain crisp.
- Confirm non-Lucide SVGs (custom social icons, brand marks, logo SVGs) are not affected because they do not carry the `.lucide` class.

## Scope
- Affects all Lucide icons site-wide, including shadcn/ui primitives.
- Does not touch icon size, color, or animation.
- No per-component prop changes required.
