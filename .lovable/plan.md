## Goal
Swap the three uploaded background photos into the pages that currently use their older versions.

## Mapping (confirmed by searching the codebase)
| Upload | Current asset | Used in |
|---|---|---|
| `MIMS_Milan_Background-2.webp` | `MIMS_Milan_Background.webp` | `src/pages/Partnerships.tsx` |
| `MIMS_Join_Background-4.webp` | `MIMS_Join_Background.webp` | `src/pages/Join.tsx` |
| `MIMS_Alumnni_Background-2.webp` | `MIMS_Alumni_Background.webp` | `src/pages/Alumni.tsx` |

Each of these three assets is referenced in exactly one file, so no other page changes.

## Steps
1. Upload each new image to the CDN with the assets CLI, writing new pointer files (`MIMS_Milan_Background-v2.webp.asset.json`, `MIMS_Join_Background-v4.webp.asset.json`, `MIMS_Alumni_Background-v2.webp.asset.json`).
2. Update the import in `Partnerships.tsx`, `Join.tsx`, and `Alumni.tsx` to the new pointer files. No layout/markup changes — same hero background usage and preload hints.
3. Delete the three superseded assets (CDN object + pointer) so the repo keeps a single current version of each background.
4. Verify with a build and a quick preview screenshot of `/partnerships`, `/join`, and `/alumni` to confirm the new images render and framing still looks right.

## Note
Old asset URLs are permanently removed in step 3; if you'd rather keep the previous backgrounds available, say so and I'll leave them in place.
