## Phase 1 fixes (round 1) — code-only

Apply the eight files from `minerva-workspace-phase1-fixes.zip` exactly as shipped, then redeploy the one edge function. No DB migration this round.

### Files (overwrite at the same paths)

**New**
- `src/components/admin/WorkspaceLoader.tsx` — inline pulsing-logo loader for in-page workspace loads.
- `src/components/admin/RedeemProfileDialog.tsx` — first-login dialog: claim an existing placeholder member by name, or pick "I'm new here".

**Replace**
- `supabase/functions/member-profile/index.ts` — no longer silently creates a member; returns `needsRedemption` + claimable placeholders; never creates a member for the `admin` role; auto-claims by email match.
- `src/lib/members-api.ts` — updated typed API surface for the new redemption flow.
- `src/contexts/AuthContext.tsx` — also loads the member's `photo_url` so the header avatar can use it.
- `src/components/admin/MyProfile.tsx` — opens `RedeemProfileDialog` on first login when redemption is needed.
- `src/components/admin/MembersManagement.tsx` — drops fee column / fee selector / fee in CSV, filters out `admin` rows, adds Membership and Account-status filters, clickable LinkedIn icon, CSV always reflects current filters.
- `src/pages/MinervaWorkspace.tsx` — uses `PageLoader` for auth loading and `WorkspaceLoader` for in-page loads.
- `src/components/layout/Header.tsx` — one-line change: avatar uses the member `photo_url` (falls back to initials). No other visual change to the public header.

### Execution order
1. Write all 8 files from the zip to their target paths (parallel).
2. Deploy the `member-profile` edge function.
3. Run `tsgo` to confirm typecheck passes.

### Out of scope
- No SQL / migration.
- No changes to the public website beyond the single avatar-source line in `Header.tsx`.
- Phase 5 (Operations → Membership Fee) still owns the fee surface; removed from People here.
