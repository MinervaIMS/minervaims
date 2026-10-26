-- =====================================================================
-- Step 94B: the Time Machine and the person record.
-- ---------------------------------------------------------------------
-- People > Rosters becomes People > Time Machine: every past semester
-- since Fall 2019, newest first, the Board and then each division. Every
-- name opens one person's record: their career inside Minerva, the
-- reports they wrote, and their alumni entry. This migration gives both
-- what they read.
--
-- 1. ONE PERSON, ONE RECORD. A member or alumnus whose name carries a
--    middle name the history does not (or the other way round) was given
--    a second person in Step 94. Each such pair, when it is the only
--    possible pair both ways, is joined into the person with the
--    history; the duplicate's row is copied to people_merge_log first.
-- 2. THE SEMESTER REGISTERS JOIN THE TIME MACHINE. The registers frozen
--    when a fee collection closes (shown in People > Members until now)
--    add to their semester everybody the history does not already list,
--    and each row says whether the person was in the official register.
-- 3. REPORTS, PERSON BY PERSON. Each author of a published report is
--    matched to one person: the member or alumnus picked in the editor,
--    else the one person who carries the name (the same words, or one
--    name's words all within the other's). A namesake is never guessed.
-- 4. THE READS, each checking the caller as the rosters already do: the
--    Time Machine (every past semester at once), a person's record, and
--    the overview behind the Since and Reports columns of People >
--    Members and People > Alumni.
-- 5. The offer email's subject stops naming the Society twice again.
--
-- Idempotent: safe to run twice. Nothing is deleted except a duplicate
-- person with no history of its own, copied first to people_merge_log.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. One person, one record.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people_merge_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merged_person_id  uuid NOT NULL,
  merged_code       text NOT NULL,
  first_name        text NOT NULL,
  surname           text NOT NULL,
  into_person_id    uuid NOT NULL,
  records           jsonb NOT NULL,
  merged_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.people_merge_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.people_merge_log FROM anon, authenticated;
GRANT ALL ON public.people_merge_log TO service_role;

-- A person with a member or alumni record and no history of their own,
-- next to exactly one person with history whose name has the same words
-- or contains them (and the other way round, exactly one), and whose
-- records are of other kinds. A member is joined only to a history that
-- reaches the previous semester, so a new member is never joined to a
-- namesake who left years ago.
CREATE OR REPLACE FUNCTION public.people_merge_duplicates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev integer := public.semester_ordinal(public.current_semester_key()) - 1;
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    WITH dup AS (
      SELECT p.id, public.person_tokens(p.first_name || ' ' || p.surname) AS tok,
             array_agg(DISTINCT pr.record_type) AS types
      FROM public.people p
      JOIN public.person_records pr ON pr.person_id = p.id
      WHERE NOT p.public_hidden
        AND NOT EXISTS (SELECT 1 FROM public.roster_entries e WHERE e.person_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM public.alumni_pending ap WHERE ap.person_id = p.id)
      GROUP BY p.id
    ), hist AS (
      SELECT p.id, public.person_tokens(p.first_name || ' ' || p.surname) AS tok,
             coalesce(array_agg(DISTINCT pr.record_type) FILTER (WHERE pr.record_type IS NOT NULL), '{}'::text[]) AS types,
             max(public.semester_ordinal(e.semester_key)) AS last_ord
      FROM public.people p
      JOIN public.roster_entries e ON e.person_id = p.id
      LEFT JOIN public.person_records pr ON pr.person_id = p.id
      GROUP BY p.id
    ), pair AS (
      SELECT d.id AS dup_id, h.id AS into_id
      FROM dup d
      JOIN hist h
        ON cardinality(d.tok) >= 2 AND cardinality(h.tok) >= 2
       AND (d.tok @> h.tok OR h.tok @> d.tok)
       AND abs(cardinality(d.tok) - cardinality(h.tok)) <= 1
       AND NOT (d.types && h.types)
       AND (NOT ('member' = ANY (d.types)) OR h.last_ord >= v_prev)
    )
    SELECT p.dup_id, p.into_id FROM pair p
    WHERE (SELECT count(*) FROM pair x WHERE x.dup_id = p.dup_id) = 1
      AND (SELECT count(*) FROM pair x WHERE x.into_id = p.into_id) = 1
  LOOP
    INSERT INTO public.people_merge_log (merged_person_id, merged_code, first_name, surname, into_person_id, records)
    SELECT p.id, p.code, p.first_name, p.surname, r.into_id,
           coalesce((SELECT jsonb_agg(jsonb_build_object('type', x.record_type, 'id', x.record_id))
                       FROM public.person_records x WHERE x.person_id = p.id), '[]'::jsonb)
    FROM public.people p WHERE p.id = r.dup_id;
    UPDATE public.person_records SET person_id = r.into_id WHERE person_id = r.dup_id;
    RAISE NOTICE 'Step 94B: % joined to % (the history).',
      (SELECT first_name || ' ' || surname FROM public.people WHERE id = r.dup_id),
      (SELECT first_name || ' ' || surname FROM public.people WHERE id = r.into_id);
    DELETE FROM public.people WHERE id = r.dup_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.people_merge_duplicates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.people_merge_duplicates() TO service_role;

