## Problem

Confirmed via database inspection: `criccardo480@gmail.com` exists again with role `member` and **zero** applications on file. That means the applicant's `auth.signUp` succeeded (the `handle_new_user` trigger stamped them `member`), but the follow-up `submit-application` call was skipped — most likely because on a retry Supabase returned the "already registered but unconfirmed" obfuscated response and `Apply.tsx` short-circuited straight to `/check-email` without submitting the application. When they later click "Go To Your Workspace", `useAccess.isCandidate` is `false` (they're `member`), so the workspace guard bounces them to `/pending-approval`.

## Fix strategy

Enforce the rule "an /apply signup is a candidate, never a member" at three layers so no single failure can flag them wrong, plus make the retry path actually submit the application.

### 1. Database: `handle_new_user` should never set `member` for /apply signups

Update the trigger to read `raw_user_meta_data ->> 'signup_source'`. When it equals `'apply'`, insert `role = 'candidate'` directly instead of `'member'`. Existing behaviour (president bootstrap, plain `member` for other signups) is preserved.

### 2. Frontend: tag the signup and cover the retry case (`src/pages/Apply.tsx`)

- Add `signup_source: 'apply'` to `supabase.auth.signUp` `options.data` so the trigger tags them candidate from the first insert.
- Obfuscated "already registered" branch: instead of navigating away silently, try `supabase.auth.signInWithPassword` with the entered password. On success, call `submit-application` with that user id, then continue to `/check-email` or `/apply?submitted=1`. On failure (wrong password / different account), show the current "email already registered — sign in to continue" toast and route to `/auth`.
- Move the `if (signUpData.session) navigate(...) else navigate('/check-email...')` step so it also runs at the end of the retry branch.

### 3. Frontend: candidate wins over member in the access check (`src/hooks/useAccess.ts`)

Change `isCandidate` from "candidate AND no other roles besides pending" to "candidate present AND no *staff* roles" — so a stray `member` row alongside `candidate` never demotes the applicant. Also update the workspace guard's `isMemberOnly` short-circuit in `src/pages/MinervaWorkspace.tsx` so that any user with an `applications` row is refreshed / treated as a candidate before `/pending-approval` is even considered (already partly there — extend it to also promote them locally via a direct `user_roles` fix-up call so the second render passes).

### 4. Cleanup

Delete `criccardo480@gmail.com` (auth user + profile + user_roles + newsletter_subscribers rows) via a data migration so the applicant can retry cleanly.

## Files touched

- `supabase/migrations/<new>.sql` — update `public.handle_new_user`; delete the stuck test account.
- `src/pages/Apply.tsx` — signup metadata, retry-with-signin path, ensure success navigation.
- `src/hooks/useAccess.ts` — candidate priority.
- `src/pages/MinervaWorkspace.tsx` — guard: if `applications` row exists, self-heal role to `candidate` before considering `/pending-approval`.

## Out of scope

No visual changes. No changes to other signup flows (`/auth` continues to create `member` accounts as today).
