CREATE OR REPLACE FUNCTION public.my_person_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_person uuid; v_email text;
BEGIN
 IF v_uid IS NULL THEN RETURN NULL; END IF;
 SELECT pr.person_id INTO v_person FROM public.members m JOIN public.person_records pr ON pr.record_type = 'member' AND pr.record_id = m.id WHERE m.user_id = v_uid ORDER BY m.updated_at DESC LIMIT 1;
 IF v_person IS NOT NULL THEN RETURN v_person; END IF;
 SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
 IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;
 SELECT CASE WHEN count(DISTINCT pr.person_id) = 1 THEN (array_agg(pr.person_id))[1] END INTO v_person FROM public.alumni_contacts c JOIN public.person_records pr ON pr.record_type = 'alumni' AND pr.record_id = c.alumni_id WHERE lower(btrim(c.email)) = v_email;
 RETURN v_person;
END; $$;
REVOKE ALL ON FUNCTION public.my_person_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_person_id() TO service_role;
CREATE OR REPLACE FUNCTION public.my_roster_history()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_person uuid; v_current text := public.current_semester_key(); v_entries jsonb; v_live jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to read your history.' USING ERRCODE = '42501'; END IF;
 v_person := public.my_person_id();
 IF v_person IS NULL THEN RETURN jsonb_build_object('linked', false, 'current_semester', v_current, 'current_label', public.semester_label(v_current), 'entries', '[]'::jsonb, 'current', NULL); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('semester', e.semester_key, 'label', public.semester_label(e.semester_key), 'role', e.role_label, 'division', e.division_key, 'team', e.team) ORDER BY public.semester_ordinal(e.semester_key) DESC, public.roster_office_rank(e.role_label) NULLS LAST), '[]'::jsonb) INTO v_entries FROM public.roster_entries e WHERE e.person_id = v_person AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_current);
 SELECT jsonb_build_object('semester', v_current, 'label', public.semester_label(v_current), 'role', l.role_label, 'division', l.division_key, 'team', l.team, 'status', l.status) INTO v_live FROM public.roster_live() l WHERE l.person_id = v_person LIMIT 1;
 RETURN jsonb_build_object('linked', true, 'current_semester', v_current, 'current_label', public.semester_label(v_current), 'entries', v_entries, 'current', v_live);
END; $$;
REVOKE ALL ON FUNCTION public.my_roster_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_roster_history() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.my_report_projects()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_links text[]; v_people jsonb;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to read your projects.' USING ERRCODE = '42501'; END IF;
 SELECT coalesce(array_agg('/people/members?person=' || t.id::text), '{}'::text[]) INTO v_links FROM public.team_members t JOIN public.members m ON m.id = t.member_id WHERE m.user_id = v_uid;
 SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
 IF v_email IS NOT NULL AND v_email <> '' THEN v_links := v_links || coalesce((SELECT array_agg(DISTINCT '/people/alumni?person=' || c.alumni_id::text) FROM public.alumni_contacts c WHERE lower(btrim(c.email)) = v_email), '{}'::text[]); END IF;
 IF cardinality(v_links) = 0 THEN RETURN jsonb_build_object('linked', false, 'reports', '[]'::jsonb); END IF;
 v_people := public.public_people_json();
 RETURN jsonb_build_object('linked', true, 'reports', coalesce((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'slug', CASE WHEN f.status = 'published' THEN f.slug END, 'date', f.date, 'division', f.division, 'report_type', coalesce(f.report_type, public.archive_default_type(f.division::text)), 'status', f.status, 'role', a.role) ORDER BY f.date DESC NULLS LAST, f.created_at DESC) FROM public.archive_files f CROSS JOIN LATERAL (SELECT x ->> 'role' AS role FROM jsonb_array_elements(public.resolve_report_authors(f.authors, v_people)) x WHERE x ->> 'link' = ANY (v_links) LIMIT 1) a WHERE f.deleted_at IS NULL), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.my_report_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_report_projects() TO authenticated, service_role;