# Confirmation Landing And Repeat Clicks On Verification Links

## What is verified so far

- Your account did confirm: `email_confirmed_at = 2026-08-31 11:18:30 UTC`, and you hold the `president` role, so the intended landing is the Workspace dashboard.
- The email was sent through the Minerva hook (`signup`, sent 11:17:33 UTC, no error), so the link was the app-hosted `/verify-email?token_hash=…` form, not the auth server's one-time GET.
- The link in that email carries no `next` value (the redirect target is the site root, which the hook deliberately drops), so an explicit `next` is not what sent you to the homepage.
- Confirmed race in the auth context: on `/verify-email` the page loads signed out, so `rolesLoaded` is `false` and `roles` is empty; after `verifyOtp` the roles are fetched in a deferred callback. The Workspace therefore mounts for a moment with "no roles yet".

The exact reason the browser ended on `/` is **not yet confirmed** — the two candidates are the roles race above and a fallback route decision inside the Workspace shell while roles are unknown. So step 1 is reproduction, not a guess.

## Step 1 — Reproduce and pin the cause

Mint a real signup link for a test address with the admin API, drive the click in a headless browser, and record every navigation plus console output. This shows exactly which redirect wins and whether it comes from the verification page or from the Workspace shell.

## Step 2 — Make the post-confirmation landing deterministic

- After a successful confirmation, wait for the session to be live and for roles to be actually loaded before navigating, instead of navigating immediately and letting the Workspace decide while it still believes the user has no roles.
- Resolve the destination from the role read that already happens on the verification page: any role -> `/workspace/dashboard`, no role -> `/workspace/applications/status`. An explicit `next` still wins.
- While roles are still unknown, the Workspace must show its loader rather than rendering nothing or falling back to a public route, so a freshly confirmed member can never be bounced to the homepage.

## Step 3 — Repeat clicks: friendly "already confirmed" screen

Auth tokens are strictly single-use and cannot be made 3-use without turning the emailed link into a reusable sign-in credential, so per your choice the second and third click get a reassuring screen instead of an error:

- The hook records a receipt for each link it mails: a hash of the token, the user, the action type and the expiry.
- When the verification page's redemption fails as "used or invalid", it asks a small public endpoint about that receipt. If the receipt exists and that account is now confirmed, the page shows "Your email is already confirmed" with a Continue button — into the Workspace if a session exists, otherwise to sign in.
- No session is ever minted from a spent link, and the endpoint returns only a status, never tokens or personal data.
- Genuinely expired or unknown links keep the current wording and the "send a new email" action.

## Technical notes

- Files: `src/pages/EmailVerification.tsx`, `src/pages/MinervaWorkspace.tsx` (loading guard only), `src/lib/auth-link.ts`, `supabase/functions/auth-email-hook/index.ts`, one new small edge function for the receipt lookup, one migration for the receipt table (RLS on, no anon access; the function reads it with the service role).
- The receipt stores a SHA-256 of the token hash, not the token itself, with the same lifetime as the link plus a short grace period; rows are pruned on write.
- The same landing logic applies to `/reset-password` follow-ups, which already redeem on submit, so nothing there changes.