DO $merge$
BEGIN
  RAISE NOTICE 'Step 94B: % duplicate people joined.', public.people_merge_duplicates();
END
$merge$;


-- ---------------------------------------------------------------------
-- 2. The semester registers join the Time Machine.
-- ---------------------------------------------------------------------
-- The person of a register row: the member's person, or, when the member
-- record is gone, the one person with that name, or a new person.
CREATE OR REPLACE FUNCTION public.person_for_register_row(p_member uuid, p_first text, p_surname text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
BEGIN
  IF p_member IS NOT NULL THEN
    v_person := public.person_for_member(p_member);
    IF v_person IS NOT NULL THEN RETURN v_person; END IF;
  END IF;
  IF btrim(coalesce(p_first, '')) = '' OR btrim(coalesce(p_surname, '')) = '' THEN RETURN NULL; END IF;
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(p.id))[1] END INTO v_person
  FROM public.people p WHERE p.name_key = public.person_name_key(p_first, p_surname);
  RETURN coalesce(v_person, public.person_create(p_first, p_surname));
END;
$$;
REVOKE ALL ON FUNCTION public.person_for_register_row(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.person_for_register_row(uuid, text, text) TO service_role;

-- Who was in each frozen register, as people (read-only twin of the
-- function above: it never creates anybody).
CREATE OR REPLACE FUNCTION public.register_people()
RETURNS TABLE (semester_key text, person_id uuid)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT sm.semester_key, coalesce(pr.person_id, nm.id)
  FROM public.semester_members sm
  LEFT JOIN public.person_records pr ON pr.record_type = 'member' AND pr.record_id = sm.member_id
  LEFT JOIN LATERAL (
    SELECT CASE WHEN count(*) = 1 THEN (array_agg(p.id))[1] END AS id
    FROM public.people p
    WHERE pr.person_id IS NULL AND p.name_key = public.person_name_key(sm.first_name, sm.surname)
  ) nm ON true
  WHERE coalesce(pr.person_id, nm.id) IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.register_people() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_people() TO service_role;

-- When the fee collection freezes a register, its people enter that
-- semester, unless the history or a correction already lists them there.
-- Never stops the register from being written.
CREATE OR REPLACE FUNCTION public.roster_from_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  v_role public.app_role;
  v_division public.org_division;
  v_team text;
  v_div text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM public.roster_entries e
      USING public.person_records r
      WHERE r.record_type = 'member' AND r.record_id = OLD.member_id
        AND e.person_id = r.person_id AND e.semester_key = OLD.semester_key AND e.source = 'register';
      RETURN OLD;
    END IF;
    IF coalesce(NEW.role, '') = '' OR NEW.semester_key !~ '^[0-9]{4}-(fall|spring)$' THEN
      RETURN NEW;
    END IF;
    v_person := public.person_for_register_row(NEW.member_id, NEW.first_name, NEW.surname);
    IF v_person IS NULL
       OR EXISTS (SELECT 1 FROM public.roster_entries WHERE person_id = v_person AND semester_key = NEW.semester_key) THEN
      RETURN NEW;
    END IF;
    v_role := NEW.role::public.app_role;
    v_division := coalesce(NULLIF(NEW.division, ''), 'none')::public.org_division;
    -- The team as it stands is the team of the semester being frozen now.
    IF NEW.semester_key = public.current_semester_key() THEN
      SELECT team INTO v_team FROM public.members WHERE id = NEW.member_id;
    END IF;
    v_div := public.roster_division_key(v_role, v_division);
    INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
    VALUES (v_person, NEW.semester_key, public.roster_role_label(v_role, v_division), v_div,
            public.roster_team_key(v_div, v_team), 'register')
    ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'roster_from_register: %', SQLERRM;
  END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS roster_from_register ON public.semester_members;
CREATE TRIGGER roster_from_register AFTER INSERT OR DELETE ON public.semester_members
  FOR EACH ROW EXECUTE FUNCTION public.roster_from_register();

-- The registers already frozen, once: whoever the history does not list
-- in that semester joins it, with the role the register recorded.
DO $registers$
DECLARE
  r record;
  v_person uuid;
  v_role public.app_role;
  v_division public.org_division;
  v_div text;
  n integer := 0;
BEGIN
  FOR r IN SELECT sm.* FROM public.semester_members sm
           WHERE coalesce(sm.role, '') <> '' AND sm.semester_key ~ '^[0-9]{4}-(fall|spring)$'
           ORDER BY sm.semester_key, sm.surname, sm.first_name LOOP
    BEGIN
      v_person := public.person_for_register_row(r.member_id, r.first_name, r.surname);
      CONTINUE WHEN v_person IS NULL;
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.roster_entries WHERE person_id = v_person AND semester_key = r.semester_key);
      v_role := r.role::public.app_role;
      v_division := coalesce(NULLIF(r.division, ''), 'none')::public.org_division;
      v_div := public.roster_division_key(v_role, v_division);
      INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
      VALUES (v_person, r.semester_key, public.roster_role_label(v_role, v_division), v_div, NULL, 'register')
      ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Register row % not added to its semester: %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Step 94B: % people from the frozen registers added to their semester.', n;
