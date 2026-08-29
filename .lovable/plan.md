# Password reset links "expired" for Bocconi accounts

## What the evidence shows

Both users' reset emails were generated and handed to the mail provider within ~1.3 seconds (send log: queued then sent), so the delay is not on our side. Each user then requested several resets in a row within minutes — the pattern of someone whose first link fails instantly, not of a link that runs out of time.

Two causes, both consistent with that pattern:

1. **The link is single-use and is being spent before the user clicks it.** The reset email contains a link to the auth server's `verify` endpoint carrying a one-time token. `studbocconi.it` is Microsoft 365, and its protection layer (Safe Links / Defender) opens links in messages to scan them. That scan is a normal request: the auth server consumes the token, redirects, and by the time the student clicks, the token is already used — the app then shows "This reset link is invalid or has expired." This is the primary cause and it explains why the failure looks instant regardless of how fast the user reacts.

2. **The reset screen can also declare a good link invalid.** `src/pages/ResetPassword.tsx` reads the session once, immediately on mount, and marks the link invalid if no session exists yet. The recovery session is established asynchronously by the auth client, so a slow phone can fail this check on a perfectly valid link.

Link lifetime (the auth OTP expiry) is a secondary factor: it should be raised, but on its own it does not explain a link failing seconds after arrival.

## The fix

**1. Stop email scanners from spending the token.** Send reset emails with a link to our own page carrying the token instead of the auth `verify` endpoint: `https://minervaims.org/reset-password?token_hash=...&type=recovery`. Opening that page does nothing by itself — the token is redeemed only when the page actively verifies it in the browser. A scanner fetching the page cannot consume anything.

**2. Redeem the token on the page, robustly.** `ResetPassword.tsx`:
- if `token_hash` is present, verify it in the browser to establish the recovery session, then show the form;
- otherwise fall back to the current session/hash detection, but wait for the auth client to finish (subscribe to the auth state change and allow a short grace period) instead of judging on the first read;
- only show "invalid or expired" after verification actually fails, and distinguish "already used" from "expired" in the wording, each with a one-click "Send me a new link".

**3. Raise the link lifetime** to 24 hours for recovery/signup links, so a message that sits in a university queue or quarantine is still usable when the student opens it.

**4. Same treatment for signup confirmation links,** which are affected identically (`EmailVerification` flow), so new members are not locked out by the same scan.

## Technical notes

- Files: `supabase/functions/auth-email-hook/index.ts` (build the app-hosted link from the hook payload's token hash and redirect target instead of passing the auth `verify` URL straight through), `supabase/functions/_shared/email-templates/recovery.tsx` and `signup.tsx` (unchanged markup, new URL value), `src/pages/ResetPassword.tsx`, `src/pages/EmailVerification.tsx`.
- Token redemption uses the client's `verifyOtp` with `token_hash` and `type` — a POST from the browser, invisible to link scanners.
- Auth settings: raise the email OTP/link expiry to 86400 seconds. No change to password rules or confirmation requirements.
- No database migration; no change to the email queue or the branded template layouts.

## Verification

- Drive the flow in a browser against a real reset link: confirm the form is enabled and the password updates.
- Simulate a scanner by fetching the emailed URL once with a plain GET before using it, then complete the reset — it must still work.
- Confirm a stale/used token shows the correct message with a working resend.
