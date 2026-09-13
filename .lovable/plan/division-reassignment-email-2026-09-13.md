# Division Reassignment Email

## What happens today

The reassignment email now sends, but the copy stored for delivery does not contain the mobile stylesheet or fluid-width email container. The test sent at 15:28 UTC therefore delivered the fixed 600px layout instead of adapting like the other emails.

## What we'll build

Correct the existing automatic **"Division reassignment"** email and send a new test.

### 1. Update the email template

Keep the existing branded shell and placeholders. Change the requested sentence exactly to:

> No action is required from you. The new division will review your submitted application and we'll be in touch regarding the next steps.

Add the same purple call-to-action style used by the other application emails, labelled **Check Application Status**, linking to `https://minervaims.org/workspace/applications/status`.

Subject (draft): "Update on your application | Minerva IMS"

All other wording, branding, sign-off, legal text, and placeholders remain unchanged.

### 2. Make mobile adaptation reliable

Apply the existing responsive email transformation before the template is stored for sending. The delivered version will use a fluid-width container, reduced side spacing, readable mobile type, and a full-width-friendly button below 600px.

Update the stored database copy immediately rather than depending on an administrator opening the Automatic Emails page. Keep the delivery trigger and Candidate Screening unchanged.

### 3. Test send

After deploying, send one new test to **riccardo.colombo7@studbocconi.it** with sample reassignment data. Confirm it reaches `sent`, and verify the queued template now contains the responsive mobile markers, revised sentence, and application-status button.

## Technical details

- Edit `supabase/functions/_shared/transactional-emails.ts`: wording and CTA.
- Use `withResponsiveShell(normalizeEmailLinks(...))` when updating the stored `division_reassignment` body.
- Update `auto_email_templates` immediately with the transformed template.
- Redeploy the email-management function if its sync path changes.
- Queue one `division_reassignment` email to the requested address and verify `email_send_log.status = 'sent'`.
- No front-end changes

## Notes

- The email is transactional (one recipient, triggered by one specific event concerning them) — within the allowed use of app emails.
- The unsubscribe footer is appended automatically, as with every app email.
