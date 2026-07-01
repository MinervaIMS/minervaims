ALTER TABLE public.auto_email_templates
  ADD COLUMN IF NOT EXISTS file_url  text,
  ADD COLUMN IF NOT EXISTS connected boolean NOT NULL DEFAULT false;

UPDATE public.auto_email_templates SET connected = true
WHERE key IN ('application_received','candidate_status','event_registration','membership_confirmed','fee_reminder','newsletter_welcome');