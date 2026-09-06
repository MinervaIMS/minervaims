# App emails and membership fee payment details

## Email changes (12 items requested, 10 need edits)

Templates live in one file of email designs (`supabase/functions/_shared/transactional-emails.ts`); saved copies in the database are refreshed from it automatically, and the Automatic Emails page will show the new versions.

1. **Acceptance received** — button now opens the workspace dashboard (`/workspace/dashboard`) instead of the sign-in page.
2. **Acceptance reminder** — replace the reply-by-email paragraph with: "To accept, sign your offer in the Minerva Workspace. Then complete your profile." Button becomes "Sign Your Offer", pointing to the candidate offer page (`/workspace/applications/offer`).
3. **Application received** — "about two weeks" becomes "about 10 days"; button becomes "Monitor Application", pointing to the candidate application status page (`/workspace/applications/status`).
4. **Interview booking confirmation** — the detail row label becomes "Division" and shows the division only; examiner name removed.
5. **Interview invitation** — "open Application → Interview Calendar" becomes "open Interview Calendar".
6. **Offer expired** — unchanged.
7. **Offer to join** — the two bullet points replaced by: "Log in into the Minerva Workspace (minervaims.org/auth), sign your offer to join and complete your profile." Remove "There is nothing further to prepare." Deadline wording becomes "within 72 hours of receiving this email" everywhere it appears (heading, body, preview line). Button points to the offer page. Signature shows "Warm regards," then the current President's name on its own line, followed by "President of Minerva Investment Management Society".
8. **Rejection pre-interview / post-interview** — unchanged.

The President's name is currently a placeholder that nothing fills in. The sending code will look up the member holding the President role and pass the real name (falling back to "The President" if none is set).

## Workspace emails

9. **Complete your profile** — button points to My Profile (`/workspace/my-profile`). New weekly job every Monday at 09:00 Rome time, sending to active members who have no phone number or no profile photo, once per member per week.
10. **Fee collection** — sent at the moment a collection opens, only after the person opening it confirms in a dedicated pop-up ("Open collection and notify members" / "Open without emailing"). The email carries the semester, amount, first deadline and the payment details entered when opening.
11. **Membership reminder** — new daily check that, once the first deadline has passed, emails members who still have not paid in the open collection; each member is reminded once per collection.

## Membership fee payment details

In Operations → Membership Fees, the "open a collection" form gains required payment fields:

- Payment method (bank transfer / other)
- Account holder
- IBAN
- Payment reference to quote
- Optional extra instructions

A collection cannot be opened unless the required fields are filled, on screen and on the server. The details are stored with the collection, shown in the collection header, and inserted into both the fee-collection email and the reminder.

## Technical notes

- Files: `supabase/functions/_shared/transactional-emails.ts`, `admin-applications`, `admin-interviews`, `applicant-notify` (status/link constants point at the legacy `/admin` path and will be updated to the `/workspace` routes), `admin-fees`, `src/components/admin/MembershipFee.tsx`.
- Migration: add payment-detail columns to `fee_periods`; add `ws_reminder_sent_at` / `ws_profile_email_sent_at` tracking; add two `pg_cron` jobs — `ws_complete_profile_weekly` (`0 7 * * 1` UTC = 09:00 Rome) and `ws_fee_reminder_daily` (`0 8 * * *`), each calling a SQL routine that enqueues through the existing `enqueue_app_email` path with per-member one-shot claims so nothing sends twice.
- Cadence note: the weekly profile job runs once a week and the fee reminder once a day; both are cheap and only enqueue when there is something to send.
- Redeploy `admin-fees`, `admin-applications`, `admin-interviews`, `applicant-notify`; refresh the Automatic Emails list so the stored templates pick up the new bodies.

## Verification

- Build passes; preview each edited template in Automatic Emails and check wording, buttons and links.
- Try opening a collection with payment fields empty (blocked) and complete (pop-up appears, email queues once).
- Confirm the two scheduled jobs exist and select the right recipients.
