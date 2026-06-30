CREATE OR REPLACE FUNCTION public.is_candidate(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'candidate'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role NOT IN ('candidate','pending')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_full_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','president','vice_president','head_of_asset_management')
  )
$$;

CREATE OR REPLACE FUNCTION public.user_divisions(_user_id uuid)
RETURNS SETOF public.org_division
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT division
  FROM public.user_roles
  WHERE user_id = _user_id AND division IS NOT NULL
$$;


CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        public.app_role NOT NULL,
  resource    text NOT NULL,
  level       text NOT NULL CHECK (level IN ('none','view','edit','manage')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, resource)
);

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions readable by staff" ON public.role_permissions;
CREATE POLICY "role_permissions readable by staff"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));


ALTER TABLE public.application_settings
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date   timestamptz,
  ADD COLUMN IF NOT EXISTS auto_open  boolean NOT NULL DEFAULT true;


CREATE OR REPLACE FUNCTION public.cleanup_expired_candidates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cutoff timestamptz;
  _deleted integer := 0;
  _rec record;
BEGIN
  SELECT max(end_date) INTO _cutoff FROM public.application_settings;
  IF _cutoff IS NULL OR now() < _cutoff + interval '1 month' THEN
    RETURN 0;
  END IF;

  FOR _rec IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE public.is_candidate(u.id)
  LOOP
    IF _rec.email IS NOT NULL THEN
      INSERT INTO public.newsletter_subscribers (email, consent, source)
      VALUES (lower(_rec.email), true, 'application')
      ON CONFLICT (email) DO NOTHING;
    END IF;

    DELETE FROM auth.users WHERE id = _rec.id;
    _deleted := _deleted + 1;
  END LOOP;

  RETURN _deleted;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('cleanup_expired_candidates')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_candidates');
    PERFORM cron.schedule(
      'cleanup_expired_candidates',
      '0 3 * * *',
      $cron$ SELECT public.cleanup_expired_candidates(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;