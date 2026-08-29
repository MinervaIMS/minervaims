# Why selection-process emails don't look like the "App emails" layouts

## What's happening

There are two different sources of email content, and they have drifted apart:

- The **App emails screen** renders the branded templates that live **in the codebase** (full Minerva layout: purple bar, logo lockup, EB Garamond headline, legal footer). The workspace list even overlays the code version on top of whatever is stored, so the preview always looks correct.
- The **actual sending path** does not use those. When the system enqueues a recruitment email it reads subject and body from the **database table of email templates**, then wraps it in a small generic shell (plain purple header strip, one-line footer).

The stored rows for the keys used during selection are old, short snippets — for example the "application received" row is 426 characters of bare `<p>` paragraphs, versus 7,800+ characters for the branded code template. Same for interview invitation (310), interview booking confirmation (1,517), offer to join (339), offer reminder (292), offer expired (215), welcome/acceptance (335), and both rejections (277 / 347). Those are what candidates receive.

Second, related problem: **key mismatch**. The triggers fire keys that have no branded code template, while the branded templates sit under different keys:

```text
trigger fires                  branded template exists as
rejection_no_interview     ->  rejection_pre_interview
rejection_after_interview  ->  rejection_post_interview
offer_accepted_confirmation->  acceptance_received
offer_reminder             ->  acceptance_reminder
```

So even after refreshing the stored bodies, four steps of the funnel would still send the old snippets.

## The fix

1. **Make the code templates the single source of truth at send time.** Sync the branded bodies and subjects from the code template set into the database rows, so the queue reads exactly what the App emails screen shows. Add this as an idempotent sync that runs whenever the workspace email screen loads (and once via migration), so future template edits in code propagate automatically instead of drifting again.
2. **Align the trigger keys** with the branded template keys (the four mappings above), keeping the old rows as inactive aliases so nothing in the history breaks.
3. **Stop double-wrapping.** The branded templates are complete HTML documents; the enqueue routine must send them as-is (only substituting variables and the unsubscribe link) instead of injecting them into the generic purple shell. The responsive/link normalisation already used for previews is applied on the same path so preview and delivery match byte for byte.
4. **Verify** with an end-to-end send per selection step: application received, interview invitation, interview booking confirmation, offer to join, offer reminder, offer expired, acceptance/welcome, rejection pre-interview, rejection post-interview — checking each queued message's stored HTML is the branded document and each reaches `sent`.

## Technical notes

- `public.enqueue_app_email` currently: selects `subject, body, connected` from `auto_email_templates`, substitutes `{{vars}}`, then concatenates a hardcoded wrapper. The wrapper concatenation is removed; the substituted body becomes the payload `html`, with plaintext derived from it as today. Suppression, unsubscribe-token issuance, `email_send_log` row and `enqueue_email` call stay unchanged.
- Template bodies come from `supabase/functions/_shared/transactional-emails.ts`, passed through `normalizeEmailLinks` + `withResponsiveShell` (the same pipeline `admin-auto-emails` uses for display) before being written into the table by the sync.
- Sync lives in `admin-auto-emails` (`list` action already merges code over DB — it will now also persist), plus a one-off migration so the current rows are corrected immediately without waiting for an admin to open the screen.
- Trigger key changes touch `applicant-notify`, `admin-applications`, `admin-interviews`, and the deadline-processing routine that fires reminder/expiry.
- Affected functions redeployed: `admin-auto-emails`, `admin-applications`, `admin-interviews`, `applicant-notify`.
