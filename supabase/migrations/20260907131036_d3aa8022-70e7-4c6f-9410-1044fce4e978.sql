INSERT INTO public.auto_email_templates (key, name, subject, body, description, connected, trigger_description, recipient_description, schedule_description)
VALUES (
  'event_registration_confirmation',
  'Event registration confirmation',
  'Event registration confirmed | Minerva IMS',
  '<p>Your registration is confirmed.</p>',
  'Sent to anyone who registers for an event through the website registration form.',
  true,
  'A registration is submitted through the event form on the website.',
  'The person who registered.',
  'Immediately after the registration is recorded.'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  description = EXCLUDED.description,
  connected = true,
  trigger_description = EXCLUDED.trigger_description,
  recipient_description = EXCLUDED.recipient_description,
  schedule_description = EXCLUDED.schedule_description;