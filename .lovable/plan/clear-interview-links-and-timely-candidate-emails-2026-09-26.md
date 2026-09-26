# Clear interview links and timely candidate emails

## What will change

1. **Interview confirmation:** Move the online meeting link near the top of the existing confirmation email, directly below the date and time, with a prominent **Join online interview** button and a readable, copyable link below it. Keep the current Minerva branding, preparation guidance, booking link, and legal footer. Replace the current sentence saying a member will share the link later: interview slots already store the meeting link, but the confirmation does not include it.
2. **Thirty-minute interview reminder:** Create a matching automatic email showing the division, date, Rome-local time, and a prominent meeting button plus copyable link. Send it once per current booking shortly before the interview, around 25–30 minutes in advance. Do not send for cancelled bookings or an interview that has already begun; a rebooked slot gets its own reminder. Include it in Automatic Emails.
3. **Division reassignment:** Connect the existing branded division-reassignment email to a successful change of evaluation division in Candidate Screening. Name the old and new divisions and link to application status. Adjust statements that imply a move can never be reversed, because the current process can move a candidate back to the previous division. Do not send if no change was made.
4. **Tests:** Send one test of each of the revised confirmation, the new interview reminder, and the reassignment email to **as.minerva@unibocconi.it**, using clearly marked sample candidate/interview details and a safe sample meeting URL. Verify the queued content has visible links and that the email register records successful delivery; report actual delivery status and any limitation.

## Technical details

- Pass the validated slot `meeting_link` through the existing booking email trigger; keep email HTML/URL escaping and a text fallback.
- Add the reminder template to the shared automatic-email catalogue and synchronize its stored database copy immediately, rather than waiting for an administrator to open Automatic Emails. Do the same for updated templates.
- Use the existing app-email queue and suppression rules. Add a per-booking sent marker and a bounded, idempotent database job that interprets slot date/time in `Europe/Rome`; run it every five minutes to keep delivery within roughly five minutes of the thirty-minute target. This is 288 checks per day, including idle periods, and may increase Cloud costs; a less frequent check would be cheaper but less punctual. Avoid duplicate sends and handle cancellation/rebooking.
- Deploy affected email and recruiting functions; verify database scheduling, test sends, and the rendered email layouts. No unrelated website or workspace layout changes.
