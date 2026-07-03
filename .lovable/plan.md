# Archive reports invisible — root cause & fix

## Issue
Every request to `archive_files` from the public site returns:

```
401 { "code": "42501", "message": "permission denied for function is_staff" }
```

The SELECT policy on `public.archive_files` is:

```
(status = 'published') OR is_staff(auth.uid())
```

Postgres evaluates the whole `USING` expression, so it needs `EXECUTE` on `public.is_staff(uuid)` for whichever role is calling — here `anon` (and `authenticated` non-staff users). That grant is missing, so PostgREST rejects the query before RLS filtering ever runs. Result: no reports load on `/archive`, homepage "Latest Reports", or division pages.

Nothing changed in the frontend — this is a backend permission gap on the SECURITY DEFINER helper.

## Fix
Run a migration that grants EXECUTE on the helper functions used inside RLS policies to the roles that hit those policies:

```sql
GRANT EXECUTE ON FUNCTION public.is_staff(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_full_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate(uuid)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
```

These are all `SECURITY DEFINER STABLE` and only read `user_roles`, so exposing EXECUTE is safe — they already run with elevated privileges by design, and the anon path (`auth.uid()` is null) simply returns false.

## Verification
- After the migration, re-load `/archive` — the `archive_files` GET should return 200 with the published rows.
- Confirm homepage "Latest Reports" carousel populates again.
- No frontend changes required.
