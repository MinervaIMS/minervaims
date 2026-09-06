# Candidates cannot book their interview slot

## What is happening

I reproduced the problem by signing in as an invited candidate and opening the Interview page. The slots are listed correctly, but every "Book" button is rendered greyed out and unclickable — the button carries the workspace's read-only marker (`data-ro-disabled`), so it is being switched off by the interface itself, not by the server.

## Why

The workspace has a single guard (`ReadOnlyRegion`) that greys out every button on a page a person may only *view*. Candidates are granted their own pages at level "view" (in the candidate access list), because from a staff point of view a candidate manages nothing. The guard reads that literally and disables the candidate's own action buttons: booking an interview slot, and by the same logic the offer page's accept/sign button and any save on their own pages.

## The fix

Exclude candidates from the read-only guard in the workspace shell: when the signed-in person is a candidate, their own pages are their own record and are never treated as read-only. Their pages are exclusively candidate resources anyway, and every write they can attempt is still validated by the edge functions (booking still requires status `interview_invitation_sent`, correct division, and a free slot), so nothing about the actual security boundary changes.

## Technical detail

- `src/pages/MinervaWorkspace.tsx`: add `&& !access.isCandidate` to the `subsectionReadOnly` computation, with a short comment explaining why candidate pages are exempt.

No database, edge function or email changes are needed.

## Verification

- Sign in as the invited test candidate in the preview and confirm the "Book" buttons are enabled, complete a booking end to end, and confirm the application status moves to `interview_confirmed`.
- Confirm staff read-only pages are still greyed (open a view-only subsection with a non-full-access role).
