INSERT INTO public.auto_email_templates
  (key, name, description, subject, body, connected, trigger_description, recipient_description, schedule_description)
VALUES
  ('event_waitlist_joined', $t$Event waiting list: joined$t$,
   'Sent when somebody registers for an event with a limit of places that is full: they are on the waiting list, with their position and a link to leave it.',
   $t$You are on the waiting list | Minerva IMS$t$, '', true,
   'Events, Registration forms: an event with a number of places, when it is full.',
   'The person who asked to register, once.',
   'At once, when they join the waiting list.'),
  ('event_waitlist_promoted', $t$Event waiting list: a place for you$t$,
   'Sent when a place opens up and goes to the first person on the waiting list: they are registered, with their entry code, Add to calendar and the Can''t make it link.',
   $t$A place has opened up | Minerva IMS$t$, '', true,
   'A registration is cancelled or removed, or the event is given more places (or no limit), before it starts.',
   'The first person on the waiting list, for each place that opens up.',
   'At once, when the place opens up. Never once the event has started.'),
  ('event_registration_cancelled', $t$Event registration cancelled$t$,
   'Confirms that a registration was cancelled from the Can''t make it link or from the Calendar, with a link to register again.',
   $t$Your registration is cancelled | Minerva IMS$t$, '', true,
   'The registrant cancels, from the link in their email or from the workspace Calendar.',
   'The person whose registration was cancelled.',
   'At once. Not sent when staff remove somebody in Attendance.')
ON CONFLICT (key) DO NOTHING;