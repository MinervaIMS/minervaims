## 1. Remove defensive cast in AuthContext

Generated types already include `members`, `role_permissions`, and `user_roles.division`. No regeneration step is needed — just clean up the temporary cast.

**File:** `src/contexts/AuthContext.tsx`
- Drop the `as unknown as UserRole[]` cast in `fetchRoles`; rely on the real generated row type, mapping it to the local `UserRole` shape if needed.
- Keep the `AppRole` / `OrgDivision` imports from `@/lib/roles`.

## 2. Schedule `cleanup_expired_candidates()` daily via pg_cron

Enable the extensions and register a daily cron job that calls the function directly (it's a SQL function, no HTTP needed).

**Step A — schema migration** (`supabase--migration`):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Step B — schedule the job** (`supabase--insert`, since cron rows are data, not schema):
```sql
SELECT cron.schedule(
  'cleanup-expired-candidates-daily',
  '0 3 * * *',  -- 03:00 UTC every day
  $$ SELECT public.cleanup_expired_candidates(); $$
);
```

The function is a no-op until `max(application_settings.end_date) + 1 month` has passed, so running it daily is safe.

## Verification

- `tsgo` typecheck passes after removing the cast.
- `SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-candidates-daily';` returns one row.

## Out of scope

- Edge-function fallback scheduler (only needed if you decline pg_cron).
- Any UI or behavioural changes.