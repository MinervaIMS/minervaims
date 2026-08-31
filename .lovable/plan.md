# Permanently prevent email scanners from consuming auth links

## Confirmed cause

The emails now point to Minerva-hosted pages instead of directly to the auth verification endpoint, but both destination pages immediately redeem the one-time token in a React `useEffect`:

- `/verify-email` automatically calls `verifyOtp` as soon as the page loads.
- `/reset-password` automatically calls `verifyOtp` as soon as the page loads.

This still fails when Microsoft Defender/Safe Links uses a browser-capable scanner that loads the page and executes JavaScript. The scanner reaches the Minerva page, the page performs the token-consuming POST automatically, and the user's later visit receives the “already used or expired” result shown in the screenshot.

## Implementation

1. **Turn both auth links into a true two-step flow**
   - On page load, read the token but do not verify it.
   - Remove the token from the visible address bar immediately and retain it only for the current browser tab.
   - Show a clear confirmation screen with an explicit `Confirm Email` or `Continue To Password Reset` button.
   - Call `verifyOtp` only from that button's click handler, which Safe Links does not trigger during URL inspection.

2. **Preserve recovery and verification behavior**
   - After a successful recovery confirmation, reveal the existing new-password form and update the password through the recovery session.
   - After successful email confirmation, continue to the intended same-origin destination.
   - Keep support for older hash/session-based links without automatically redeeming new token-hash links.

3. **Improve failure recovery**
   - Keep used/expired errors distinct from the initial confirmation state.
   - Password-reset failures link directly to requesting a new reset.
   - Verification failures provide a fresh-email path that collects the address when it is not available, rather than leaving only “Back To Sign-In”.
   - Prevent duplicate clicks while verification is in progress.

4. **Apply the protection consistently**
   - Use the same explicit-user-action rule for signup, invitation, email-change confirmation, and password recovery links.
   - Keep the current branded email layouts and scanner-safe Minerva-hosted URLs unchanged.

## Technical details

- Update `src/pages/EmailVerification.tsx` and `src/pages/ResetPassword.tsx`; no database migration is required.
- Token redemption remains a browser-side `verifyOtp` POST, but it moves from mount-time effects into button handlers.
- Validate any `next` destination as a same-origin path before navigation.
- Clear token-bearing query parameters with `history.replaceState` after capture to reduce accidental disclosure and prevent refresh-driven duplicate redemption.
- The token remains single-use; the change ensures only an intentional user action uses it.

## Verification

- Request fresh signup and recovery emails.
- Fetch each emailed Minerva URL and load it in a JavaScript-enabled browser without pressing the confirmation button; confirm the token remains usable.
- Open the same URL as the user, press the button, and confirm signup or password reset succeeds.
- Confirm a second redemption shows the correct used/expired state.
- Confirm legacy recovery links still work and both mobile and desktop layouts remain intact.
- Typecheck, build, deploy the affected auth-email function only if its generated URLs require adjustment, and test the live flow.
