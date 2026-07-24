## Problem

The public archive page and homepage carousel query `public.archive_files` and get:

```
401 permission denied for function is_staff
```

Root cause (verified): the SELECT RLS policy on `archive_files` is
`(status = 'published') OR is_staff(auth.uid())`. Step 19 revoked EXECUTE on `public.is_staff` from `anon`/`authenticated` — `information_schema.routine_privileges` now returns no grants for it. Because RLS `USING` expressions are evaluated as the caller's role, PostgREST short-circuits with a permission error on the function before the `OR` can resolve to true from the `status = 'published'` branch.

Other public RLS policies reference the same helper (`is_staff`) — every one of them is currently unreachable from `anon`/`authenticated` for the same reason.

## Fix

One-line migration restoring EXECUTE on the RLS helper functions that public policies depend on:

```sql
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated;
```

Scope: only `is_staff(uuid)`. It is a `SECURITY DEFINER` function that only reads `public.user_roles` and returns a boolean — safe to expose. No other functions, policies, or app code change.

## Verify

- Reload `/` and `/archive` — carousel and archive list render, no 401.
- Confirm `admin` routes still behave (they already use service-role via edge functions, unaffected).