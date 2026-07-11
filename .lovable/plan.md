## Root cause

I checked `criccardo480@gmail.com` in the database. The account exists and its email is verified, but:
- `user_roles` = `['member']` (only)
- `applications` = 0 rows

That single fact explains everything.

**How a candidate ends up with `member` role and no application:**

1. On any signup, the DB trigger `handle_new_user` unconditionally inserts `user_roles.role = 'member'`. So every fresh account starts as a member, even one going through /apply.
2. The Apply page then calls the `submit-application` edge function, which is supposed to overwrite that row with `candidate` and insert the application record. If that call fails (edge function error, network blip, silent retry that treats a non-"already" error as "already", email verification arriving before the second retry, etc.), the account is left as **member only, no application row**.
3. `MinervaWorkspace` guard (line 305-315) reads: "no full access, not a candidate, only a `member` role" → redirect to `/pending-approval`.
4. `PendingApproval` (line 19) only bounces users who have a role other than `member`. A member-only user is exactly the case it was designed to hold — so the applicant is stuck.
5. Even in the happy path, the client-side `roles` array in `AuthContext` is populated once on `SIGNED_IN`. If the role flipped from `member` to `candidate` server-side during the Apply submit (which happens before the session exists), the client can still see the stale `member` row after email verification because nothing forces a re-fetch — reproducing the same trap.

Additional issues confirmed:
- The "Go to your workspace" button on the success card is not title-cased.
- There is no client-side safety net: if the role never becomes `candidate` on the client, the applicant has no way out.

## Fix strategy

Two layers, so the loop can never trap an applicant again:

**A. Server side — make the role transition atomic and self-healing.**
A single DB trigger on `applications` insert that reconciles `user_roles` for the applicant: delete `member`/`pending` rows for that user, insert `candidate` if missing. This runs inside the same transaction as the application insert, so as soon as an application row exists the role is guaranteed to be `candidate` — independent of whether the edge function's own `delete/insert` succeeded, and independent of any client refresh timing.

**B. Client side — guards defer to the application row, not just the role.**
`MinervaWorkspace` and `PendingApproval` both stop treating "member-only" as "must wait for approval" without first checking whether the user has an `applications` row. If they do, they're a candidate whose role just hasn't hydrated locally — refresh roles once and route them into the workspace. If they still look like a member and have no application, then and only then send them to `/pending-approval`.

Plus the small UI fix on the success card, and cleanup of the stuck test account.

## Implementation

### 1. DB migration — atomic role sync on application

New migration `sync_candidate_role_on_application.sql`:

```sql
CREATE OR REPLACE FUNCTION public.sync_applicant_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_roles
   WHERE user_id = NEW.user_id AND role IN ('member','pending');
  INSERT INTO public.user_roles (user_id, role, division)
  VALUES (NEW.user_id, 'candidate', NULL)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_sync_role ON public.applications;
CREATE TRIGGER applications_sync_role
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.sync_applicant_role();
```

Also do a one-off backfill inside the same migration: for every `auth.users` row that has an `applications` row but no `candidate` role, delete their `member`/`pending` rows and insert `candidate` (this heals any historical candidates who slipped through).

Finally, in the same migration, delete the stuck test account so testing can resume cleanly:
```sql
DELETE FROM auth.users WHERE email = 'criccardo480@gmail.com';
```

### 2. `src/pages/MinervaWorkspace.tsx` — guard refinement

In the auth-gate effect (lines 296-322): before the current `isMemberOnly || hasNoRoles → /pending-approval` branch, query `applications` for the current `user.id`. If a row exists:
- call `refreshProfile()` (already exposed on the auth context) to re-pull roles,
- do not navigate to `/pending-approval` in this render — return and let the next roles-loaded pass evaluate again.
If no application row exists, keep the current behaviour (redirect to `/pending-approval`).

This is a small addition (one query, one conditional) inside the existing effect. No changes to `CANDIDATE_NAV` or to the render logic.

### 3. `src/pages/PendingApproval.tsx` — symmetric safety net

Extend the effect (lines 15-21): after `rolesLoaded`, if the user has only `member`/`pending` roles, query `applications` for the user. If a row exists, call `refreshProfile()` and `navigate('/admin', { replace: true })`. Otherwise, current behaviour.

### 4. `src/pages/Apply.tsx` — success card polish

In `SuccessScreen`:
- Change the button label from `Go to your workspace` to `Go To Your Workspace`.
- On mount (after the `applicant-notify` invoke), also call `refreshProfile()` from `useAuth()` so the freshly-inserted `candidate` role is in the client state before the user clicks through to `/admin`. Removes any race even in the happy path.

### 5. No other files touched

- `AuthContext.tsx` already exposes `refreshProfile` and the correct auth listener; nothing to change.
- `useAccess.ts` `isCandidate` logic is correct once roles reflect reality (after step 1 they always will).
- `handle_new_user` trigger is left as-is — changing it would affect the non-apply signup path (Auth.tsx) which legitimately needs `member` as the initial state.

## Result

- New applicants: signUp inserts `member` (trigger), submit-application inserts the row, the new `applications` trigger swaps them to `candidate` atomically. Email confirmation lands them on the success card; button (correctly capitalised) sends them straight into their candidate workspace view.
- Anyone whose client state lags behind the DB (or whose edge-function role write failed): the workspace/pending-approval guards see the `applications` row, refresh roles, and route them into `/admin` — they can never get stuck on `/pending-approval` again.
- Direct visits to `/admin` while logged out still redirect to `/auth` (unchanged).
- Historical candidates missing the `candidate` role are healed by the backfill.
- `criccardo480@gmail.com` is cleared so you can re-test end-to-end.
