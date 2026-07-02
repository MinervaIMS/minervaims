-- 1. Reclassify legacy public events as guest events.
UPDATE public.events SET event_type = 'guest' WHERE event_type = 'other' OR event_type IS NULL;

-- 2. Membership statuses.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_membership_status_check;
UPDATE public.members SET membership_status = 'one_semester_pause' WHERE membership_status = 'temporary_leave';
ALTER TABLE public.members
  ADD CONSTRAINT members_membership_status_check
  CHECK (membership_status IN ('active','on_exchange','one_semester_pause','alumni','expelled','silent_advisor'));

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- 3. Update projection function.
CREATE OR REPLACE FUNCTION public.project_member_to_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_publishable boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.team_members WHERE member_id = OLD.id;
    RETURN OLD;
  END IF;

  _is_publishable := NEW.is_public
    AND NEW.membership_status IN ('active','on_exchange','one_semester_pause','silent_advisor')
    AND NEW.account_status IN ('approved','to_redeem')
    AND NEW.role NOT IN ('admin','candidate','pending','member','alumni','silent_advisor');

  IF NOT _is_publishable THEN
    DELETE FROM public.team_members WHERE member_id = NEW.id;
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE member_id = NEW.id) THEN
    UPDATE public.team_members SET
      name          = NEW.first_name,
      surname       = NEW.surname,
      position      = public.role_to_team_position(NEW.role, NEW.division),
      division      = public.division_to_team_division(NEW.division),
      photo_url     = NEW.photo_url,
      linkedin_url  = NEW.linkedin_url,
      is_board      = (public.member_rank(NEW.role, NEW.division) <= 6),
      display_order = public.member_rank(NEW.role, NEW.division)
    WHERE member_id = NEW.id;
  ELSE
    INSERT INTO public.team_members
      (member_id, name, surname, position, division, photo_url, linkedin_url, is_board, display_order)
    VALUES
      (NEW.id, NEW.first_name, NEW.surname,
       public.role_to_team_position(NEW.role, NEW.division),
       public.division_to_team_division(NEW.division),
       NEW.photo_url, NEW.linkedin_url,
       (public.member_rank(NEW.role, NEW.division) <= 6),
       public.member_rank(NEW.role, NEW.division));
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Cleanup function + daily cron.
CREATE OR REPLACE FUNCTION public.cleanup_expelled_members()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer := 0;
  _rec record;
BEGIN
  FOR _rec IN
    SELECT id, user_id FROM public.members
    WHERE membership_status = 'expelled'
      AND deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at < now()
  LOOP
    IF _rec.user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = _rec.user_id;
    END IF;
    DELETE FROM public.members WHERE id = _rec.id;
    _deleted := _deleted + 1;
  END LOOP;
  RETURN _deleted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_expelled_members() FROM anon, authenticated, PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expelled_members') THEN
      PERFORM cron.unschedule('cleanup_expelled_members');
    END IF;
    PERFORM cron.schedule('cleanup_expelled_members', '0 3 * * *',
      $cron$ SELECT public.cleanup_expelled_members(); $cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;