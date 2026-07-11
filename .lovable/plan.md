# Data cleanup

Targeted deletion of one test account, its application data, all interview slots, and the "trial" event.

## What will be deleted

**Account criccardo480@gmail.com** (user id `2d2293c2-…d13d`)
- 1 application row (+ any related application_notes, event_registrations, aod_signups tied to that user/email)
- 1 members row
- 1 profiles row
- 1 user_roles rows
- the auth.users record itself

**Interview slots**
- All 7 rows in `interview_slots` (no bookings currently reference them, so nothing else breaks)

**Event "trial"**
- 1 row in `events` (plus any `event_registrations` for that event)

## How

Single `insert` tool call running the DELETEs in the correct order (child tables first, then parents, then `auth.users`). No schema changes, no migration needed.

## Not touched

Newsletter subscription for that email is left intact unless you want it removed — say the word and I'll add it.
