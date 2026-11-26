-- =====================================================================
-- STEP 110: each person's LinkedIn profile in People > Time Machine.
-- ---------------------------------------------------------------------
-- The Time Machine lists who was in each past semester. Step 110 shows,
-- beside each name, the person's LinkedIn profile where the records hold
-- one: the member record first (the one the person keeps up to date),
-- then their entry on the public Members page, then an alumni record,
-- and only an address on linkedin.com, as the public Past Boards accept
-- (public_past_boards). Nothing else changes: the
-- reader is the same function, with the same scope, the same codes rule
-- and the same order, and one more field on each row, `linkedin_url`.
--
-- The profiles are found in ONE pass over the people's records (the
-- `li` set below), never one query per row, so a semester of a hundred
-- people costs what a semester of ten does.
--
-- Safe to run twice: it only replaces the function, with its grants.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.time_machine_for(p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a jsonb := public.roster_access(p_uid); v_scope text := a ->> 'scope'; v_all boolean := (a ->> 'scope') = 'all';
  v_divs text[] := ARRAY(SELECT jsonb_array_elements_text(a -> 'divisions')); v_codes boolean := (a ->> 'show_codes')::boolean;
  v_now text := public.current_semester_key(); v_out jsonb;
BEGIN
  IF v_scope = 'none' THEN RAISE EXCEPTION 'You cannot open the Time Machine.' USING ERRCODE = '42501'; END IF;
  WITH reg AS MATERIALIZED (SELECT * FROM public.register_people()),
  li AS MATERIALIZED (
    SELECT DISTINCT ON (x.person_id) x.person_id, x.url FROM (
      SELECT pr.person_id, btrim(m.linkedin_url) AS url, 0 AS pref, m.updated_at AS at
      FROM public.person_records pr JOIN public.members m ON m.id = pr.record_id WHERE pr.record_type = 'member'
      UNION ALL
      SELECT pr.person_id, btrim(t.linkedin_url), 1, NULL::timestamptz
      FROM public.person_records pr JOIN public.team_members t ON t.member_id = pr.record_id WHERE pr.record_type = 'member'
      UNION ALL
      SELECT pr.person_id, btrim(al.linkedin_url), 2, NULL::timestamptz
      FROM public.person_records pr JOIN public.alumni al ON al.id = pr.record_id WHERE pr.record_type = 'alumni'
    ) x WHERE x.url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/[^[:space:]]*$'
    ORDER BY x.person_id, x.pref, x.at DESC NULLS LAST, x.url
  ), sem AS (
    SELECT e.semester_key, count(DISTINCT e.person_id) AS people,
      jsonb_agg(jsonb_build_object('entry_id', e.id, 'person_id', CASE WHEN v_all THEN e.person_id END,
        'code', CASE WHEN v_codes THEN p.code END, 'first_name', p.first_name, 'surname', p.surname, 'role', e.role_label,
        'division', e.division_key, 'team', e.team, 'office_rank', public.roster_office_rank(e.role_label), 'source', e.source,
        'in_register', EXISTS (SELECT 1 FROM reg WHERE reg.semester_key = e.semester_key AND reg.person_id = e.person_id),
        'linkedin_url', li.url)
        ORDER BY public.roster_office_rank(e.role_label) NULLS LAST, e.division_key, e.role_label, p.surname, p.first_name) AS list
    FROM public.roster_entries e JOIN public.people p ON p.id = e.person_id LEFT JOIN li ON li.person_id = e.person_id
    WHERE public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_now)
      AND (v_all OR public.roster_division_visible(e.division_key, v_divs)) GROUP BY e.semester_key
  ) SELECT coalesce(jsonb_agg(jsonb_build_object('key', s.semester_key, 'label', public.semester_label(s.semester_key), 'count', s.people,
    'register', CASE WHEN v_all AND ss.semester_key IS NOT NULL THEN jsonb_build_object('count', ss.members_count, 'frozen_at', ss.created_at) END,
    'rows', s.list) ORDER BY public.semester_ordinal(s.semester_key) DESC), '[]'::jsonb)
  INTO v_out FROM sem s LEFT JOIN public.semester_snapshots ss ON ss.semester_key = s.semester_key;
  RETURN jsonb_build_object('scope', v_scope, 'divisions', a -> 'divisions', 'can_edit', (a ->> 'can_edit')::boolean, 'show_codes', v_codes,
    'current', v_now, 'current_label', public.semester_label(v_now), 'semesters', v_out);
END;
$$;
REVOKE ALL ON FUNCTION public.time_machine_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.time_machine_for(uuid) TO service_role;
