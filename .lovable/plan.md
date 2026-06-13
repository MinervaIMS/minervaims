# Unify PDF preview behavior across the site

## Problem

The `/archive` page (and any other places previewing reports) currently opens an in-page `Dialog` with an iframe pointing at the raw Supabase Storage URL. As shown in the screenshot, that dialog renders a mostly empty white area — the embedded PDF often fails to display reliably across browsers, and the dialog adds no value over a real browser tab.

Meanwhile, the homepage Latest Reports rail uses `openReportInTab(title, url)` in `src/components/shared/ReportsSection.tsx`, which opens a single new tab with:
- A clean tab title (sanitized report title, pinned via MutationObserver/interval)
- A deep purple (`#1F0F4D`) wrapper bar with the report title in Times New Roman
- A white "Download PDF" button using `?download=<Report Title>.pdf` for a clean saved filename
- An embedded iframe with the PDF

This is the experience we want everywhere.

## Fix

### 1. Promote `openReportInTab` into a shared util

Extract the helper currently defined inside `src/components/shared/ReportsSection.tsx` (lines ~204-325, including `sanitizeFilename`, `escapeHtml`, `withDownloadParam`) into a new module:

- **New file:** `src/lib/open-report.ts` exporting `openReportInTab(title: string, url: string): void`.
- Keep behavior bit-for-bit identical to the current implementation (single `window.open('about:blank', '_blank')`, anchor fallback, wrapper document, title pinning).
- Update `ReportsSection.tsx` to import from the new module instead of defining it locally. No call-site changes there.

### 2. Replace the Archive preview dialog with `openReportInTab`

In `src/components/shared/ArchiveFilesList.tsx`:

- Remove the `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` imports and the entire "PDF Preview Dialog" block (lines ~194-224).
- Remove the `previewFile` state.
- Change the thumbnail's `onClick` from `setPreviewFile(file)` to `openReportInTab(file.title, file.file_url)`.
- Keep the existing Download button behavior (server-side download via `handleDownload`) unchanged on the list cards — only the preview path changes.

### 3. Scan for any other in-page PDF preview dialogs

- `src/pages/Events.tsx` line ~521 embeds an iframe for event **posters** (images/PDFs in a lightbox). This is not a report preview and is out of scope unless you want it changed too — by default, leave it alone.
- No other components currently open PDFs in-page (verified via `rg "#view=FitH"` and `rg "iframe"`).

## Verification

- Click any thumbnail on `/archive` → exactly one new tab opens, titled with the report name, showing the embedded PDF with the deep-purple top bar and white Download button (identical to clicking a card on the homepage).
- The dialog/lightbox no longer appears on `/archive`.
- The "Download" button on each archive card still downloads the PDF inline as before (uses existing `handleDownload`).
- Homepage Latest Reports, division pages, and the lightbox cover button continue to work unchanged (they import the same helper from the new shared module).

## Files touched

- **New:** `src/lib/open-report.ts` — extracted helper.
- **Edit:** `src/components/shared/ReportsSection.tsx` — replace inline helper with an import.
- **Edit:** `src/components/shared/ArchiveFilesList.tsx` — drop the preview dialog, use `openReportInTab` on thumbnail click.
