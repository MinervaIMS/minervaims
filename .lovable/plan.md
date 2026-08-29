# Tom Petit — sign-up email report

## What the records show

- Account created 27 Aug, 15:46:44 UTC. The confirmation email was queued and accepted by the mail provider at 15:46:46 (logged as `signup` / `sent`, no error).
- The email address was confirmed at 15:47:20 — 36 seconds later — and a session was created at the same moment. Confirmation only happens when the link in that email is opened, so at least one delivery reached a mailbox or scanner.
- His roster record was claimed successfully: account approved, workspace role Head of Investment Research (Investment division), profile row present.
- He is not on the suppression list, and no failed or dead-lettered email exists for his address.

So nothing is broken on his account: he can sign in normally at `/auth` with the password he chose. If he does not remember it, "Forgot password" works (recovery emails to `@studbocconi.it` were accepted and sent as recently as 27 Aug for another member).

The plausible explanation for "no email received" is delivery filtering on the university mailbox (spam/quarantine) or the message arriving after he had already given up, since the provider accepted it and the link was subsequently opened. Per-message delivery events are not surfaced to the app, so we cannot prove inbox placement from here.

## Proposed work

1. **Immediate, no code:** ask him to check spam/quarantine for a message from `noreply@minervaims.org`, then simply sign in — his account is already active and confirmed.
2. **Add a self-service recovery path on the pending/auth screens** so this never becomes a support ticket:
   - "Resend verification email" button (rate-limited, disabled for already-confirmed accounts, with a clear "already verified — sign in" state).
   - "Check again" button on the pending-approval screen that re-runs roster redemption on demand instead of only on page load.
3. **Show a precise state instead of a spinner** when redemption cannot apply a role, so a user is never left on "loading your workspace".
4. **Deliverability note in the sign-up confirmation screen**: tell the user the message can land in the Bocconi spam/quarantine folder and name the exact sender address to whitelist.

## Technical notes

- Files touched: `src/pages/Auth.tsx`, `src/pages/PendingApproval.tsx` (UI states, resend/check-again actions).
- Resend uses the existing auth path (`supabase.auth.resend({ type: 'signup' })`) — no new email infrastructure; auth emails already flow through the working queue.
- Check-again calls the existing `claim_member_account()` function; no schema change required.
- No change to the app-email queue, which was repaired separately today.
