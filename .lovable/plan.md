# Email templates rollout

The upload delivers 28 email designs (`01–24` transactional + `25–30` auth) to replace what the app sends today. Nothing about the design system, roles, or app copy changes elsewhere.

## Phase 1 — Auth emails (25–30, drop-in)

Rewrite the six React Email templates under `supabase/functions/_shared/email-templates/` so each one returns the exact HTML from the corresponding file in the upload (`signup` → `25`, `recovery` → `26`, `invite` → `27`, `magic-link` → `28`, `email-change` → `29`, `reauthentication` → `30`), with the merge tokens replaced by the props already passed by `auth-email-hook` (`confirmationUrl`, `token`, `oldEmail`, `newEmail`, `siteUrl`).

Update `EMAIL_SUBJECTS` in `auth-email-hook/index.ts` to the new subjects (all ending in `| Minerva IMS`). No signature or hook contract changes; auth flow keeps enqueuing through `process-email-queue`. Deploy `auth-email-hook`.

## Phase 2 — Transactional templates (01–24)

### 2a. Seed the templates
Migration to insert/upsert rows into `auto_email_templates` for the 22 new keys (numbers 14 and 22 are intentionally dropped by the design brief):

```
application_received, rejection_pre_interview, interview_invitation,
rejection_post_interview, offer_to_join, acceptance_received,
acceptance_reminder, offer_expired, newsletter_applications_open,
newsletter_applications_closing, newsletter_public_event,
ws_complete_profile, ws_role_assignment, ws_expulsion_alert,
ws_expulsion, ws_deadline_overdue, ws_fee_collection,
ws_membership_reminder, ws_internal_event, ws_alumni_call,
ws_association_on_display, general_communication
```

Each row stores: `key`, `name`, `subject` (from the design), full HTML `body` (raw HTML string from the upload — keeps `{{token}}` placeholders intact so admins can edit copy in the workspace UI), `connected` = true for wired keys, false for the ones we ship as editable-only (`ws_expulsion_alert`, `ws_expulsion`, `general_communication`). Superseded legacy seeds (`candidate_status`, `event_registration`, `membership_confirmed`, `fee_reminder`, `newsletter_welcome`) are left in place and marked `connected = false` so nothing already displayed disappears from the admin list.

### 2b. Shared enqueue helper
Add `supabase/functions/_shared/send-transactional.ts` exporting one function:

```ts
sendTransactional(supabase, { key, to, cc?, variables })
```

It loads the row from `auto_email_templates` by `key`, substitutes `{{var}}` placeholders in `subject` + `body` (safe HTML-escape for values), writes a `pending` row in `email_send_log`, and calls the `enqueue_email` RPC on the `transactional_emails` queue with `from: 'Minerva IMS <noreply@minervaims.org>'`, `sender_domain: 'notify.minervaims.org'`, `purpose: 'transactional'`, and a `cc` header when the template's `key` is in the CC-required set (`02, 04, 05, 08, 09, 10, 11, 16, 18, 20, 21, 23`). Fire-and-log-on-error so a mail failure never blocks the underlying admin action.

### 2c. Wire triggers into existing edge functions
Minimal edits — call `sendTransactional` after the existing DB write in each place:

- `submit-application` → `application_received` (01)
- `admin-applications` `update-status`:
  - `rejected_pre_interview` → `rejection_pre_interview` (02)
  - `interview_invitation_sent` → `interview_invitation` (03)
  - `rejected_post_interview` → `rejection_post_interview` (04)
  - `offer_sent` → `offer_to_join` (05)
  - `accepted` (candidate reply recorded) → `acceptance_received` (06)
  - `offer_expired` → `offer_expired` (08)
- `admin-fees` `open`/`close` → `ws_fee_collection` (18) to each unpaid member on open, `ws_membership_reminder` (19) on second-deadline reminder action
- `admin-events` publish flow → `newsletter_public_event` (11, all newsletter subscribers) and `ws_internal_event` (20, active members) depending on visibility
- `admin-alumni-calls` create → `ws_alumni_call` (21) to eligible members
- `admin-aod` publish → `ws_association_on_display` (23) to members
- `admin-members`:
  - approval / status = active → `ws_complete_profile` (12)
  - role change → `ws_role_assignment` (13)
  - overdue deadline detected by existing job → `ws_deadline_overdue` (17)
- `admin-settings` (applications period) open/closing → `newsletter_applications_open` (09) / `newsletter_applications_closing` (10) to newsletter subscribers
- `acceptance_reminder` (07) → new pg_cron job (2 days after offer_sent) invoking a small `admin-applications` action `reminder-tick`

Newsletter and member fan-out iterates rows and enqueues one message per recipient (the queue worker throttles). Bulk enqueues chunk by 100 to keep function runtime bounded.

### 2d. Templates 15, 16, 24 (editable-only for now)
`ws_expulsion_alert`, `ws_expulsion`, `general_communication` are seeded and previewable in the admin UI, but not auto-fired — expulsions are triggered manually from the admin workspace, and 24 is a one-off compose. A follow-up can add a "Send" button in the workspace.

### 2e. Deploys
Deploy: `auth-email-hook`, `submit-application`, `admin-applications`, `admin-fees`, `admin-events`, `admin-alumni-calls`, `admin-aod`, `admin-members`, `admin-settings`.

## Technical details

- Logo URL in every template stays as the currently working `archive-files/mims-logo.png`; no asset uploads required.
- `{{token}}` substitution uses a shared helper that (a) rejects unknown keys silently, (b) HTML-escapes values by default, (c) allows a `raw: true` per-key opt-in for `poster_block` in template 20 which needs an injected `<tr>`.
- Cc is passed as `headers.Cc` in the enqueue payload; `process-email-queue` already forwards SMTP headers.
- No schema changes beyond the seed rows.

## Confirm before I build

Two open questions before I start writing code — the plan above assumes:

1. **Trigger points**: wire only the flows listed above; anything that currently sends nothing (e.g. deadline overdue, acceptance reminder cron) I'll implement as small additions to the existing admin functions plus one new cron job. OK, or should I leave the "not-yet-triggered" ones (07, 12, 13, 17) as editable-only for a later pass?
2. **Newsletter fan-out volume**: `newsletter_public_event` (11) sends to every row in `newsletter_subscribers` (currently ~500). The queue can handle it but it's a real send. Should I stage this behind an explicit "Send newsletter" button in the admin UI rather than firing automatically when an event is published?