END
$registers$;


-- ---------------------------------------------------------------------
-- 3. Reports, person by person.
-- ---------------------------------------------------------------------
-- Every author of every published report, with their person when exactly
-- one person is theirs. One pass over the reports and one over the
-- people (the public report pages taught the cost of a pass per report).
CREATE OR REPLACE FUNCTION public.report_authorships()
RETURNS TABLE (person_id uuid, report_id uuid, author_ord bigint, author_role text)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ppl AS MATERIALIZED (
    SELECT p.id, public.person_tokens(p.first_name || ' ' || p.surname) AS tok FROM public.people p
  ), a AS MATERIALIZED (
    SELECT f.id AS report_id, t.ord,
           NULLIF(btrim(coalesce(t.e->>'role', '')), '') AS role,
           public.person_tokens(t.e->>'name') AS tok,
           CASE WHEN t.e->>'member_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN (t.e->>'member_id')::uuid END AS member_id,
           CASE WHEN t.e->>'alumni_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN (t.e->>'alumni_id')::uuid END AS alumni_id
    FROM public.archive_files f
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(f.authors) = 'array' THEN f.authors ELSE '[]'::jsonb END)
         WITH ORDINALITY AS t(e, ord)
    WHERE f.status = 'published' AND f.deleted_at IS NULL
      AND jsonb_typeof(t.e) = 'object' AND btrim(coalesce(t.e->>'name', '')) <> ''
  ), picked AS (
    SELECT x.report_id, x.ord, min(x.person_id::text)::uuid AS person_id
    FROM (
      SELECT a.report_id, a.ord, pr.person_id FROM a
      JOIN public.person_records pr ON pr.record_type = 'member' AND pr.record_id = a.member_id
      UNION ALL
      SELECT a.report_id, a.ord, pr.person_id FROM a
      JOIN public.person_records pr ON pr.record_type = 'alumni' AND pr.record_id = a.alumni_id
    ) x
    GROUP BY x.report_id, x.ord
  ), exact AS (
    SELECT a.report_id, a.ord, min(p.id::text)::uuid AS person_id, count(*) AS n
    FROM a JOIN ppl p ON p.tok = a.tok
    WHERE cardinality(a.tok) >= 2
    GROUP BY a.report_id, a.ord
  ), near_pairs AS (
    -- A person whose name holds every word of the author's: they share
    -- the author's first word. An author whose name holds every word of
    -- the person's: they share the person's first word.
    SELECT a.report_id, a.ord, w.id
    FROM a JOIN (SELECT p.id, p.tok, x AS word FROM ppl p, unnest(p.tok) x) w ON w.word = a.tok[1]
    WHERE cardinality(a.tok) >= 2 AND cardinality(w.tok) >= 2 AND w.tok @> a.tok
    UNION
    SELECT a.report_id, a.ord, p.id
    FROM a CROSS JOIN LATERAL unnest(a.tok) aw(word) JOIN ppl p ON p.tok[1] = aw.word
    WHERE cardinality(a.tok) >= 2 AND cardinality(p.tok) >= 2 AND a.tok @> p.tok
  ), near AS (
    SELECT report_id, ord, min(id::text)::uuid AS person_id, count(DISTINCT id) AS n
    FROM near_pairs GROUP BY report_id, ord
  ), matched AS (
    SELECT a.report_id, a.ord, a.role,
           coalesce(pk.person_id,
                    CASE WHEN ex.n = 1 THEN ex.person_id END,
                    CASE WHEN ex.n IS NULL AND nr.n = 1 THEN nr.person_id END) AS person_id
    FROM a
    LEFT JOIN picked pk ON pk.report_id = a.report_id AND pk.ord = a.ord
    LEFT JOIN exact ex ON ex.report_id = a.report_id AND ex.ord = a.ord
    LEFT JOIN near nr ON nr.report_id = a.report_id AND nr.ord = a.ord
  )
  SELECT person_id, report_id, ord, role FROM matched WHERE person_id IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.report_authorships() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_authorships() TO service_role;


