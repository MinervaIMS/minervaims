The Calendar section exists in NAV with empty `subItems`, but `filterNav` (line 161) drops any section without subItems unless its key is `my-role` or `dashboard`. So Calendar is being filtered out.

**Change:** In `src/pages/MinervaWorkspace.tsx` line 161, add `s.key === 'calendar'` to the keep condition:

```ts
.filter((s) => s.key === 'my-role' || s.key === 'dashboard' || s.key === 'calendar' || s.subItems.length > 0);
```

That's it — single-line fix.