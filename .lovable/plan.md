# Interview booking reminder email (24h after invitation)

A new app email, built on the exact layout of "You are invited to interview | Minerva IMS" (same purple strip, logo block, EB Garamond heading, footer, disclaimers), sent automatically to a candidate 24 hours after their interview invitation if they have not booked a slot yet. Signed by the Talent Recruiting Team.

## New email: `interview_booking_reminder`

- **Subject:** "Reminder: book your interview slot | Minerva IMS"
- **Heading:** "Don't forget to book your interview"
- **Body (same layout, buttons and links as the invitation):**
  - Dear {{first_name}},
  - Reminder: 24 hours ago you were invited to interview for the **{{division_name}}** division and you have not booked your slot yet. The booking window closes on **{{deadline}}** (72 hours from the invitation). If the deadline expires, we cannot guarantee a second interview invitation.
  - A prompt reply in organising the interview is well appreciated by the members who will be interviewing you.
  - If none of the available slots is suitable, write to as.minerva@unibocconi.it explaining your situation; only motivated and exceptional cases will be taken into consideration.
  - Button: "Book your interview" → https://minervaims.org/auth
- **Signature:** "Kind regards, The Talent Recruiting Team, Minerva Investment Management Society"
- Existing invitation email, booking flow, staff notices and all other templates: untouched.

## How it is sent (mirrors the existing offer-reminder pattern)

1. **Migration** — add two columns to `applications`: `interview_invited_at` (timestamp of the invitation) and `interview_reminder_sent_at` (one-shot guard, so no candidate is ever reminded twice). Backfill `interview_invited_at = updated_at` for candidates already at the invited stage so they are covered too.
2. **`admin-applications`** — when a status change sends `interview_invitation`, also record `interview_invited_at = now()` (one-line addition to the existing update; nothing else in the flow changes).
3. **`process_offer_deadlines()`** — extend the existing hourly pg_cron routine (already running for offer reminders/expiry) with one more loop: candidates at status `interview_invitation_sent` whose invitation is at least 24 hours old, who have no booking (status unchanged means no booking: booking advances the status), and who have not been reminded yet → enqueue `interview_booking_reminder` with `first_name`, `division_name`, `division_slug`, and the deadline (invitation time + 3 days, formatted), then stamp `interview_reminder_sent_at`. Once booked, the status changes and the reminder can never fire.
4. **Template registration** — add the template to `transactional-emails.ts`; the existing sync in `admin-auto-emails` writes it to the live templates table so it appears in Automatic Emails and can be previewed.

## Verification

- Build passes; template renders in Automatic Emails preview.
- Test: send the reminder to a test address through the queue and confirm content, button, deadline and signature.
- Confirm the hourly routine picks up exactly the right candidates (invited 24h+, unbooked, never reminded).
- Publish after approval.

## Technical notes

- Files: `supabase/functions/_shared/transactional-emails.ts` (new template), `supabase/functions/admin-applications/index.ts` (timestamp on invitation), one new migration (columns + extended `process_offer_deadlines`).
- The cron job already exists (`process_offer_deadlines`, hourly) — no new scheduler needed; the function body is replaced with the added loop.
- `enqueue_app_email` handles deduplication and the unsubscribe footer as with all other app emails.