-- ---------------------------------------------------------------------
-- 4. The reads.
-- ---------------------------------------------------------------------
-- THE TIME MACHINE: every past semester, newest first, with its people
-- (the Board's offices ranked first), as far as the caller may read: the
-- Board and Operations every division, members from Analyst up their own.
CREATE OR REPLACE FUNCTION public.time_machine_for(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  v_scope text := a ->> 'scope';
  v_all boolean := (a ->> 'scope') = 'all';
  v_divs text[] := ARRAY(SELECT jsonb_array_elements_text(a -> 'divisions'));
  v_codes boolean := (a ->> 'show_codes')::boolean;
  v_now text := public.current_semester_key();
  v_out jsonb;
BEGIN
  IF v_scope = 'none' THEN RAISE EXCEPTION 'You cannot open the Time Machine.' USING ERRCODE = '42501'; END IF;
  WITH reg AS MATERIALIZED (
    SELECT * FROM public.register_people()
  ), sem AS (
    SELECT e.semester_key,
           count(DISTINCT e.person_id) AS people,
           jsonb_agg(jsonb_build_object(
             'entry_id', e.id, 'person_id', CASE WHEN v_all THEN e.person_id END,
             'code', CASE WHEN v_codes THEN p.code END,
             'first_name', p.first_name, 'surname', p.surname, 'role', e.role_label,
             'division', e.division_key, 'team', e.team,
             'office_rank', public.roster_office_rank(e.role_label), 'source', e.source,
             'in_register', EXISTS (SELECT 1 FROM reg WHERE reg.semester_key = e.semester_key AND reg.person_id = e.person_id))
           ORDER BY public.roster_office_rank(e.role_label) NULLS LAST, e.division_key, e.role_label, p.surname, p.first_name) AS list
    FROM public.roster_entries e
    JOIN public.people p ON p.id = e.person_id
    WHERE public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_now)
      AND (v_all OR public.roster_division_visible(e.division_key, v_divs))
    GROUP BY e.semester_key
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'key', s.semester_key, 'label', public.semester_label(s.semester_key), 'count', s.people,
           'register', CASE WHEN v_all AND ss.semester_key IS NOT NULL
                            THEN jsonb_build_object('count', ss.members_count, 'frozen_at', ss.created_at) END,
           'rows', s.list)
         ORDER BY public.semester_ordinal(s.semester_key) DESC), '[]'::jsonb)
  INTO v_out
  FROM sem s
  LEFT JOIN public.semester_snapshots ss ON ss.semester_key = s.semester_key;
  RETURN jsonb_build_object('scope', v_scope, 'divisions', a -> 'divisions',
                            'can_edit', (a ->> 'can_edit')::boolean, 'show_codes', v_codes,
                            'current', v_now, 'current_label', public.semester_label(v_now),
                            'semesters', v_out);
END;
$$;
REVOKE ALL ON FUNCTION public.time_machine_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.time_machine_for(uuid) TO service_role;

