CREATE OR REPLACE FUNCTION public.public_alumni_classes()
RETURNS TABLE (graduation_year integer, alumni_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.graduation_year, count(*) AS alumni_count
  FROM public.alumni a
  GROUP BY a.graduation_year
  ORDER BY a.graduation_year;
$$;

GRANT EXECUTE ON FUNCTION public.public_alumni_classes() TO anon, authenticated;