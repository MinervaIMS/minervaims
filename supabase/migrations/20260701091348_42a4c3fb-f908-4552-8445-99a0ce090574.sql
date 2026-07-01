UPDATE public.events SET event_type = 'association_wide' WHERE event_type = 'assembly';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('meeting','aperitivo','division_event','online_call','guest','alumni_call','association_wide','other'));

UPDATE public.events SET registration_audience = 'public' WHERE registration_audience = 'guests';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_registration_audience_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_registration_audience_check
  CHECK (registration_audience IN ('members','members_external','public'));

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS is_bocconi     boolean,
  ADD COLUMN IF NOT EXISTS programme      text,
  ADD COLUMN IF NOT EXISTS academic_year  text,
  ADD COLUMN IF NOT EXISTS affiliation    text;