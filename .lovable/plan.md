## Restore the pixel animation on the "Application submitted" card

**Problem:** The `SuccessScreen` in `src/pages/Apply.tsx` has a comment describing a "pixel animation [that] fills the whole white card, then fades away gradually, with the confirmation message and workspace button on top" — but the JSX no longer renders it. The `PixelCard` component still exists at `src/components/shared/PixelCard.tsx` (with auto-play appear → hold → disappear + opacity fade), it just isn't imported anywhere.

**Fix (single file — `src/pages/Apply.tsx`):**

1. Import `PixelCard` from `@/components/shared/PixelCard`.
2. In `SuccessScreen`, wrap the inner content of the white card with `<PixelCard>` so the canvas fills the card behind the logo / heading / paragraphs / button.
   - `variant="default"` (matches the deep-purple accent palette already used elsewhere), `activeDuration={3000}`, `fadeMs={1400}` — the component defaults.
   - Give it `className="absolute inset-0"` and set the card wrapper to `relative overflow-hidden` so the canvas covers the full card without pushing layout.
   - Keep the existing content in a sibling `<div className="relative z-10">` so it stays on top and remains readable throughout the fade.
3. No changes to `Apply` form, no changes to other pages, no changes to `PixelCard` itself.

### Technical notes
- `PixelCard` auto-plays on mount, so no extra state wiring is needed.
- The card already has `shadow-2xl border border-separator rounded-lg`; adding `relative overflow-hidden` preserves those while clipping the canvas to the rounded corners.
- Text remains black on white (canvas fades out to transparent), respecting the "no animations except /join" rule's existing exception for this specific success card.