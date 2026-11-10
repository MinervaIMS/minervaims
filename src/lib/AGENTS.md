Step 105 rules (read with the root AGENTS.md).

Show an event's number of places, places left and waiting list only to its organisers: `sees_event_places` (migration 20261109090100) names the admin account and the roles the matrix lets open Events > Create Event or Events > Attendance, `event_places` and `admin-event-reg` return the counts to them alone, and everybody else reads only whether places are limited and whether the event is full (`events-api.ts`), because the President asked that the numbers stay with the organisers (`scripts/event-places.test.mjs`).

Build Minerva's Track Record (/track-record, which /numbers now leads to) and its static copy from `track-record-page.ts` alone: the topics, their figures numbered in page order with one note each, the introduction saying once when the figures are true, and every past semester from `public_track_record`; the static copy reads the key figures the build embedded in index.html, because the page and what machines read must say the same thing to the digit (`scripts/track-record-page.test.mjs`, `scripts/static-pages.test.mjs`).

Exempt a member from a fee collection only through `admin-fees` (`set-exempt`, the President and the admin account) and the `exempt` columns of `membership_fees` (migration 20261109090400), never through `members.fee_status`, because an exempted person owes nothing, gets no reminder, sees no deadline and is not written into that semester's register (`scripts/fee-exemption.test.mjs`).

Link a report author with no public entry to `/archive?author=<name>` in `public_reports` (migration 20261109090300), and read that filter only through `reports-public.ts`, because authors who have left must still lead to their reports and never to somebody else's profile (`scripts/report-authors.test.mjs`).

Keep the company page at /company-relations under its stored key `partnerships`, and the Partnerships page (other student associations only, edited in Website > Partnerships through `admin-partnerships`) at /partnerships under the key `partners`, because hidden pages and old settings are stored by key (`scripts/partnerships.test.mjs`).

Let a non-member register for a "Bocconi community only" event (stored as `members_external`) only with an address on the one Bocconi list (`bocconi-email.ts`, mirrored in `supabase/functions/_shared/bocconi-email.ts`), checked by `register-event` as well as the form, because the form alone can be bypassed and the list must be the same one that decides who can sign up (`scripts/event-audience.test.mjs`).
