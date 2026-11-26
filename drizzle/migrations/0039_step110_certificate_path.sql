-- =====================================================================
-- STEP 110: the membership certificate says when the holder joined and
-- the path they took through the Society.
-- ---------------------------------------------------------------------
-- A certificate is drawn from what was stored when it was issued, so the
-- same certificate always reads the same. Two columns join that record:
--
--   member_since  the first semester the history records for the holder
--   path          their semesters up to the certificate's own, each with
--                 the role they held ([{ key, label, role }], oldest first)
--
-- They are filled when a certificate is issued, and once, the first time
-- it is downloaded or previewed, for a certificate issued before this
-- step. The number of reports is deliberately not part of it.
--
-- `certificate_path` reads them from the semester rosters (the person by
-- their member record, or else by the one person who carries the name),
-- for the membership-certificate function only.
--
-- Safe to run twice: columns are added only if missing; the function is
-- replaced. No existing value is changed.
-- =====================================================================

ALTER TABLE public.membership_certificates ADD COLUMN IF NOT EXISTS member_since text;
ALTER TABLE public.membership_certificates ADD COLUMN IF NOT EXISTS path jsonb;

CREATE OR REPLACE FUNCTION public.certificate_path(p_member_id uuid, p_holder text, p_until text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pid AS (
    SELECT coalesce(
      (SELECT pr.person_id FROM public.person_records pr
        WHERE p_member_id IS NOT NULL AND pr.record_type = 'member' AND pr.record_id = p_member_id LIMIT 1),
      (SELECT CASE WHEN count(*) = 1 THEN (array_agg(p.id))[1] END FROM public.people p
        WHERE p.name_key = public.person_name_key(p_holder))
    ) AS id
  ), sem AS (
    SELECT e.semester_key, string_agg(DISTINCT e.role_label, ' and ' ORDER BY e.role_label) AS role
    FROM public.roster_entries e, pid
    WHERE pid.id IS NOT NULL AND e.person_id = pid.id
      AND public.semester_ordinal(e.semester_key) <= public.semester_ordinal(p_until)
    GROUP BY e.semester_key
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('key', semester_key, 'label', public.semester_label(semester_key), 'role', role)
    ORDER BY public.semester_ordinal(semester_key)), '[]'::jsonb)
  FROM sem;
$$;
REVOKE ALL ON FUNCTION public.certificate_path(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.certificate_path(uuid, text, text) TO service_role;
