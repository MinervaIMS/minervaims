# Fix "Open Report" tab + filename issues

## Problems identified

Both issues come from `openReportInTab()` in `src/components/shared/ReportsSection.tsx` (lines 205-226), which is invoked from the homepage cards, the lightbox cover, the "Open Report" button, and the division pages.

1. **Two tabs open.** The call uses `window.open('', '_blank', 'noopener,noreferrer')`. With `noreferrer`, Chromium-based browsers return `null` from `window.open`, so the code falls into the `if (!w)` "popup blocked" branch and opens a **second** tab with the raw PDF URL — while the first `about:blank` tab (the one in your screenshot) is left orphaned.

2. **Ugly tab title and ugly downloaded filename.** Even when the wrapper does open, the iframe points directly at the Supabase Storage URL (e.g. `…/1779888546457-oscar-2.pdf`). The wrapper's `<title>` is correctly set, but as soon as the inner PDF viewer takes focus, browsers display the PDF's own filename in the tab, and any download from the built-in PDF toolbar uses that storage filename.

## Fix

Rewrite `openReportInTab(title, url)` to open exactly one tab with a clean title and provide a clean download name.

### 1. Single tab, reliable open

- Drop `noreferrer` from the feature string (keep `noopener` security via the wrapper, since the child page is same-origin `about:blank` we control).
- `const w = window.open('about:blank', '_blank')`. If `w` is `null` (true popup-block), fall back to a temporary `<a href={url} target="_blank" rel="noopener">` click — no second `window.open`.

### 2. Clean tab title that survives PDF viewer takeover

- Sanitize the report title into a filename-safe string (`sanitize(title)` → letters/digits/spaces/`-`/`_`, collapsed; fallback `"Report"`).
- In the wrapper document, set `<title>` and a meta description, and keep the wrapper page as the top-level document so its title remains the tab label. The PDF is embedded inside an iframe and cannot override the parent tab title.

### 3. Clean download filename

- Replace the direct-PDF iframe with a small wrapper UI:
  - A slim top bar with the report title and a **Download** button.
  - Below it, an iframe pointing to a **blob URL** of the PDF, fetched once via `fetch(url).then(r => r.blob())`. The blob URL hides the storage filename.
- The Download button performs `fetch(url) → blob → <a download="{sanitizedTitle}.pdf">` so the saved file is named after the report (e.g. `Sector Analysis European Luxury Goods.pdf`).
- If `fetch` fails (CORS / offline), fall back to the original URL in the iframe so the user still sees the PDF; the Download button then opens the URL directly in a new tab.

### 4. No other behavior changes

- All call sites (`CardsVariant`, `NavyVariant`, `FeaturedInfo`, `PreviewLightbox`) keep calling `openReportInTab(report.title, report.pdf)` — only the implementation changes.
- Styling matches existing brand: deep purple (`#1F0F4D`) top bar, white text in Times New Roman, white "Download" button with black border in serif font, consistent with the project's design memory.
- No animations, no new dependencies.

## Files touched

- `src/components/shared/ReportsSection.tsx` — replace the `openReportInTab` helper (lines 204-226). No changes to call sites, props, layout, carousel logic, or other components.

## Verification

- Click a report card → exactly one tab opens, titled with the report name, showing the PDF.
- Click Download inside that tab → file saves as `<Report Title>.pdf`.
- Test on the homepage Latest Reports rail, the lightbox "Open Report" button, and a division page reports section.
