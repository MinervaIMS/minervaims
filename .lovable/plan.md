## Root cause

`src/components/shared/AuthLayout.tsx` (line 33) and `src/pages/Apply.tsx` (lines 34 and 70) use the class `items-safe-center`. That utility only exists in Tailwind v4; this project is on Tailwind 3.4.17, so the class is dropped and the flex container falls back to `align-items: stretch`. The `max-w-md` white card is therefore stretched to full viewport height, producing the large empty white area visible on `/auth` (and the same bug is present on every page that uses `AuthLayout`, plus `/apply`).

## Change

Replace `items-safe-center` with `items-center` in the three occurrences:

1. `src/components/shared/AuthLayout.tsx` line 33.
2. `src/pages/Apply.tsx` line 34.
3. `src/pages/Apply.tsx` line 70.

No other edits. Nothing else changes — no removal of the purple background, no restyle, no new components. The white card will now size to its content and sit vertically centred in the dark panel.

## Pages fixed by this single change

- `/auth`
- `/forgot-password`
- `/reset-password`
- `/check-email`
- `/application-check-email`
- `/email-verification`
- `/pending-approval`
- `/session-expired`
- `/password-reset-success`
- `/apply` (both its states)

## Verification

After the edit, reload `/auth` and `/check-email`; the card should hug its content with no white block extending down the page. No functional or copy changes to any auth page.
