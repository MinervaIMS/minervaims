CREATE OR REPLACE FUNCTION public.sync_applicant_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_roles
   WHERE user_id = NEW.user_id AND role IN ('member','pending');
  INSERT INTO public.user_roles (user_id, role, division)
  VALUES (NEW.user_id, 'candidate'::app_role, NULL::org_division)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_sync_role ON public.applications;
CREATE TRIGGER applications_sync_role
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.sync_applicant_role();

DELETE FROM public.user_roles ur
 WHERE ur.role IN ('member','pending')
   AND EXISTS (SELECT 1 FROM public.applications a WHERE a.user_id = ur.user_id);

INSERT INTO public.user_roles (user_id, role, division)
SELECT DISTINCT a.user_id, 'candidate'::app_role, NULL::org_division
  FROM public.applications a
 WHERE a.user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = a.user_id AND ur.role = 'candidate'
   )
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM auth.users WHERE email = 'criccardo480@gmail.com';