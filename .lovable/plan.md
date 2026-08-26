# Remove Giovanni Bianchi (Analyst) Completely

## What exists today

A search across the whole codebase and database found exactly two records for him, both created on 23 Aug 2026:

- `members` — Giovanni Bianchi, Portfolio Management, role `analyst`, status active, fee unpaid, no linked login account (`user_id` is empty), phone on file, email set to `riccardo.colo.04@gmail.com`.
- `team_members` — the matching public Team page card (Analyst, Portfolio Management), linked to the member record above.

Nothing else references him: no membership fee rows, no semester roster entries, no activity-log traces, no AoD sign-ups, no event registrations, no interviews or applications (those were already cleared previously), no readings, no testimonials, no alumni entry, and no auth account. His name does not appear anywhere in the source code.

## What will be done

A single database migration that deletes:

1. The `team_members` card (removes him from the public Team page, the org chart and the workspace Team Management list).
2. The `members` record (removes him from User Management, Membership Fees candidates, rosters and every member count).

Because his email on the member record is a personal address already used elsewhere (newsletter list), that newsletter subscription stays untouched — only the member/team records go.

No code changes are needed. After the migration, member and team counts on the dashboard and public pages drop by one automatically.

## Verification

Re-run the name search across all people-bearing tables to confirm zero rows remain, and confirm the Team page and User Management no longer list him.
