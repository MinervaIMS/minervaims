# Event registration confirmation email

## Goal
When someone registers for an event through the website form, they immediately receive a confirmation email with the event details, built on the same layout as the existing "Workspace update" communication email and signed by the Operations Team.

## What the email will say
- Banner strip: "Events · Registration confirmed"
- Same Minerva header (logo + society name), same fonts, colours, footer, legal notes and social links as the current Workspace update email.
- Heading: "Registration confirmed"
- Greeting: "Dear {first name},"
- First paragraph: confirmation that their place at the named event is registered.
- Details block (purple-topped table, same style, extended from two rows to four): Event, Date, Time, Location.
- Second paragraph: the event description, when the event has one.
- Short note asking them to arrive a few minutes early and to write to the association address if they can no longer attend.
- Button: "View all events" linking to the public events page.
- Signature: "Kind regards, / The Operations Team / Minerva Investment Management Society".
- Subject: "Registration confirmed: {event title} | Minerva IMS"

No promotional content, no unsubscribe wording added by hand (the system appends its own footer).

## When it is sent
On every successful registration submitted through a website event form — members, other students and public guests alike — for any event type. It is sent once per registration: repeat submissions that are already registered do not resend. Registrations added manually by staff from the dashboard attendee list do not trigger it.

## Test
Register (server-side, as a test) riccardo.colombo7@studbocconi.it for the 16 September event "Opening aperitivo: interested in Minerva? Get to know us!" and confirm the email is recorded as sent, then remove the test registration row so the attendee list stays clean.

## Technical notes
- Add a new template entry `event_registration_confirmation` to `supabase/functions/_shared/transactional-emails.ts`, copied from the `general_communication` layout with the content above and a four-row detail table. Keep it out of `CC_KEYS` and out of `LEGACY_KEYS_TO_DISCONNECT` so it shows as connected in More > Emails.
- In `supabase/functions/register-event/index.ts`, after a successful `event_registrations` insert, load the event (title, date, start/end time, place, online flag, description) and call `enqueue_app_email` with the template key, the registrant address and the substitution variables. Guard with try/catch so a mail failure never breaks registration, and pass a deterministic key derived from the registration so retries cannot duplicate the send.
- Format date/time in Europe/Rome; for online events show the online label as the location.
- Add the template's variables to the preview defaults in `_shared/transactional-email-templates/registry.ts` so the More > Emails preview renders fully.
- Refresh the stored row in `auto_email_templates` (the send path reads subject/body from there) via the existing sync path, then deploy `register-event` and the email functions that share the template file.
- No database schema change.
