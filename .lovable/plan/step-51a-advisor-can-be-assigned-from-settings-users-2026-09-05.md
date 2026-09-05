# Step 51a: Advisor can be assigned from Settings > Users

Follow-up to step 51. Apply the three files from the archive exactly as provided, then redeploy the users function. No database migration.

## What changes for you

- **Advisor appears in the role list** in Settings > Users, so the page can finally grant the role it exists to grant.
- **The Role field is never blank again.** When someone holds a role this page cannot assign (alumni, candidate, pending, admin), it is shown at the top, marked "(current, set elsewhere)" and greyed out, so an existing advisor can no longer be accidentally demoted with no way back.
- **A short amber note** appears only when moving someone to Advisor, explaining that they become read-only, leave the membership fee, are hidden from the public Members page until switched on, and that this grants the role only and does not add them to the alumni directory.
- **Membership fee stays correct in both directions:** moving into an advisory role marks them exempt, clears unpaid amounts for open collections and hides them from the website; moving out returns them to the paying membership. Any payment already banked is kept, and an individually waived fee survives an ordinary role change.

## Technical details

Replace, byte-for-byte from `minerva-step-51a.zip` (no new or deleted files, `.git` metadata excluded):

- `src/components/admin/UserManagement.tsx`
- `src/lib/workspace-guide.ts`
- `supabase/functions/admin-users/index.ts`

Then redeploy the `admin-users` edge function. No migration.

## Verification

Typecheck and build after copying, then live check: assign Advisor to a test account while a fee collection is open and confirm they leave Operations > Membership Fee and read as exempt and hidden in People > Members; also open the edit dialog on an existing advisor and on an alumnus to confirm the Role field reads correctly.
