CREATE OR REPLACE FUNCTION public.public_past_boards()
RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT e.semester_key, public.roster_office_rank(e.role_label) AS rank,
           e.role_label, p.first_name, p.surname, profile.linkedin_url
    FROM public.roster_entries e
    JOIN public.people p ON p.id = e.person_id
    LEFT JOIN LATERAL (
      SELECT links.linkedin_url
      FROM (
        SELECT t.linkedin_url, 0 AS priority
        FROM public.person_records r
        JOIN public.team_members t ON t.member_id = r.record_id
        WHERE r.person_id = p.id AND r.record_type = 'member'
        UNION ALL
        SELECT a.linkedin_url, 1 AS priority
        FROM public.person_records r
        JOIN public.alumni a ON a.id = r.record_id
        WHERE r.person_id = p.id AND r.record_type = 'alumni'
      ) links
      WHERE links.linkedin_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/[^[:space:]]*$'
      ORDER BY links.priority, links.linkedin_url
      LIMIT 1
    ) profile ON true
    WHERE public.roster_office_rank(e.role_label) IS NOT NULL
      AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(public.current_semester_key())
      AND NOT p.public_hidden
      AND NOT EXISTS (
        SELECT 1 FROM public.person_records r JOIN public.members m ON m.id = r.record_id
        WHERE r.person_id = p.id AND r.record_type = 'member' AND m.membership_status = 'expelled')
  ),
  s AS (
    SELECT semester_key,
           jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'office', role_label, 'name', first_name || ' ' || surname,
             'group', CASE WHEN rank < 50 THEN 'officer' ELSE 'head' END,
             'linkedin_url', linkedin_url
           )) ORDER BY rank, surname, first_name) AS board
    FROM b GROUP BY semester_key
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('key', semester_key, 'label', public.semester_label(semester_key), 'board', board)
                            ORDER BY public.semester_ordinal(semester_key) DESC), '[]'::jsonb)
  FROM s
$$;
REVOKE ALL ON FUNCTION public.public_past_boards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_past_boards() TO anon, authenticated, service_role;