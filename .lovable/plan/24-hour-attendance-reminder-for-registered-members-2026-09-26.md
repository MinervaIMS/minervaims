# 24-hour attendance reminder for registered members

## Current state (confirmed)
- Registration reminders to **not-yet-registered** members: three stages — 14 days, 7 days, 3 days before the event.
- A database job checks every 10 minutes and sends one due (event, stage) per run, only between 09:00 and 21:00 Rome time; stopped events or closed forms send nothing.
- Nothing is sent to members who **already registered**.

## What to build
A new automatic email, "Reminder: your event is tomorrow", sent to everyone on the event's registration list 24 hours before the event starts.

1. **New email template** (`ws_event_reminder_24h_attending`), built on the existing event-reminder layout: event title, date, time (Rome), location, and a short "you are registered — we look forward to seeing you" message. Synced to the stored templates table so the send path uses it.
2. **Sending logic** in the database, alongside the existing reminder job:
   - Targets members on the event's registration list (the opposite audience of the existing reminders).
   - Due when the event start is between 24h and 24h10m ahead, so it fires once per event; a sent-marker per event prevents repeats.
   - Same rules as existing reminders: stopped events and closed forms send nothing; sends only 09:00–21:00 Rome.
   - Runs on the existing 10-minute check — no new schedule, no extra cost beyond the few emails themselves.
3. **Registration Forms page**: show the new stage ("24 hours before — to registered members") in each event's reminder schedule with its sent/scheduled state, reusing the existing display component.
4. **Test**: send a sample of the new email to as.minerva@unibocconi.it and confirm it records as sent in the email register.

## Technical details
- Template added in `supabase/functions/_shared/transactional-emails.ts` and mirrored into `auto_email_templates` (the send path reads the stored copy).
- New stage handled in the migration that backs `event_registration_reminders` (extend the existing function with an `attending_24h` stage keyed per event; audience = registered members, marker column on the event or a log row).
- Display mirror updated in `supabase/functions/_shared/event-reminders.ts` and `src/lib/events-api.ts` (`ReminderStageStatus`).
