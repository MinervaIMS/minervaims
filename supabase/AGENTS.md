Step 106 rules for the database (read with the root AGENTS.md).

Give a table that belongs to one page a read policy from `public.ws_views(auth.uid(), '<page key>')`, never from `public.is_staff`, and add the page to `public.ws_view_roles` with its roles generated from the access matrix, because `is_staff` is every account that is not a candidate, the page's roles are fewer, and a row the page hides could be read by asking the data API directly (`scripts/data-access.test.mjs`).

After `CREATE FUNCTION ... SECURITY DEFINER`, write `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon` (and `authenticated`, unless a signed-in account calls it) and `GRANT EXECUTE` to exactly its callers; a function the website or the workspace calls is also added to `for_visitors` or `for_accounts` in a new migration, because a function here can be called by everybody until it is taken away from both PUBLIC and anon: `enqueue_staff_email` was open to visitors for that reason (`scripts/data-access.test.mjs`).

Limit a function that writes or sends for people who are not signed in with `overLimit` (`supabase/functions/_shared/rate-limit.ts`, `public.request_rate_check`) and keep a typed name plain with `plainName`, because a script could otherwise use the form to send thousands of emails in the association's name, and the emails place a name as typed (`scripts/security.test.mjs`).

Let a visitor who is not signed in read an event only if the website shows it or its registration is open to non-members, in the `events` policy and in the `website_events` view alike, because the Events page hides internal events and the data API must not list them.

Let the `applicant-preview` function read only the stored applicant emails (`auto_email_templates`) and the sitting President's name, fill them with the sample of `_shared/applicant-preview.ts` exactly as the database fills a `{{placeholder}}`, and never send or write anything, because the preview must show what an applicant receives without reaching an applicant or a mailbox (`scripts/applicant-preview.test.mjs`).

Tell members in every fee email (collection, reminder, payment received) that leave and exchange do not exempt them, and link to My Profile > Membership with `?show=fee`, synchronised to the stored copies by migration as every email, each copy saved first into `auto_email_templates_backup` because a stored copy can be edited in the workspace (`20261117090000_fee_emails_leave_and_exchange.sql`).

Make the door list to print only in `event-door-list` (the order in `sheet.ts`, the page in `pdf.ts`, on the letterhead of `_shared/letterhead.ts`), for the roles that can open Events > Attendance, from the whole list and never the filtered view, with names and member or guest only (an address only where a name cannot be printed, never a ticket), because it is the paper copy a door relies on when the connection, the server or the phones fail, and it leaves the building (`scripts/door-list.test.mjs`).

Import into a function only from its own folder, `_shared` and packages, never from another function's folder, because a function is deployed with its own folder and `_shared` only: `event-door-list` could not be deployed while it read the letterhead from `membership-certificate` (`scripts/door-list.test.mjs`).
