# Division Reassignment Email

## What happens today

When a reviewer moves a candidate to be evaluated for another division, the candidacy returns to "To be invited", any interview slot is released, and the move is written to the activity log — but no email is sent. The candidate only hears from Minerva later, at interview invitation or offer.

## What we'll build

A new automatic email, **"Division reassignment"**, sent to the candidate the moment their evaluation division is changed.

### 1. New email template

A new template `division_reassignment` in `supabase/functions/_shared/transactional-emails.ts`, using the exact same branded shell as the existing emails (purple header band, Minerva logo, footer with legal links and disclaimers). Placeholders: `{{first_name}}`, `{{from_division}}`, `{{to_division}}`.

Subject (draft): "Update on your application | Minerva IMS"

Body content, per your instructions:
- The candidate's application is now being assessed by the **{{to_division}}** division rather than {{from_division}}.
- The reason: in the division of their first preference, other candidates presented stronger vertical profiles for that specific area.
- A candidacy can be moved between divisions **only once**, and the move **cannot be undone**.
- We hope they understand and that they will want to continue the selection process — no action is required from them; the new division will be in touch about next steps.
- Signed by the Talent Recruiting Team, same footer as the other emails.

The template also appears on the Settings → Automatic Emails page (the page syncs new code templates into its register automatically), and a migration inserts its row into `auto_email_templates` so it can be sent immediately without waiting for someone to open that page.

### 2. Send trigger

In the `admin-applications` back-end function, inside the division-reassignment action (`change-evaluation-division`): after the move is saved, enqueue the email through the existing `enqueue_app_email` queue with the candidate's name and both division names. A failure to send is logged but never blocks the reassignment — same pattern as the other automatic emails.

Nothing is sent when the move is refused (already-moved-once cap, final outcome, invalid division), and nothing changes on the Candidate Screening screen itself.

### 3. Test send

After deploying, send one real test of the new email to **riccardo.colombo7@studbocconi.it** by queueing it directly with sample data (e.g. from Equity Research to Investment Management), then confirm it left the queue in the email register.

## Technical details

- Edit: `supabase/functions/_shared/transactional-emails.ts` (add template)
- Edit: `supabase/functions/admin-applications/index.ts` (enqueue after successful reassignment, with `from`/`to` division labels)
- Migration: insert the `division_reassignment` row into `auto_email_templates` (subject/body mirror the code template)
- Redeploy: `admin-applications` and `admin-auto-emails`
- Test: one `enqueue_app_email('division_reassignment', 'riccardo.colombo7@studbocconi.it', ...)` call; verify the row in `email_send_log`
- No front-end changes

## Notes

- The email is transactional (one recipient, triggered by one specific event concerning them) — within the allowed use of app emails.
- The unsubscribe footer is appended automatically, as with every app email.
