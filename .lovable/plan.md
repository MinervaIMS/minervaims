## Phase 1 — People & My Profile

Apply the Phase 1 bundle on top of Phase 0. No behavioural surprises: one schema change, one new edge function, one updated edge function, three new frontend files, one workspace page replacement.

### 1. Database migration (`supabase--migration`)
`supabase/migrations/20260630120300_phase1_members_fee.sql`:
```sql
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fee_status text NOT NULL DEFAULT 'unpaid'
    CHECK (fee_status IN ('paid','unpaid','exempt'));
```
Adds the per-member fee status shown on the merged register. Phase 5 will drive it automatically; until then it is set manually.

### 2. Edge functions
- **New** `supabase/functions/member-profile/index.ts` — self-service profile for the logged-in user. Resolves/claims their member row (by email then full name → the "to_redeem" flow), and accepts edits only to `phone` + `photo_url`.
- **Updated** `supabase/functions/admin-members/index.ts` — now accepts `fee_status`.
- Deploy both via `supabase--deploy_edge_functions`.

### 3. `supabase/config.toml`
Add the `[functions.member-profile]` block with `verify_jwt = false`. No other entries change.

### 4. Frontend
- **New** `src/lib/members-api.ts` — typed CRUD over `members` plus the self-service / admin edge calls (also the single place that casts around the not-yet-regenerated Supabase types).
- **New** `src/lib/statute-extracts.ts` — role-specific statute text used by My Profile.
- **New** `src/components/admin/MyProfile.tsx` — My Profile page (edit phone + photo, see statute extract).
- **New** `src/components/admin/MembersManagement.tsx` — merged register; renders the Silent Advisors variant when `silentAdvisors` prop is set. Auto-ordered by seniority then alphabetical, division filter, search, CSV export.
- **Replace** `src/pages/MinervaWorkspace.tsx` — wires My Profile, People → Members, People → Advisors to the new components. The existing `TeamManagement` stays in the codebase (still powers the public Team page through the Phase 0 projection) but is no longer the workspace's editing surface.

### Execution order
1. Run the migration.
2. In parallel: write the four new/replaced frontend files, the two edge function files, and the updated `config.toml`.
3. Deploy `member-profile` and `admin-members`.
4. Run `tsgo` to confirm typecheck passes (cast in `members-api.ts` keeps it green even before Supabase types regenerate).

### After execution (manual, by the user)
- Types regenerate automatically after the migration runs; no action needed unless they want to remove the cast in `members-api.ts` later.
- In People → Members, set the **email** on each seeded `to_redeem` member so they can claim their account on first login. Full redemption mechanics are in `MINERVA_WORKSPACE_PHASE1.md`.

### Out of scope
- No changes to the public website, public Team page, or `team_members` table.
- No new RLS policies — the migration is purely additive on an existing table.