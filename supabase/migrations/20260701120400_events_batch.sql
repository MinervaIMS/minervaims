-- =====================================================================
-- Events batch: event types, audiences, and registration form fields.
-- ---------------------------------------------------------------------
--   * Replace the 'assembly' event type with 'aperitivo'.
--   * Registration audiences reduce to members / members+students / public
--     (the 'guests' audience is removed).
--   * Event registrations capture the registrant's Bocconi programme and
--     year, or their outside university/company.
-- =====================================================================

-- ── Event type: assembly -> aperitivo ────────────────────────────────
UPDATE public.events SET event_type = 'association_wide' WHERE event_type = 'assembly';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('meeting','aperitivo','division_event','online_call','guest','alumni_call','association_wide','other'));

-- ── Registration audience: drop 'guests' ─────────────────────────────
UPDATE public.events SET registration_audience = 'public' WHERE registration_audience = 'guests';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_registration_audience_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_registration_audience_check
  CHECK (registration_audience IN ('members','members_external','public'));

-- ── Registration form fields ─────────────────────────────────────────
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS is_bocconi     boolean,
  ADD COLUMN IF NOT EXISTS programme      text,   -- Bocconi programme
  ADD COLUMN IF NOT EXISTS academic_year  text,   -- Bocconi year
  ADD COLUMN IF NOT EXISTS affiliation    text;   -- outside university / company