-- ONE PERSON'S RECORD, from a person, a member or an alumni entry: their
-- career inside Minerva (every past semester, and the current one from
-- the member register), the reports they wrote, their member and alumni
-- entries. For the readers who see every division.
CREATE OR REPLACE FUNCTION public.person_record_for(p_uid uuid, p_kind text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  v_now text := public.current_semester_key();
  v_person uuid;
  p record;
  v_career jsonb;
  v_reports jsonb;
  v_member jsonb;
  v_alumni jsonb;
BEGIN
  IF a ->> 'scope' <> 'all' THEN RAISE EXCEPTION 'You cannot open a person''s record.' USING ERRCODE = '42501'; END IF;
  IF p_kind = 'person' THEN
    v_person := p_id;
  ELSIF p_kind IN ('member', 'alumni') THEN
    SELECT person_id INTO v_person FROM public.person_records WHERE record_type = p_kind AND record_id = p_id;
  ELSE
    RAISE EXCEPTION 'Unknown kind of record.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO p FROM public.people WHERE id = v_person;
  IF NOT FOUND THEN RAISE EXCEPTION 'This person has no record yet.' USING ERRCODE = '22023'; END IF;

  SELECT coalesce(jsonb_agg(c.x ORDER BY c.ord, c.rank NULLS LAST, c.x ->> 'role'), '[]'::jsonb)
  INTO v_career
  FROM (
    SELECT jsonb_build_object('semester', e.semester_key, 'label', public.semester_label(e.semester_key),
                              'role', e.role_label, 'division', e.division_key, 'team', e.team,
                              'source', e.source, 'live', false) AS x,
           public.semester_ordinal(e.semester_key) AS ord, public.roster_office_rank(e.role_label) AS rank
    FROM public.roster_entries e
    WHERE e.person_id = v_person
      AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_now)
    UNION ALL
    SELECT jsonb_build_object('semester', v_now, 'label', public.semester_label(v_now),
                              'role', l.role_label, 'division', l.division_key, 'team', l.team,
                              'source', 'live', 'live', true, 'status', l.status),
           public.semester_ordinal(v_now), public.roster_office_rank(l.role_label)
    FROM public.roster_live() l
    WHERE l.person_id = v_person
  ) c;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'date', f.date,
                                               'division', f.division, 'fund', f.fund, 'role', ra.author_role)
                            ORDER BY f.date DESC, f.title), '[]'::jsonb)
  INTO v_reports
  FROM (SELECT DISTINCT ON (x.report_id) x.report_id, x.author_role
          FROM public.report_authorships() x
         WHERE x.person_id = v_person
         ORDER BY x.report_id, x.author_ord) ra
  JOIN public.archive_files f ON f.id = ra.report_id;

  SELECT jsonb_build_object('id', m.id, 'role', public.roster_role_label(m.role, m.division),
                            'division', public.roster_division_key(m.role, m.division),
                            'membership_status', m.membership_status, 'linkedin_url', m.linkedin_url)
  INTO v_member
  FROM public.person_records pr JOIN public.members m ON m.id = pr.record_id
  WHERE pr.person_id = v_person AND pr.record_type = 'member'
  LIMIT 1;

  SELECT jsonb_agg(jsonb_build_object('id', al.id, 'graduation_year', al.graduation_year, 'company', al.company,
                                      'job_area', al.job_area, 'city', al.city, 'linkedin_url', al.linkedin_url)
                   ORDER BY al.graduation_year DESC)
  INTO v_alumni
  FROM public.person_records pr JOIN public.alumni al ON al.id = pr.record_id
  WHERE pr.person_id = v_person AND pr.record_type = 'alumni';

  RETURN jsonb_build_object(
    'person_id', p.id, 'code', CASE WHEN (a ->> 'show_codes')::boolean THEN p.code END,
    'first_name', p.first_name, 'surname', p.surname, 'public_hidden', p.public_hidden,
    'held_office', EXISTS (SELECT 1 FROM public.roster_entries e
                            WHERE e.person_id = p.id AND public.roster_office_rank(e.role_label) IS NOT NULL),
    'current', v_now, 'career', v_career, 'reports', v_reports,
    'member', v_member, 'alumni', coalesce(v_alumni, '[]'::jsonb),
    'can_edit', (a ->> 'can_edit')::boolean);
