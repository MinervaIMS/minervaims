-- =====================================================================
-- Association on Display is an event, so its attendance can be taken.
-- ---------------------------------------------------------------------
-- An Association on Display day lived only in `aod_days`, with members
-- signing up per half hour in `aod_signups`. Attendance, the Event archive
-- and everything else built on `events` could not see it, so nobody could
-- record who actually staffed the stand.
--
-- Each day now has exactly one event, created with the day and kept in
-- step with it by the database:
--
--   * the event is typed 'association_on_display', runs 10:00 to 19:00 on
--     the day (Rome), is NOT listed on the public website (the archive
--     switch can list it), and takes no registrations of its own: members
--     sign up per slot, as before, on the Association on Display page;
--   * each member who signs up for any slot of the day appears ONCE on the
--     event's attendance list, as a member; leaving their last slot of the
--     day removes them again, unless they have already been ticked as
--     present;
--   * moving the day moves the event; deleting the day deletes the event
--     and its attendance.
--
-- Existing days and sign-ups are brought across at the end. Idempotent.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The type.
-- ---------------------------------------------------------------------
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('meeting','aperitivo','division_event','online_call','guest','alumni_call',
                        'association_wide','association_on_display','other'));


-- ---------------------------------------------------------------------
-- 2. The link: one event per day, gone with the day.
-- ---------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS aod_day_id uuid REFERENCES public.aod_days(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_aod_day_id_key') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_aod_day_id_key UNIQUE (aod_day_id);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3. A day creates, and moves, its event.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aod_day_event_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.events (
      title, date, place, description, event_type, start_at, end_at, online,
      registration_enabled, registration_audience, show_on_website, in_archive, aod_day_id
    ) VALUES (
      'Association on Display', NEW.event_date, 'Association on Display stand',
      'The association''s stand at Association on Display, staffed by members in half-hour slots from 10:00am to 7:00pm.',
      'association_on_display',
      (NEW.event_date + time '10:00') AT TIME ZONE 'Europe/Rome',
      (NEW.event_date + time '19:00') AT TIME ZONE 'Europe/Rome',
      false, false, 'members', false, true, NEW.id
    )
    ON CONFLICT (aod_day_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND NEW.event_date IS DISTINCT FROM OLD.event_date THEN
    UPDATE public.events
       SET date = NEW.event_date,
           start_at = (NEW.event_date + time '10:00') AT TIME ZONE 'Europe/Rome',
           end_at   = (NEW.event_date + time '19:00') AT TIME ZONE 'Europe/Rome'
     WHERE aod_day_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS aod_day_event_sync ON public.aod_days;
CREATE TRIGGER aod_day_event_sync
  AFTER INSERT OR UPDATE ON public.aod_days
  FOR EACH ROW EXECUTE FUNCTION public.aod_day_event_sync();


-- ---------------------------------------------------------------------
-- 4. A sign-up puts the member on the day's attendance list, once.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aod_signup_registration_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_event uuid;
  v_email text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Sign-ups are always made by a signed-in member; one without an
    -- account cannot be recognised as the same person across slots.
    IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
    SELECT id INTO v_event FROM public.events WHERE aod_day_id = NEW.day_id;
    IF v_event IS NULL THEN RETURN NEW; END IF;
    -- Already on the list, from another slot the same day.
    IF NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.event_registrations WHERE event_id = v_event AND user_id = NEW.user_id
    ) THEN RETURN NEW; END IF;
    SELECT nullif(btrim(email), '') INTO v_email FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.event_registrations (event_id, user_id, name, email, is_member, is_external, attended)
    VALUES (v_event, NEW.user_id, NEW.member_name, v_email, true, false, false)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  -- DELETE: their last slot of the day. A member already ticked as present
  -- stays on the list: attendance, once recorded, is not undone by a
  -- sign-up being tidied away afterwards.
  SELECT id INTO v_event FROM public.events WHERE aod_day_id = OLD.day_id;
  IF v_event IS NULL OR OLD.user_id IS NULL THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.aod_signups WHERE day_id = OLD.day_id AND user_id = OLD.user_id) THEN
    DELETE FROM public.event_registrations
     WHERE event_id = v_event AND user_id = OLD.user_id AND attended = false;
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS aod_signup_registration_sync ON public.aod_signups;
CREATE TRIGGER aod_signup_registration_sync
  AFTER INSERT OR DELETE ON public.aod_signups
  FOR EACH ROW EXECUTE FUNCTION public.aod_signup_registration_sync();

REVOKE EXECUTE ON FUNCTION public.aod_day_event_sync() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.aod_signup_registration_sync() FROM PUBLIC;


-- ---------------------------------------------------------------------
-- 5. Bring across what already exists.
-- ---------------------------------------------------------------------
INSERT INTO public.events (
  title, date, place, description, event_type, start_at, end_at, online,
  registration_enabled, registration_audience, show_on_website, in_archive, aod_day_id
)
SELECT 'Association on Display', d.event_date, 'Association on Display stand',
       'The association''s stand at Association on Display, staffed by members in half-hour slots from 10:00am to 7:00pm.',
       'association_on_display',
       (d.event_date + time '10:00') AT TIME ZONE 'Europe/Rome',
       (d.event_date + time '19:00') AT TIME ZONE 'Europe/Rome',
       false, false, 'members', false, true, d.id
  FROM public.aod_days d
 WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.aod_day_id = d.id);

-- One row per member per day, from their earliest sign-up that day.
INSERT INTO public.event_registrations (event_id, user_id, name, email, is_member, is_external, attended, registered_at)
SELECT DISTINCT ON (e.id, s.user_id)
       e.id, s.user_id, s.member_name, nullif(btrim(p.email), ''), true, false, false, s.created_at
  FROM public.aod_signups s
  JOIN public.events e ON e.aod_day_id = s.day_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
 WHERE s.user_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.event_registrations r WHERE r.event_id = e.id AND r.user_id = s.user_id)
 ORDER BY e.id, s.user_id, s.created_at
ON CONFLICT DO NOTHING;
