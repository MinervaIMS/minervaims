# Replace Association on Display Image

## Goal
Swap the current Association on Display photograph used in the dashboard promo card for the newly uploaded image.

## Steps
1. Inspect the uploaded `AoD_photo-2.webp` dimensions and aspect ratio.
2. Replace `public/media/aod/association-on-display.jpg` with the new image (convert to JPEG if the component path expects `.jpg`, or update the path to keep `.webp`).
3. Verify `src/components/admin/dashboard/AodPromoCard.tsx` references the correct path.
4. Preview the dashboard to confirm the new image is framed well within the card.

## Notes
- The component already handles missing images gracefully and keeps text/button placement intact.
- If the new aspect ratio is still much taller than the card panel, we may need to adjust `object-position` or switch to `object-contain` to avoid faces being cropped.