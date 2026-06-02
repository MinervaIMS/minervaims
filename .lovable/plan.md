## Problem

The upload fails because the admin form uploads to the wrong bucket and rejects PDFs.

- `handlePosterUpload` writes to the `team-photos` bucket, whose RLS policies only allow team-photo paths — so any `event-posters/...` write is rejected with a permission error.
- The file-type guard is `file.type.startsWith('image/')`, which blocks PDFs.
- The `<input accept="image/*">` also hides PDFs from the picker.

The newly public `event-posters` bucket exists but is never used.

## Fix

In `src/pages/MinervaWorkspace.tsx`:

1. Replace the file-type check with an allowlist: `image/jpeg`, `image/jpg`, `image/png`, `application/pdf` (fallback to extension `jpg|jpeg|png|pdf` if MIME is empty). Reject anything else with a clear toast.
2. Upload to the `event-posters` bucket instead of `team-photos`. Drop the `event-posters/` path prefix (just `${timestamp}-${rand}.${ext}`).
3. Read the public URL from `event-posters`.
4. Update the file input `accept` to `image/jpeg,image/png,application/pdf`.
5. Update the helper text under the input to mention JPG, PNG and PDF.

In `src/pages/Events.tsx` (public page) and `PosterLightbox`:

6. When `poster_url` ends in `.pdf`, render an `<embed>` / `<object>` (or a styled "PDF poster" tile with the filename) instead of an `<img>`, so PDFs don't render as a broken image. Same in the lightbox — use `<iframe src={url}>` for PDFs at the same max-size.

No database, edge function, or RLS changes are needed — the `event-posters` bucket is already public and the `events.poster_url` column accepts any URL.
