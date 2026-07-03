## Finding is already addressed in the current code

`supabase/functions/admin-treasury/index.ts` already gates the entire function on `canManage` before dispatching any action:

```ts
const canManage = user.email === 'as.minerva@unibocconi.it'
  || roles.some((r) => MANAGE.includes(r));
if (!canManage) return json({ error: 'Access denied' }, 403);
```

This runs before the `action === 'list'` branch, so unauthorized authenticated users (candidates, members, analysts, etc.) already receive `403 Access denied` when calling `list`. The redundant `if (!canManage)` inside the `add` branch is harmless dead code.

The scanner's report reflects an older version of the file.

## Proposed action

1. **Mark the finding as fixed** via `security--manage_security_finding` with an explanation that the global `canManage` gate at the top of the handler already covers the `list` action (defence verified by code inspection).
2. **Optional tiny cleanup** (only if you want it): remove the now-redundant `if (!canManage) return json({ error: 'Access denied' }, 403);` line inside the `add` branch, since it's already enforced above. No behaviour change.

## What I will NOT do

- No new authorization logic — it's already correct.
- No changes to other files or other findings in the More panel (those are separate items you haven't asked about).

## Verification

- Re-read the file to confirm the top-level guard is intact.
- After marking fixed, the scanner entry disappears from the security panel.

Confirm and I'll (a) mark the finding as fixed, and (b) optionally drop the redundant inner check.
