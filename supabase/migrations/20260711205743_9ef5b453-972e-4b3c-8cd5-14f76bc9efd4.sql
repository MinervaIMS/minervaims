CREATE OR REPLACE FUNCTION public.assign_applicant_role_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.applications a WHERE a.user_id = NEW.id)
       AND NOT EXISTS (
         SELECT 1 FROM public.user_roles ur
         WHERE ur.user_id = NEW.id
           AND ur.role NOT IN ('member', 'pending', 'candidate')
       ) THEN
      DELETE FROM public.user_roles WHERE user_id = NEW.id AND role IN ('member', 'pending');
      IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'candidate') THEN
        INSERT INTO public.user_roles (user_id, role, division) VALUES (NEW.id, 'candidate', NULL);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_applicant_role_on_confirm() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.assign_applicant_role_on_confirm();