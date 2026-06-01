## Problem

In the footer's top row, at narrow desktop widths (≈1024–1280px), the social links overflow the viewport. Cause: the row switches to horizontal layout at `md:` (768px) with `justify-between`, while the email link uses `whitespace-nowrap` and a large font size (up to 2.25rem). The email cannot shrink, so the socials get pushed past the right edge.

## Fix

In `src/components/layout/Footer.tsx`, top-row container (lines ~88–96):

- Change layout breakpoint from `md:flex-row` to `lg:flex-row` so tablet-style stacking persists until there's truly enough horizontal room.
- Add `flex-wrap` and `lg:justify-between` as a safety net so if content still doesn't fit, the social block wraps below instead of overflowing.
- Optionally reduce the email font size at the `lg` breakpoint (e.g. cap at `lg:text-[2rem]`) to give more breathing room.

No other files affected. Pure responsive CSS change — no logic, no content changes.