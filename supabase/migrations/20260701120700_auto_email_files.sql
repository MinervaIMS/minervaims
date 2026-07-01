-- =====================================================================
-- Auto-email templates: uploadable layout file + connected status.
-- ---------------------------------------------------------------------
-- New templates can be added with a title, a description and a file (the
-- email layout). Each template shows whether it is connected to / used by
-- the system (green) or not yet wired up (red). The seeded system
-- categories are connected by definition.
-- =====================================================================

ALTER TABLE public.auto_email_templates
  ADD COLUMN IF NOT EXISTS file_url  text,
  ADD COLUMN IF NOT EXISTS connected boolean NOT NULL DEFAULT false;

-- The originally-seeded categories are the ones the system actually sends.
UPDATE public.auto_email_templates SET connected = true
WHERE key IN ('application_received','candidate_status','event_registration','membership_confirmed','fee_reminder','newsletter_welcome');