END;
$$;
REVOKE ALL ON FUNCTION public.person_record_for(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.person_record_for(uuid, text, uuid) TO service_role;

-- THE PEOPLE OVERVIEW: for each member and each alumni entry, since when
-- the person has been in Minerva, for how many semesters, and how many
-- reports they wrote. For the readers who see every division; anybody
-- else is told the columns are not theirs.
CREATE OR REPLACE FUNCTION public.people_overview_for(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  v_now text := public.current_semester_key();
  v_out jsonb;
BEGIN
  IF a ->> 'scope' <> 'all' THEN RETURN jsonb_build_object('visible', false); END IF;
  WITH auth AS MATERIALIZED (
    SELECT x.person_id, count(DISTINCT x.report_id) AS n FROM public.report_authorships() x GROUP BY x.person_id
  ), hist AS (
    SELECT e.person_id,
           (array_agg(e.semester_key ORDER BY public.semester_ordinal(e.semester_key)))[1] AS first_key,
           count(DISTINCT e.semester_key) AS n
    FROM public.roster_entries e
    WHERE public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_now)
    GROUP BY e.person_id
  ), live AS (
    SELECT DISTINCT l.person_id FROM public.roster_live() l WHERE l.person_id IS NOT NULL
  ), per AS (
    SELECT pr.record_type, pr.record_id, jsonb_build_object(
             'person_id', pr.person_id,
             'since', coalesce(h.first_key, CASE WHEN lv.person_id IS NOT NULL THEN v_now END),
             'semesters', coalesce(h.n, 0) + CASE WHEN lv.person_id IS NOT NULL THEN 1 ELSE 0 END,
             'reports', coalesce(au.n, 0)) AS o
    FROM public.person_records pr
    LEFT JOIN hist h ON h.person_id = pr.person_id
    LEFT JOIN live lv ON lv.person_id = pr.person_id
    LEFT JOIN auth au ON au.person_id = pr.person_id
  )
  SELECT jsonb_build_object('visible', true, 'current', v_now,
    'members', coalesce((SELECT jsonb_object_agg(record_id, o) FROM per WHERE record_type = 'member'), '{}'::jsonb),
    'alumni', coalesce((SELECT jsonb_object_agg(record_id, o) FROM per WHERE record_type = 'alumni'), '{}'::jsonb))
  INTO v_out;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.people_overview_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.people_overview_for(uuid) TO service_role;

-- The workspace's three reads, as the signed-in caller.
CREATE OR REPLACE FUNCTION public.time_machine()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.time_machine_for(auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.person_record(p_kind text, p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.person_record_for(auth.uid(), p_kind, p_id) $$;
CREATE OR REPLACE FUNCTION public.people_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.people_overview_for(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.time_machine() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.person_record(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.people_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.time_machine() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.person_record(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.people_overview() TO authenticated, service_role;


-- ---------------------------------------------------------------------
-- 5. The offer email's subject. Every subject already ends "| Minerva
--    IMS", so this one stops naming the Society a second time, as Step 94
--    had it before Step 96 rewrote the stored emails. The source is
--    transactional-emails.ts; the stored copy and its <title> follow it,
--    unless somebody has rewritten them since.
-- ---------------------------------------------------------------------
UPDATE public.auto_email_templates
   SET subject = 'Your offer of membership | Minerva IMS'
 WHERE key = 'offer_to_join'
   AND subject IN ('Your offer to join Minerva IMS | Minerva IMS', 'Your offer to join Minerva IMS');
UPDATE public.auto_email_templates
   SET body = replace(body, '<title>Your offer to join Minerva IMS | Minerva IMS</title>',
                            '<title>Your offer of membership | Minerva IMS</title>')
 WHERE key = 'offer_to_join'
   AND subject = 'Your offer of membership | Minerva IMS'
   AND strpos(body, '<title>Your offer to join Minerva IMS | Minerva IMS</title>') > 0;

DO $report$
BEGIN
  RAISE NOTICE 'Step 94B: % people, % past semester entries (% from registers), % report authors matched to a person.',
    (SELECT count(*) FROM public.people),
    (SELECT count(*) FROM public.roster_entries
      WHERE public.semester_ordinal(semester_key) < public.semester_ordinal(public.current_semester_key())),
    (SELECT count(*) FROM public.roster_entries WHERE source = 'register'),
    (SELECT count(*) FROM public.report_authorships());
END
$report$;
