## Goal

When an applicant successfully books an interview slot from the workspace "Interview Calendar", automatically send them a confirmation email that mirrors the on-screen confirmation card (division, date, time, examiner, meeting-link note) and matches the styling of the existing `interview_invitation` template.

## Changes

### 1. New template entry — `supabase/functions/_shared/transactional-emails.ts`

Duplicate the `interview_invitation` block (subject/body/frame) and adapt it:

- `key`: `interview_booking_confirmation`
- `name`: `Interview booking confirmation`
- `subject`: `Your interview is confirmed | Minerva IMS`
- Header pill: `Application · Interview Confirmed`
- H1: `Your interview is confirmed`
- Preview text: `Your {{division_name}} interview is booked for {{interview_date}} at {{interview_time}}.`
- Body reorganised into three sections, using the same typography/colours as the invitation template:
  1. Intro paragraph: `Dear {{first_name}}, your interview for the {{division_name}} division is confirmed. The details are below.`
  2. "Interview details" section — a plain table replicating the workspace card, one row per line:
     - Date: `{{interview_date}}`
     - Time: `{{interview_time}}`
     - Division / Examiner: `{{division_name}} · {{examiner_name}}`
     - Meeting link: `A member of the association will share the meeting link before the interview.`
  3. "Rescheduling & cancellations" section: reuse the invitation wording (cancel up to 90 minutes before via the workspace) plus a CTA button `Manage your booking` linking to `{{status_url}}`.
  4. Preparation reminder mirroring the invitation paragraph (Join page + division reports link using `{{division_slug}}`).
- Sign-off, footer, disclaimer, links: identical to the invitation template.
- No em dashes anywhere (use "·", " - ", or commas), matching project rule.

Variables consumed by the template: `first_name`, `division_name`, `division_slug`, `interview_date`, `interview_time`, `examiner_name`, `status_url`.

### 2. Trigger on successful booking — `supabase/functions/admin-interviews/index.ts` (`action === 'book'`)

After the `applications` status is flipped to `interview_confirmed`, enqueue the email (best-effort, wrapped in try/catch like `admin-applications`):

- Look up the slot fields already loaded (`slot.slot_date`, `slot.start_time`, `slot.end_time`, `slot.examiner_name` / equivalent — read once to confirm actual column names before writing).
- Format date as `Sunday, 12 July 2026` (`en-GB`, Europe/Rome) and time as `HH:MM – HH:MM` (en-dash), computed in the edge function.
- Resolve the human-readable division label from the existing `DIV_LABELS` map (import or duplicate the small map used in `admin-applications`); derive `division_slug` from the division key.
- `status_url`: reuse the same `STATUS_URL` constant used elsewhere for application status (`/workspace/...` — mirror what `admin-applications` uses).
- Call:
  ```ts
  await supabase.rpc('enqueue_app_email', {
    p_key: 'interview_booking_confirmation',
    p_to: app.email,
    p_vars: { first_name, division_name, division_slug, interview_date, interview_time, examiner_name, status_url },
  });
  ```

No changes to the DB, no changes to `LEGACY_KEYS_TO_DISCONNECT` (new key is connected from day one). Not added to `CC_KEYS` — this is a personal confirmation, not a broadcast.

### 3. Nothing else

- Registry auto-picks the new template from `TRANSACTIONAL_TEMPLATES` (the admin-auto-emails list merges by key).
- No frontend change: the workspace card already renders the on-screen confirmation.
- `send-transactional-email` handles rendering; no new function needed.

## Verification

- `bun run build` and Deno lint clean.
- Open `/workspace` → Auto emails: the new "Interview booking confirmation" appears as Connected, preview renders with placeholder variables.
- Manually invoke the book action against a test slot and confirm a row lands in `email_send_log` with the new key.
