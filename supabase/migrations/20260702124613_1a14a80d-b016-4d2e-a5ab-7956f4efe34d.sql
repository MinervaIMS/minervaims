-- Security hardening (scan findings)
-- 1a. is_admin() — user_roles only (no email branch).
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'president')
  )
$function$;

-- 1b. profiles.email cannot be changed by a client update.
CREATE OR REPLACE FUNCTION public.lock_profile_email()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS lock_profile_email_trg ON public.profiles;
CREATE TRIGGER lock_profile_email_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_email();

-- 2a. RLS helper functions.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid)                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_candidate(uuid)                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_full_access(uuid)              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_divisions(uuid)              FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)                     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_staff(uuid)                     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_candidate(uuid)                 TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_full_access(uuid)              TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_divisions(uuid)              TO authenticated;

-- 2b. Trigger / maintenance functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.project_member_to_team()     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_candidates() FROM anon, authenticated, PUBLIC;