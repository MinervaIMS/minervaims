-- =====================================================================
-- public_alumni_classes: the alumni network by graduation class.
-- ---------------------------------------------------------------------
-- The Dashboard's Alumni Growth chart is read by EVERY member, but the
-- `alumni` table is readable only by staff (see the step 12 visibility
-- migration), and `public_alumni_directory` returns just the first
-- hundred people, so neither source can produce a complete class
-- breakdown for a plain member.
--
-- This returns COUNTS ONLY: one row per graduation year with how many
-- alumni it holds. No name, no company, no city, nothing that the
-- directory protects. The alumni total it sums to is already published
-- on the public homepage, so the function discloses nothing new.
--
-- `graduation_year` is NOT NULL on the table, so every record lands in
-- exactly one class and none can be silently dropped.
-- =====================================================================

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
