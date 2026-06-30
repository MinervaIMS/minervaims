-- Phase 4 — Events & Calendar

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('meeting','assembly','division_event','online_call','guest','alumni_call','association_wide','other')),
  ADD COLUMN IF NOT EXISTS division public.org_division,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_audience text NOT NULL DEFAULT 'members'
    CHECK (registration_audience IN ('members','members_external','guests','public')),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

UPDATE public.events SET start_at = date::timestamptz WHERE start_at IS NULL AND date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  email         text,
  is_member     boolean NOT NULL DEFAULT false,
  is_external   boolean NOT NULL DEFAULT false,
  attended      boolean NOT NULL DEFAULT false,
  added_by      uuid REFERENCES auth.users(id),
  registered_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_unique
  ON public.event_registrations (event_id, lower(coalesce(email, '')))
  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_registrations_event_idx ON public.event_registrations(event_id);

GRANT SELECT ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own event registrations" ON public.event_registrations;
CREATE POLICY "own event registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.alumni_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumnus_name      text NOT NULL,
  former_role       text,
  current_company   text,
  current_position  text,
  division          public.org_division,
  responsible_person text,
  planned_date      date,
  status            text NOT NULL DEFAULT 'planned'
                      CHECK (status IN ('planned','invited','accepted','completed','declined')),
  notes             text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.alumni_calls TO authenticated;
GRANT ALL ON public.alumni_calls TO service_role;

ALTER TABLE public.alumni_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumni calls readable by staff" ON public.alumni_calls;
CREATE POLICY "alumni calls readable by staff"
  ON public.alumni_calls FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_alumni_calls_updated_at ON public.alumni_calls;
CREATE TRIGGER update_alumni_calls_updated_at
  BEFORE UPDATE ON public.alumni_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.aod_days (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date         date NOT NULL,
  registration_open  boolean NOT NULL DEFAULT false,
  notes              text,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.aod_days TO authenticated;
GRANT ALL ON public.aod_days TO service_role;

ALTER TABLE public.aod_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aod days readable by staff" ON public.aod_days;
CREATE POLICY "aod days readable by staff"
  ON public.aod_days FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.aod_signups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id       uuid NOT NULL REFERENCES public.aod_days(id) ON DELETE CASCADE,
  slot_time    text NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name  text NOT NULL,
  division     public.org_division,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, slot_time, user_id)
);

CREATE INDEX IF NOT EXISTS aod_signups_day_idx ON public.aod_signups(day_id);

GRANT SELECT ON public.aod_signups TO authenticated;
GRANT ALL ON public.aod_signups TO service_role;

ALTER TABLE public.aod_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aod signups readable by staff" ON public.aod_signups;
CREATE POLICY "aod signups readable by staff"
  ON public.aod_signups FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));