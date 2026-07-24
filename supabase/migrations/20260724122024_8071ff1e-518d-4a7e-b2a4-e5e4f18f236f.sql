
CREATE OR REPLACE FUNCTION public.public_testimonial_companies()
RETURNS TABLE(testimonial_id uuid, company text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id AS testimonial_id, a.company
  FROM public.testimonials t
  LEFT JOIN public.alumni a
    ON (
      t.alumni_id IS NOT NULL AND a.id = t.alumni_id
    )
    OR (
      t.alumni_id IS NULL
      AND lower(regexp_replace(trim(a.name || ' ' || a.surname), '\s+', ' ', 'g'))
        = lower(regexp_replace(trim(t.name), '\s+', ' ', 'g'))
    )
  WHERE t.published = true
    AND a.company IS NOT NULL
    AND a.company <> '';
$$;

REVOKE ALL ON FUNCTION public.public_testimonial_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_testimonial_companies() TO anon, authenticated;
