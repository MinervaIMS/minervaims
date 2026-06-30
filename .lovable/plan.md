## Phase 0 — Workspace Foundation

Apply the uploaded zip exactly as supplied: 3 database migrations, then code files.

### 1. Database migrations (3 separate executions, in order)

Each migration is run on its own because the first one adds enum values that Postgres cannot use in the same transaction.

1. `20260630120000_phase0_enums.sql` — adds new `app_role` values (`head_of_division`, `team_leader`, `analyst`, `media_analyst`, `advisor`, `silent_advisor`, `candidate`, `alumni`) and creates the `org_division` enum.
2. `20260630120100_phase0_members.sql` — adds `user_roles.division`, backfills it, remaps legacy `head_of_<div>` roles to `head_of_division`, creates `public.members` (canonical roster, RLS-gated), adds `team_members.member_id`, installs the members→team_members projection trigger (public-safe columns only), seeds members from existing `team_members`, and adds the `is_staff` helper + RLS read policies. Grants: `SELECT` to `authenticated`, `ALL` to `service_role`.
3. `20260630120200_phase0_access_and_lifecycle.sql` — adds `is_candidate` / `is_full_access` / `user_divisions` helpers, creates the empty `role_permissions` overlay table, adds `application_settings.start_date` / `end_date` / `auto_open`, creates `cleanup_expired_candidates()` and (best-effort) schedules it daily via `pg_cron`.

The three SQL files will be issued as three separate `supabase--migration` calls.

### 2. Code files

New files:
- `src/lib/roles.ts`
- `src/lib/access/matrix.ts`
- `src/hooks/useAccess.ts`
- `supabase/functions/admin-members/index.ts`

Replaced files (the zip versions overwrite the current versions):
- `src/contexts/AuthContext.tsx` — loads `user_roles.division`; uses a narrow type cast so it compiles before `types.ts` is regenerated.
- `src/hooks/usePermissions.ts` — becomes a compatibility shim over `useAccess` so existing pages keep working.
- `src/pages/MinervaWorkspace.tsx` — candidate-only nav + render guard; role labels via the new role×division model.
- `supabase/config.toml` — registers `admin-members` with `verify_jwt = false`.

### 3. Post-migration follow-ups

- Regenerate Supabase TypeScript types so `members`, `role_permissions`, and `user_roles.division` are typed (removes the defensive cast in `AuthContext`).
- Optionally enable `pg_cron` for automatic candidate cleanup (otherwise call `select public.cleanup_expired_candidates();` from a scheduled edge function).
- Verification queries from the README:
  ```sql
  select role, division, count(*) from public.user_roles group by 1,2 order by 1,2;
  select count(*) from public.members;
  select count(*) from public.team_members where member_id is null; -- expect 0
  ```

### Order of execution

SQL migrations first (one approval per migration), then code files in parallel. The frontend compiles before types are regenerated thanks to the cast in `AuthContext`; the `admin-members` function and Phase 1 People pages require the tables to exist, which is why SQL leads.

### Scope guard

No public page is restyled. Internal fields (phone, email, fee/membership/account status) live only on `public.members` behind RLS; the projection trigger writes only public-safe columns to `team_members`.
