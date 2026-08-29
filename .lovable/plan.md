# Why non-auth emails never arrive

## The error

Every app email (application received, interview invitation, offer, rejection, welcome…) fails with the same provider response:

```text
Email API error: 404 {"type":"run_not_found","title":"Run not found or expired"}
```

It is retried 5 times, then dead-lettered. The queue currently holds 16 permanently failed app emails. Sign-up, login and password-reset emails are unaffected — they are sent on a different path.

## Root cause (confirmed)

Auth emails and app emails are enqueued by two different pieces of code:

- Auth emails come from the auth webhook, which receives a **real `run_id`** issued by the email service and passes it through. The service recognises it, so the send succeeds.
- App emails are enqueued by the database helper `enqueue_app_email`, which **fabricates a random `run_id`** (`gen_random_uuid()`). No such run exists on the email service, so every send is rejected with `run_not_found`.

Two secondary defects in the same helper would block sending even after the `run_id` is fixed:

- No `idempotency_key` — required for the service to create the run inline for an app email, and what prevents duplicate sends on retry.
- No `unsubscribe_token` — app emails are rejected without one, and no suppression check is performed, so unsubscribed or bounced addresses would still be attempted.

Separately: the templates `ws_*` (workspace notices, fee collection, role assignment, expulsion, deadlines, AoD, alumni call) and `newsletter_*` are marked connected but **nothing in the app ever triggers them** — they can only be authored, not sent.

## Fix

1. Rewrite `enqueue_app_email` so the queue payload matches what the sender expects:
   - drop `run_id` entirely (the service creates the run from `purpose: transactional` + idempotency key),
   - add a deterministic `idempotency_key` (template key + recipient + message id),
   - look up or create the recipient's row in the unsubscribe-token table and include the token,
   - skip and log as `suppressed` when the recipient is on the suppression list,
   - keep the existing pending log row and HTML wrapper unchanged.
2. Re-trigger the 16 dead-lettered messages? They are stale recruitment mails from 23 August; recommendation is to leave them and not resend. Confirm if you want any resent.
3. Verify end-to-end by sending one app email to an address you own and checking it moves from `pending` to `sent`.
4. Optional follow-up (separate step, not in this fix): wire trigger points for the workspace and newsletter templates that currently have no sender.

## Which automatic emails are triggered, and when

Recruitment (all through `enqueue_app_email`):

| Email | Trigger |
| --- | --- |
| Application received | Application submitted (once per candidate) |
| Interview invitation | Status set to "interview invitation sent", and on division transfer |
| Interview booking confirmation | Candidate books an interview slot |
| Rejection (pre-interview) | Status set to rejected before any interview stage |
| Rejection (after interview) | Status set to rejected after an interview stage |
| Offer to join | President/Admin sends the offer |
| Offer reminder | Hourly job, 2 days after an unaccepted offer |
| Offer expired | Hourly job, 3 days after an unaccepted offer |
| Offer accepted / welcome | Candidate accepts, or is converted to member |

Authentication (working today, separate path): confirm e-mail on sign-up, password reset, magic link, invitation, e-mail change, re-authentication code.

Defined but never triggered: fee collection and membership reminders, complete-your-profile, role assignment, expulsion and expulsion alert, deadline overdue, internal event, Association on Display, alumni call, general communication, all three newsletters, event registration confirmation, membership confirmation, candidate status update.

## Technical notes

- Single change: a migration replacing `public.enqueue_app_email(text, text, jsonb)`. No Edge Function redeploy is required, since the queue worker already reads `idempotency_key` and `unsubscribe_token` from the payload and treats a missing `run_id` as "create inline".
- Grants stay as they are: execute reserved for `service_role`.
