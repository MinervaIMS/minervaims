## Goal
On mobile, the zoom (+/−) and "Europe" buttons overlap the globe. Move them below the globe on small screens, while keeping the current top-right overlay on tablet/desktop (where space allows).

## Change
In `src/components/AlumniGlobe.tsx`, the controls container (currently `absolute right-3.5 top-3.5 ... flex-col`) is responsive-ified:

- On mobile (`<sm`): render as a horizontal row positioned below the canvas (static, not absolute), centered, with small gap. Buttons stay the same size/style.
- On `sm` and up: keep the existing absolute top-right vertical stack (current behavior unchanged).

Implementation: split into two control groups using Tailwind responsive utilities (`hidden sm:flex` for the overlay version, `flex sm:hidden` for the below-globe row), or use a single block with `sm:absolute sm:right-3.5 sm:top-3.5 sm:flex-col` plus `mt-3 flex-row justify-center` defaults. The latter is cleaner — single DOM node.

No other changes (functionality, styling, logic untouched).
