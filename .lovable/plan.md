# Events page refactor

## 1. Database
Add a single optional column to `events`:
- `poster_url text` (nullable) — points to a public storage object.

No data backfill in this step — you'll upload posters from the admin UI once the column exists.

## 2. Storage
Create a new public bucket `event-posters` (separate from `archive-files` and `team-photos`) with public read, authenticated insert/update/delete via RLS on `storage.objects`. Accepts any image format/aspect ratio (JPG, PNG, WEBP). No transforms — the original poster is served as-is so any format is welcomed natively.

## 3. Admin dashboard — Events management
In the existing Events admin section, add a Poster field to the event create/edit form:
- File picker (image/*), uploads to `event-posters`, stores the public URL in `events.poster_url`.
- Preview of current poster + "Remove" button.
- Optional — leave empty for events with no poster (row will fall back to a placeholder block on the public page).

## 4. Public Events page (`src/pages/Events.tsx`)
Past Events section rebuild:
- **Remove** year-grouping headers (`groupedByYear`) and the year `<select>` filter + its state (`yearFilter`, `availableYears`, `handleYearChange`).
- **Pagination:** 10 per page (was 8). Keep `SquarePagination` and smooth scroll-to-top behavior.
- **Row layout** — restore the previous wider, info-rich layout, now with a poster column on the left:

```text
┌──────────┬──────────────────────────────────────────────┐
│          │ 23 APRIL 2026  |  ROOM ZAPPA, VIA SARFATTI…  │
│ POSTER   │ The third Gulf war: Economic and financial…  │
│ ~200px   │ Description (line-clamp-3 collapsed)…        │
│          │ Read more ▾                                  │
│          │   ↳ full description                         │
│          │   ↳ Moderator: …                             │
│          │   ↳ Guests: • … • … • …                      │
└──────────┴──────────────────────────────────────────────┘
```

- Poster column: fixed `w-[200px]` on desktop, `w-[140px]` on mobile. Container has `aspect-[3/4]` only as a placeholder when no poster; when a poster exists, the image renders at its natural ratio (`h-auto`, `object-contain`, no crop) so portrait/landscape/square formats are all welcomed natively. Hover cursor = zoom-in.
- Right column: date + place on one line with `|` separator (calendar + pin icons from lucide-react, matching the reference screenshots), serif title, description with Read more toggle (existing behavior preserved, moderator + guests listed separately inside the expanded block).

## 5. Poster lightbox
New `PosterLightbox` component opened on poster click:
- Fixed full-screen overlay with `backdrop-blur-md` + dark translucent background.
- Poster centered, max `90vh` height, natural aspect ratio (no cropping, no forced format).
- Close: X button (top right), ESC key, click on backdrop.
- **Arrows** (left/right) to navigate between all past-events posters in date-desc order. Arrow keys also work. Skips events without a poster. Wraps around at ends.
- Body scroll locked while open (`overflow-hidden` on `<html>`), respecting the project's `scrollbar-gutter: stable` rule so layout doesn't shift.

## 6. Items left unchanged
- Upcoming section, description paragraphs, hero, and SEO untouched.
- Section heading styling continues to follow the project standard (serif, mb-6, pb-3, border-b border-separator).

## Technical notes
- New `DbEvent` field: `poster_url?: string | null`.
- Filtered list (now just `pastEvents` sorted desc) drives both pagination and the lightbox carousel — they share the same ordered array so arrows match what's on screen.
- No new dependencies; lucide-react already provides Calendar, MapPin, X, ChevronLeft, ChevronRight.
- Admin upload reuses the same pattern as team-photos / archive-files (storage client with session access token).
