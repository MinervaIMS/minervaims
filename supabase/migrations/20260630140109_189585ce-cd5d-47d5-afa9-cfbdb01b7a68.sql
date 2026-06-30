
-- Normalization helper for building studbocconi.it emails
CREATE OR REPLACE FUNCTION public.normalize_email_part(_s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    translate(
      lower(coalesce(_s, '')),
      'àáâãäåāăąçćčďèéêëēĕėęěìíîïĩīĭįıłñńňòóôõöōŏőøśšťùúûüũūŭůűųýÿźżž''`-',
      'aaaaaaaaacccdeeeeeeeeeiiiiiiiiilnnoooooooooosstuuuuuuuuuuyyzzz'
    ),
    '[^a-z0-9.]', '', 'g'
  )
$$;

-- Build member email per template, with Riccardo Colombo exception
CREATE OR REPLACE FUNCTION public.build_member_email(_first text, _surname text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(_first,''))='riccardo' AND lower(coalesce(_surname,''))='colombo'
      THEN 'riccardo.colombo7@studbocconi.it'
    ELSE public.normalize_email_part(_first) || '.' || public.normalize_email_part(_surname) || '@studbocconi.it'
  END
$$;

-- Trigger: auto-add a member's email to the newsletter
CREATE OR REPLACE FUNCTION public.member_email_to_newsletter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    INSERT INTO public.newsletter_subscribers (email, consent, source)
    VALUES (lower(trim(NEW.email)), true, 'member')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_email_to_newsletter ON public.members;
CREATE TRIGGER trg_member_email_to_newsletter
AFTER INSERT OR UPDATE OF email ON public.members
FOR EACH ROW EXECUTE FUNCTION public.member_email_to_newsletter();

-- Trigger: auto-add an applicant's email to the newsletter
CREATE OR REPLACE FUNCTION public.application_email_to_newsletter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    INSERT INTO public.newsletter_subscribers (email, consent, source)
    VALUES (lower(trim(NEW.email)), true, 'application')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_email_to_newsletter ON public.applications;
CREATE TRIGGER trg_application_email_to_newsletter
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.application_email_to_newsletter();
