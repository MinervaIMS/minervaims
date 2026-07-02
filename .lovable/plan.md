## Change

Replace `src/components/shared/Preloader.tsx` with the exact version you pasted (single timeline, no viewport branching inside the component, ~2.46s total).

Mobile + tablet only gating is already handled in `src/App.tsx` via `window.innerWidth < 1024` (`DESKTOP_MIN = 1024`) plus the `sessionStorage["__mims_intro__"]` once-per-session guard — desktop never mounts the Preloader. No changes needed there.

## Files

- `src/components/shared/Preloader.tsx` — overwrite with the pasted code verbatim

## Out of scope

- `src/App.tsx` gating (already mobile + tablet only)
- `index.html` `#initial-loader`
- Any styling / design tokens
