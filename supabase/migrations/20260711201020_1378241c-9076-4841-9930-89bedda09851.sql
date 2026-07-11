
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _source text := NEW.raw_user_meta_data ->> 'signup_source';
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');

  IF NEW.email = 'as.minerva@unibocconi.it' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'president');
  ELSIF _source = 'apply' THEN
    -- Applicants must never be flagged as 'member'. Tag them as 'candidate'
    -- from the very first insert so the workspace guard admits them even if
    -- the follow-up submit-application call fails.
    INSERT INTO public.user_roles (user_id, role, division)
    VALUES (NEW.id, 'candidate', NULL);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;

  RETURN NEW;
END;
$function$;

-- Clean up the stuck test account so the applicant can retry cleanly.
DELETE FROM public.applications WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'criccardo480@gmail.com');
DELETE FROM public.user_roles   WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'criccardo480@gmail.com');
DELETE FROM public.members      WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'criccardo480@gmail.com');
DELETE FROM public.profiles     WHERE id      IN (SELECT id FROM auth.users WHERE email = 'criccardo480@gmail.com');
DELETE FROM public.newsletter_subscribers WHERE lower(email) = 'criccardo480@gmail.com';
DELETE FROM auth.users WHERE email = 'criccardo480@gmail.com';

-- Retro-fix: any existing user with only a 'member' role who actually has an
-- application on file should be a candidate.
UPDATE public.user_roles ur SET role = 'candidate'
WHERE ur.role = 'member'
  AND EXISTS (SELECT 1 FROM public.applications a WHERE a.user_id = ur.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role <> 'member' AND ur2.role <> 'pending'
  );
