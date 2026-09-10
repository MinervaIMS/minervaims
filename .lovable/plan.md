# Fix: Portfolio Managers and Team Leaders cannot add notes on candidates

## What is happening

Portfolio Managers and Team Leaders are allowed to write notes on candidates — the permission rule exists, the note box appears, and the server accepts their notes.

But Candidate Screening is a "view only" page for these two roles (they may read candidates, not change their status). The workspace has one global rule that fades out every action button on a view-only page, and that rule catches the "Add note" button too. So the button is greyed out and nothing happens when they click it, exactly as in the screenshot.

## The fix

Allow the note box and its "Add note" button to stay active on Candidate Screening for the roles that are explicitly permitted to comment, while everything else on that page stays read-only for them (no status changes, no transfers, no offers).

Nothing changes for any other role, any other page, or the server-side checks.

Note: on screens narrower than 1024px the whole workspace stays read-only for everyone, per the existing rule, so notes stay disabled on phones and small tablets. Say the word if you want notes to work there too.

## Technical details

1. `src/components/admin/ReadOnlyRegion.tsx`
   - Add `[data-ro-allow]` to the `KEEPS_WORKING` selector list: an explicit, opt-in escape hatch for a control that a view-level role is genuinely permitted to use. Documented next to the existing `data-ro` note.

2. `src/components/admin/recruiting/CandidateProfile.tsx`
   - New optional prop (e.g. `notesAllowedInReadOnly?: boolean`).
   - When true, render `data-ro-allow` on the note `Textarea` wrapper and on the "Add note" button, so the sweep leaves them live. Existing `disabled={savingNote || !noteText.trim()}` logic unchanged.

3. `src/components/admin/CandidatesManagement.tsx`
   - Pass `notesAllowedInReadOnly` = `hasSpecial('applications-screening', 'candidates_notes_only') && !viewingArchived && isDesktop` (via `useIsDesktop`), keeping the mobile read-only policy intact.
   - `canAddNotes` stays as it is.

4. `src/components/admin/NewJoiners.tsx` (Offers) uses the same `CandidateProfile`; apply the same prop there so the behaviour is consistent for these roles.

No schema change, no edge-function change: `admin-applications` already accepts `add-note` from `team_leader` and `portfolio_manager` within their division scope.

## Verification

- Build/typecheck.
- Sign in as a Team Leader / Portfolio Manager in a desktop-width session, open a candidate in their division, confirm the note saves and appears in the shared notes list, and confirm the status control and transfer remain disabled.
