## Restore pixel-explosion animation on "Application submitted" card

### Problem
The `SuccessScreen` in `src/pages/Apply.tsx` renders a plain white card. The `PixelCard` component (`src/components/shared/PixelCard.tsx`) — which animates pixels filling the card in an explosion, holds briefly, then fades out gradually — is no longer referenced anywhere in `src/` (verified via ripgrep). It was dropped from the success screen at some point.

### Fix
In `src/pages/Apply.tsx` `SuccessScreen` (around lines 67–85):

1. Import `PixelCard` from `@/components/shared/PixelCard`.
2. Wrap the inner content of the white card in a `PixelCard` overlay so the pixel animation covers the full white box on mount, then fades out.

Approach: keep the existing white `<div class="... bg-white ...">` for layout/shadow, and place an absolutely-positioned `PixelCard` inside it (covering the full box, `pointer-events-none`, above the white background but below the text content) so the pixel explosion visually fills the entire white card and then fades away — matching the previous behavior.

Props:
- `variant="navy"` (matches Minerva accent colors already defined in PixelCard)
- `activeDuration={3000}` (≈3s hold, per the component's original intent)
- `fadeMs={1400}` (gradual slow fade-out)
- `autoPlay` on mount (default)

### Scope
- Only `src/pages/Apply.tsx` is edited.
- No changes to `PixelCard.tsx`, styles, or other pages.
- Purely visual restoration; no logic/behavior changes to the submission flow.
