# Reset Riccardo Colombo to "to-redeem"

Goal: make `riccardo.colombo7@studbocconi.it` behave like a member whose roster profile exists but whose login has not yet been claimed, so that on next sign-in the redeem flow (`link_member_account`) runs and re-links him.

## Current state
- Auth user exists (`d29222b8-26f2-490c-9f6e-9a42145f749c`), email confirmed.
- Member row `Riccardo Colombo` (`d836fe67…`) already linked: `user_id` set, `account_status = approved`, `role = president`.
- `user_roles` for this auth user is `president` (assumed, from prior link).

## Change (single migration, data-only)
1. `UPDATE public.members` for the Colombo row: set `user_id = NULL`, `account_status = 'to_redeem'`. Roster identity (name, role=president, division, email) is kept so `link_member_account` can re-apply it on redeem.
2. `DELETE FROM public.user_roles WHERE user_id = 'd29222b8…'` and re-insert a single `('member', NULL)` row. This is required because `link_member_account` only promotes a user whose current `user_roles` is empty, `member`, or `pending` — leaving `president` in place would block re-application of the stored role.
3. Leave the `auth.users` row intact (do not delete the login). No password reset.

## Result
- Riccardo's next sign-in lands on `PendingApproval`, calls `claim_member_account()`, matches by confirmed email, and is re-linked to the same roster row with president role/division restored automatically.
- No effect on any other user or on `team_members` (the trigger re-syncs from the members row once redemption completes).

## Ask before running
- Confirm you want the auth login kept (not deleted). If you'd rather also remove the login so he re-signs up from scratch, say so and I'll add `DELETE FROM auth.users WHERE id = 'd29222b8…'` instead of step 2.
