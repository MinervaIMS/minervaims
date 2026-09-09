# Staff notifications: interview bookings and offer outcomes

Feasible, and it can be built without touching any email that already works. Every new message is a brand-new template with its own on/off switch, added alongside the existing ones. No existing template, subject, trigger or recipient changes.

## What gets sent, to whom

Interview calendar (recipient: only the person who opened that slot, taken from the slot record itself — so if a division has two or three heads, only the one who created the slot is written to):

1. Slot booked — a candidate takes a slot.
2. Slot released — the candidate cancels. When a candidate reschedules (the system does this as "release, then book"), the head receives the release notice and then the new booking notice, which together read as a change.

Offers (recipients: every current head of the offer's division, plus the current President — resolved from roles at the moment of sending, never from a fixed address, so a change of President is picked up automatically):

3. Offer sent for the division.
4. Offer accepted by the candidate.
5. Offer declined by the candidate.
6. Offer expired because the candidate did not answer in time.

All six start from the general automatic-email layout (same header, purple band, footer, legal text) and are signed by the Operations Team. Each carries the candidate's name, the division, and — for interviews — the date, time and the examiner's own slot details; offers also carry the role offered and the deadline.

## Defaults I have assumed

- A head deleting or clearing their own slots does not email them about their own action.
- The Vice President is not copied on offer emails (only heads of the division and the President, as asked).
- Candidates receive nothing new; their existing emails are untouched.

Say the word if any of these should differ.

## Technical detail

Verified in the code and database before writing this:

- `enqueue_app_email` drops any identical template + recipient pair queued within the last five minutes (the duplicate fix from earlier). A head can easily receive two booking notices inside five minutes from two different candidates, so reusing it as-is would silently swallow the second. To avoid changing that function at all, add a sibling `public.enqueue_staff_email(p_key, p_to, p_vars, p_dedupe text)` — same body, but the duplicate window keys on template + recipient + `p_dedupe` (the application or slot id). `enqueue_app_email` stays byte-identical.
- Six new entries appended to `supabase/functions/_shared/transactional-emails.ts` (keys `staff_interview_booked`, `staff_interview_released`, `staff_offer_sent`, `staff_offer_accepted`, `staff_offer_declined`, `staff_offer_expired`), plus matching `auto_email_templates` rows inserted by migration with `connected = true`, and `application_email_map` documentation rows. Existing rows untouched; the sync in `admin-auto-emails` only updates rows whose key it already finds.
- Recipient resolution helper (new file `supabase/functions/_shared/staff-notify.ts`):
  - slot opener: `interview_slots.created_by` → `profiles.email`;
  - division heads: `user_roles` where `role = 'head_of_division'` and `division = <offer division>` (and `head_of_operations` / `head_of_media` for those two divisions) → `profiles.email`;
  - President: `user_roles` where `role = 'president'`.
  Every send is wrapped in try/catch so a failed notification can never block a booking, an offer or a status change.
- Call sites (additive only, after the existing success paths):
  - `admin-interviews` → `book` (after the candidate confirmation email) and `cancel`;
  - `admin-applications` → `send-offer`, and the `offer_accepted` status branch;
  - `applicant-notify` → `accept-offer` and `decline-offer`;
  - `process_offer_deadlines()` → recreated with its current logic unchanged and one added loop that enqueues the expiry notice for heads + President from the rows it already claims.
- Preview data added to the template registry so all six can be read and edited in Operations → Automatic emails like the others.
- Deploy `admin-interviews`, `admin-applications`, `applicant-notify`, `admin-auto-emails`. No frontend change, no schema change to existing tables.

## Verification

Run one end-to-end rehearsal on a throwaway candidate: book, cancel, rebook, then send/accept an offer, checking `email_send_log` shows one `sent` row per event and per recipient, and that two bookings inside five minutes both go through. Clean up the test records afterwards, as before.
