## Goal
Add more vertical breathing room before and after the horizontal separating lines in the footer.

## Changes
In `src/components/layout/Footer.tsx`:
- Increase the top section bottom spacing (`pb-10 mb-10` → larger values, e.g. `pb-14 mb-14` or `pb-16 mb-16`)
- Increase the copyright section top padding (`pt-4 sm:pt-6` → larger values, e.g. `pt-10 sm:pt-14`)

## Approach
Simple Tailwind utility class adjustment. No structural or logic changes.
