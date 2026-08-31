# Permanently prevent auth links from being spent before the user acts

## Step 1 - Confirm which agent redeems the token (do this first)

Two explanations produce the identical screenshot:

- a JavaScript-executing Safe Links / Defender detonation sandbox loads the page and the mount-time `verifyOtp` fires;
- the user burns their own token, because auto-redeem-on-mount also runs on remount, back-navigation, bfcache restore, or a refresh.

Read the auth logs for one failed attempt and inspect the IP and user agent of the request that actually redeemed the token. A Microsoft-owned range with a bot agent means Safe Links; the student's own address means remounting. The distinction decides how much weight the one-time-code fallback carries: the button gate fully cures the remount case, while a real detonation sandbox leaves residual risk.

Record the finding before writing any client code.

## Step 2 - Audit every template's link before touching React

This is load-bearing, not conditional. Any action type still emitting the platform confirmation URL points at the auth server's `verify` endpoint, where a plain GET redeems the token server-side and no client change can help.

Already confirmed from the code: the hook rewrites recovery, signup, invite, and email change into Minerva-hosted paths, but returns the raw `verify` URL unchanged for **magic link** and **reauthentication**.

Audit and fix all of them - signup, invite, magic link, email change (both the old and new address variants), recovery - so each carries the token hash plus our own path. Redeploy the auth email function as part of this step, not conditionally.

## Step 3 - Token capture that survives a refresh

Write the token hash and action type to `sessionStorage` first, then strip the query with `history.replaceState`, and read from `sessionStorage` on mount. Holding it only in a React ref means a refresh on the confirmation screen loses it permanently and the student needs a new email, which on mobile would happen constantly.

The stripping stays for tidiness, not as a security claim: Safe Links has already logged the full URL and browsers do not leak query strings cross-origin by default. Refresh survival is the real requirement. Clear the stored token once it is successfully redeemed.

## Step 4 - Recovery becomes a single step

Do not verify on arrival. Show the new-password fields immediately, and have one submit handler run the token verification and the password update back to back. The token then dies only on a real completion, so someone who opens the link, gets distracted and closes the tab loses nothing, and one screen disappears from the flow.

## Step 5 - Email confirmation behind an explicit action

Signup, invitation and email change keep a confirmation screen with a single button, and redemption happens only in that click handler - never in a mount effect. Guard against double clicks, distinguish "already used" from "expired", and offer a resend that collects the address when it is not in the URL, instead of leaving only "Back To Sign-In".

## Step 6 - One-time code as the fallback that cannot be pre-consumed

A sandbox that clicks buttons defeats every button-gated version of this. The platform exposes a six-digit code alongside the hash, and the branded templates already render it.

Accept that code on the same page: a short input under the primary action, verified with the address plus code. Nothing can type it on the student's behalf. If Step 1 confirms Safe Links is genuinely detonating links, make the code the primary instruction for `studbocconi.it` recipients, with the button as secondary.

## Technical details

- Files: the auth email hook and its link builder (all action types), `src/pages/ResetPassword.tsx`, `src/pages/EmailVerification.tsx`. No database migration.
- Redemption stays a browser-side POST, moved out of mount effects into submit and click handlers.
- Validate any onward destination as a same-origin path before navigating.
- Also raise the auth link lifetime so a message delayed in a university queue is still usable; if that setting is not reachable from here, state so plainly rather than leaving it silently unchanged.

## Verification

- Step 1 evidence recorded: the redeeming IP and agent for a real failure.
- Every action type's emailed URL points at a Minerva path carrying a token hash - checked by reading one real message per type.
- Load an emailed URL in a JavaScript-enabled browser without submitting: the token must still work afterwards.
- Complete signup and password reset as a normal user, then confirm a second use shows the correct used or expired state.
- Refresh the confirmation screen and confirm the flow still completes.
- Enter the six-digit code instead of using the link and confirm both flows complete.
- Typecheck, build, redeploy the auth email function, and exercise the live flow.
