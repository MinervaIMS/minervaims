# Email header and footer check: findings and fix

## What I found (read from the stored emails and the email code)

The "Interest received, not yet a place" email uses the current standard: the crest centred over "Minerva Investment Management Society", a thin navy line, and the closing block (Society name, "Bocconi University, Milan · Privacy Policy · Contact", disclaimer).

**Sign-in emails (6: confirm account, magic link, password reset, invite, email change, re-authentication)** — already match. They are built at send time from the same shared layout.

**App emails in use (42):**
- 2 match exactly: interest received, and the "next time" email.
- 36 have the correct footer but an **older header**. The newer header in the code (from Step 96B) never reached the stored copies, because the Step 96B stored-template update was not applied. Four of these also carry the events unsubscribe line, which is correct and stays.
- 4 use the **old design entirely**: offer accepted confirmation, offer reminder, rejection after interview, rejection without interview. These are older duplicates still switched on.

**Switched-off emails (16)** — old design; not sent, left untouched.

## What I will do

1. Write the 36 app emails' stored copies again from the email code, so header and footer match the standard. Wording, subjects and unsubscribe lines stay as they are.
2. For the 4 old-design emails: check whether anything still sends them. If they are duplicates of the new emails (e.g. "rejection_after_interview" vs "rejection_post_interview"), switch them off; if something still sends them, rebuild them in the standard layout with their current wording.
3. Check again: every switched-on email has the same header and footer as "interest received", apart from the optional unsubscribe line.
4. Send one test of a few changed emails to as.minerva@unibocconi.it.

## Technical details
- Stored bodies regenerated from `transactional-emails.ts` via `withResponsiveShell(normalizeEmailLinks(body))` and upserted into `auto_email_templates` (same path as last turn's company-visit fix).
- Comparison method: md5 of the masthead segment (`m-shell` to `<h1`) and of the closure (excluding the unsubscribe paragraph) against `company_visit_interest_received`.
- Senders of the 4 legacy keys found with `rg` across functions and SQL before deciding.
