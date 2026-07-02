# Security Hardening — Bundle A

The uploaded zip contains a coordinated security-hardening patch: 1 SQL migration + updated code for 16 edge functions. No README is included, but the migration header documents the intent, and every edge function in the zip is a drop-in replacement for its current counterpart.

## What this changes

### Database (single migration)
`supabase/migrations/20260702120000_security_hardening.sql`

- **Fix privilege-escalation in `is_admin()`** — currently `is_admin()` grants admin to any user whose `profiles.email` equals `as.minerva@unibocconi.it`. Because the profiles UPDATE policy lets a user edit their own row (no column guard), anyone could set that email and become admin. New version relies **only** on `user_roles` (`admin` or `president`). The seed admin still gets the `president` role via `handle_new_user()`, so real admin access is unaffected.
- **Lock `profiles.email` from client updates** — new `lock_profile_email()` BEFORE UPDATE trigger silently reverts any email change coming from a client. Email is set from the authenticated identity at signup and stays immutable.
- **Restrict EXECUTE on SECURITY DEFINER functions**:
  - RLS helpers (`is_admin`, `is_staff`, `is_candidate`, `is_full_access`, `has_role`, `user_divisions`): revoked from `anon`/`PUBLIC`, granted to `authenticated` only (RLS still needs them).
  - Trigger / maintenance functions (`handle_new_user`, `project_member_to_team`, `cleanup_expired_candidates`): revoked from everyone — only the trigger runtime and `service_role` invoke them.

### Edge functions (drop-in replacements, 16 files)
All under `supabase/functions/`:
`admin-alumni-calls`, `admin-alumni`, `admin-aod`, `admin-applications`, `admin-auto-emails`, `admin-event-reg`, `admin-fees`, `admin-funds`, `admin-members`, `admin-resources`, `admin-smm`, `admin-team`, `admin-treasury`, `member-profile`, `register-event`, `submit-application`.

These carry the matching server-side hardening (tightened auth checks, input validation, role checks that no longer rely on the email shortcut, etc.). Each file is replaced wholesale with the version from the zip.

## Execution

1. Overwrite each of the 16 `supabase/functions/*/index.ts` files with the zip version (identical paths).
2. Create the migration file `supabase/migrations/20260702120000_security_hardening.sql` with the exact SQL from the zip and submit it via the migration tool for approval.
3. No frontend / `src/` changes; no config or secret changes; no new tables (so no new GRANT block needed beyond what the migration already includes).
4. Verify with `tsgo` (types) and the Supabase linter after migration approval.

## Risk notes

- After the migration, the only path to admin is a row in `user_roles` with role `admin` or `president`. Confirmed safe: `handle_new_user()` still inserts `president` for `as.minerva@unibocconi.it`, so the seed admin keeps access.
- `profiles.email` becomes effectively read-only from the client. If any UI currently tries to update it, the write will be silently ignored (no error). Worth flagging if such a UI exists — I'll grep during build.
