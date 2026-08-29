# Member account redeem: state of the flow and the gaps to close

## Short answer

The core mechanism works. What is not fully solid is the edge handling around it: a wrong email address, an unverified address, and a couple of role cases leave the person stranded on the holding page with no way forward except email.

## What is verified working today

- Both database triggers on the auth table are installed and enabled: one fires when an account is created already-confirmed, one when the email gets confirmed. Both call the linking function.
- The linking function is server-side only, matches strictly on the confirmed email, refuses to run for unconfirmed addresses, claims the roster row atomically (so two people can never take the same profile), applies the stored role and division to workspace access, and writes an activity-log entry.
- The manual wrapper a signed-in user can call for their own account is granted to signed-in users only, and is safe to call repeatedly.
- Roster state: 80 member rows are still unclaimed, all with an email set, all on the university student domain; 79 carry the "to redeem" status.
- Every role present on those unclaimed rows (analyst, division heads, portfolio manager, head of operations, head of media, advisor) maps to a role that has workspace access, so a successful redeem does land the person in the workspace.

## Gaps to fix

1. **Email mismatch is a dead end.** Registration currently accepts any email domain (the university-domain check is commented out for testing), while every roster email is a student-domain address. Someone registering with a personal address gets "no match" and sees only a mailto line. Fix: on the sign-up screen, state plainly that members must register with the exact address the association holds for them; on the holding page, offer a "try a different email address" route (sign out and register again) next to the contact link.

2. **No retry on the holding page.** The redeem call runs once per page load and then never again, so "unconfirmed email" and "no match" are terminal until a manual reload. Fix: add an explicit "Check again" action that re-runs the redeem, plus a resend-verification action in the unconfirmed case.

3. **Two role cases can loop forever.** The linking function skips applying the role when the roster role is member, pending, candidate or admin. In those cases the account keeps its default "pending" role, the page reports "linked — loading your workspace" and then never leaves. Fix: treat a claimed-but-role-less account as a genuine waiting state (show the awaiting-approval text, not "loading"), and handle a roster row marked admin explicitly rather than silently ignoring it.

4. **Status field not updated on all paths.** The claim sets the member row to approved, which is right; the plan keeps that, and additionally makes the workspace guard rely on the role rather than the loading state so no path depends on client-side timing.

## Technical notes

- Changes are confined to `src/pages/PendingApproval.tsx` (retry action, correct state for claimed-without-role, resend verification, change-email route), `src/pages/Auth.tsx` (sign-up hint about the registered address), and one migration to `public.link_member_account` for the role cases in gap 3.
- No change to the trigger wiring, the grants, or the atomic claim guard — those are correct as they stand.
- The university-domain restriction stays disabled unless you want it switched back on; say so and it goes into the same change.
