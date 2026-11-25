-- =====================================================================
-- STEP 108: SHORT LINKS FOR EVENTS AND FORMS.
-- ---------------------------------------------------------------------
-- An event's registration link and a form's link carry a 36-character
-- identifier: long in a message, cut by some social networks, impossible
-- to read out. Each event and each form now also has a short code of six
-- letters and digits, and the website opens
--
--   minervaims.org/e/K7F2QX   the event's registration page
--   minervaims.org/f/9DMW4T   the form
--
-- the way a form service gives a short link. The long links keep working
-- exactly as before: a short link only leads to one.
--
-- THE CODE. Six characters from 23456789ABCDEFGHJKMNPQRSTUVWXYZ (no 0, 1,
-- I, L or O, which are misread), about 887 million codes, given to every
-- new event and form by a trigger and to every existing one here, never
-- changed afterwards. Read in any capitals.
--
-- WHO CAN OPEN ONE. short_link_target(kind, code) answers a visitor with
-- the address the code stands for, and nothing else: an event only while
-- its registration is open or the website shows it, a form only once it
-- has been published (not a draft). What the page then shows is decided
-- by the page and its policies, exactly as for the long link (a
-- members-only event asks a visitor to sign in).
--
-- The backfill writes only the new column, with the events' updated_at
-- trigger paused around it, so no event looks edited. No email.
-- SAFE TO RUN TWICE: a row that has a code keeps it.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.short_code_new()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public'
AS $fn$
  SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
    FROM generate_series(1, 6);
$fn$;
REVOKE ALL ON FUNCTION public.short_code_new() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.internal_forms ADD COLUMN IF NOT EXISTS short_code text;

DO $c$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_short_code_format') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_short_code_format
      CHECK (short_code IS NULL OR short_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_forms_short_code_format') THEN
    ALTER TABLE public.internal_forms ADD CONSTRAINT internal_forms_short_code_format
      CHECK (short_code IS NULL OR short_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$');
  END IF;
END $c$;
CREATE UNIQUE INDEX IF NOT EXISTS events_short_code_key ON public.events (short_code) WHERE short_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS internal_forms_short_code_key ON public.internal_forms (short_code) WHERE short_code IS NOT NULL;

-- A new row gets a code no other row of its table has.
CREATE OR REPLACE FUNCTION public.short_code_assign()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
DECLARE v text; taken boolean;
BEGIN
  IF NEW.short_code IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    v := public.short_code_new();
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I WHERE short_code = $1)', TG_TABLE_SCHEMA, TG_TABLE_NAME) INTO taken USING v;
    EXIT WHEN NOT taken;
  END LOOP;
  NEW.short_code := v;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.short_code_assign() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS events_short_code ON public.events;
CREATE TRIGGER events_short_code BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.short_code_assign();
DROP TRIGGER IF EXISTS internal_forms_short_code ON public.internal_forms;
CREATE TRIGGER internal_forms_short_code BEFORE INSERT ON public.internal_forms
  FOR EACH ROW EXECUTE FUNCTION public.short_code_assign();

-- Every existing event and form, once.
DO $backfill$
DECLARE r record; v text; paused boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at' AND tgrelid = 'public.events'::regclass) THEN
    ALTER TABLE public.events DISABLE TRIGGER update_events_updated_at;
    paused := true;
  END IF;
  FOR r IN SELECT id FROM public.events WHERE short_code IS NULL LOOP
    LOOP
      v := public.short_code_new();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE short_code = v);
    END LOOP;
    UPDATE public.events SET short_code = v WHERE id = r.id;
  END LOOP;
  IF paused THEN ALTER TABLE public.events ENABLE TRIGGER update_events_updated_at; END IF;

  FOR r IN SELECT id FROM public.internal_forms WHERE short_code IS NULL LOOP
    LOOP
      v := public.short_code_new();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.internal_forms WHERE short_code = v);
    END LOOP;
    UPDATE public.internal_forms SET short_code = v WHERE id = r.id;
  END LOOP;
END
$backfill$;

-- What a short link stands for: the long address, or nothing.
CREATE OR REPLACE FUNCTION public.short_link_target(p_kind text, p_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT CASE p_kind
    WHEN 'e' THEN (
      SELECT '/events/' || e.id || '/register' FROM public.events e
       WHERE e.short_code = upper(btrim(p_code))
         AND (e.registration_enabled OR e.show_on_website)
       LIMIT 1)
    WHEN 'f' THEN (
      SELECT '/forms/' || f.id FROM public.internal_forms f
       WHERE f.short_code = upper(btrim(p_code))
         AND f.status <> 'draft'
       LIMIT 1)
  END
  WHERE upper(btrim(coalesce(p_code, ''))) ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$';
$fn$;

REVOKE ALL ON FUNCTION public.short_link_target(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.short_link_target(text, text) TO anon, authenticated, service_role;