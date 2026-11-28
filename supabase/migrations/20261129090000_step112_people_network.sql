-- =====================================================================
-- STEP 112: PEOPLE > NETWORK, SIMPLER AND BY DIVISION.
-- ---------------------------------------------------------------------
-- What changes in the data the network is built from (network_input):
--   * Media and Operations are one division, Media & Operations, as the
--     two teams work as one.
--   * In a semester Media & Operations has no head, its members are tied
--     to the President and the Vice-President directly ('direct', with
--     them as the hub), and to no other Board member.
--   * The President of a semester is lightly tied to every member of it
--     ('president'), the Vice-President more lightly still ('vice'): they
--     collect the fee and speak at every event. The weights are in
--     TIE_WEIGHTS (_shared/network-engine.ts).
--   * The association's own account (the Website Admin) is not a person
--     and is left out, as the people left out at their request are.
--   * Each person's division of belonging, the division of most
--     semesters (a Board office counted only for someone who held
--     nothing else), is given with the people: the map and coalition
--     building group people by division instead of by communities an
--     algorithm found, which named groups after single people.
-- What changes in the storage: each person's division with their scores,
-- and with each tie the semesters one of the two was President or
-- Vice-President while the other was a member ('officer'). The page no
-- longer reads weekly points: the network is analysed on the 1st and the
-- 15th of each month from February to June and from September to
-- December, and on the 1st only in January, July and August.
--
-- Safe to run twice: columns are added only if missing, functions are
-- replaced, the jobs rescheduled. Nothing stored is changed or deleted.
-- It sends no email.
-- =====================================================================

ALTER TABLE public.network_scores ADD COLUMN IF NOT EXISTS division text;
ALTER TABLE public.network_ties ADD COLUMN IF NOT EXISTS officer integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- What the network is built from: the groups and the people in them.
-- The Board of a semester comes in three tiers (officers, lead, board),
-- so each pair of its members takes one tier's weight; a person holding
-- two offices takes the higher. Divisions merge Media and Operations.
-- A group with a `hub` ties the hub to each member, and the members not
-- to each other.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.network_input()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH now_key AS MATERIALIZED (
    SELECT public.current_semester_key() AS k
  ), admin_members AS MATERIALIZED (
    -- The association's own account: not a person of the Society.
    SELECT m.id FROM public.members m
     WHERE m.role::text = 'admin'
        OR lower(btrim(coalesce(m.email, ''))) = 'as.minerva@unibocconi.it'
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = m.user_id AND ur.role::text = 'admin')
  ), out_nodes AS MATERIALIZED (
    SELECT x.node FROM public.network_exclusions x
    UNION
    SELECT pr.person_id::text
      FROM public.network_exclusions x
      JOIN public.person_records pr ON pr.record_type = 'member' AND 'm:' || pr.record_id::text = x.node
    UNION
    SELECT pr.person_id::text FROM public.person_records pr JOIN admin_members a ON pr.record_type = 'member' AND pr.record_id = a.id
    UNION
    SELECT 'm:' || a.id::text FROM admin_members a
    UNION
    SELECT p.id::text FROM public.people p
     WHERE lower(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.surname, ''))) = 'website admin'
  ), live AS MATERIALIZED (
    SELECT coalesce(l.person_id::text, 'm:' || l.member_id::text) AS node, l.member_id, l.first_name, l.surname,
           l.role_label, l.division_key
      FROM public.roster_live() l
  ), ros AS MATERIALIZED (
    SELECT r.node, r.semester_key, r.role_label,
           CASE WHEN r.division_key IN ('media', 'operations') THEN 'media_operations' ELSE r.division_key END AS division_key
      FROM (
      SELECT e.person_id::text AS node, e.semester_key, e.role_label, e.division_key
        FROM public.roster_entries e, now_key
       WHERE public.semester_ordinal(e.semester_key) < public.semester_ordinal(now_key.k)
      UNION ALL
      SELECT l.node, now_key.k, l.role_label, l.division_key FROM live l, now_key
    ) r
    WHERE r.node NOT IN (SELECT node FROM out_nodes)
  ), rep AS MATERIALIZED (
    SELECT x.person_id::text AS node, f.id, f.date,
           CASE WHEN extract(month FROM f.date) >= 9 THEN extract(year FROM f.date)::int || '-fall'
                WHEN extract(month FROM f.date) = 1 THEN (extract(year FROM f.date)::int - 1) || '-fall'
                ELSE extract(year FROM f.date)::int || '-spring' END AS semester_key
      FROM public.report_authorships() x
      JOIN public.archive_files f ON f.id = x.report_id
     WHERE x.person_id::text NOT IN (SELECT node FROM out_nodes)
  ), bm AS MATERIALIZED (
    -- The Board of each semester, each member once, at their highest office.
    SELECT node, semester_key, min(public.roster_office_rank(role_label)) AS rank
      FROM ros WHERE public.roster_office_rank(role_label) IS NOT NULL
     GROUP BY node, semester_key
  ), members_of AS MATERIALIZED (
    -- Every member of a semester (the Board included, nobody without a division).
    SELECT DISTINCT semester_key, node FROM ros WHERE division_key <> 'none'
  ), mo_headless AS MATERIALIZED (
    -- The semesters Media & Operations has members and no head.
    SELECT semester_key FROM ros WHERE division_key = 'media_operations'
     GROUP BY semester_key HAVING bool_and(public.roster_office_rank(role_label) IS NULL)
  ), origin AS MATERIALIZED (
    SELECT min(public.semester_ordinal(semester_key)) AS o FROM public.roster_entries
  ), firsts AS MATERIALIZED (
    SELECT node, min(public.semester_ordinal(semester_key)) AS o FROM ros GROUP BY node
  ), grp AS (
    SELECT 'officers' AS kind, 'officers:' || semester_key AS key, semester_key AS semester,
           array_agg(DISTINCT node ORDER BY node) AS members, NULL::text AS hub
      FROM bm WHERE rank < 30 GROUP BY semester_key
    UNION ALL
    SELECT 'lead', 'lead:' || o.semester_key || ':' || o.node || ':' || h.node, o.semester_key,
           ARRAY[least(o.node, h.node), greatest(o.node, h.node)], NULL
      FROM bm o JOIN bm h ON h.semester_key = o.semester_key AND h.rank >= 30
     WHERE o.rank < 30
    UNION ALL
    SELECT 'board', 'board:' || semester_key, semester_key, array_agg(DISTINCT node ORDER BY node), NULL
      FROM bm WHERE rank >= 30 GROUP BY semester_key
    UNION ALL
    -- Media & Operations without a head: its members with the President and the Vice-President.
    SELECT 'direct', 'direct:' || o.semester_key || ':' || o.node, o.semester_key,
           array_agg(DISTINCT r.node ORDER BY r.node), o.node
      FROM bm o
      JOIN mo_headless h ON h.semester_key = o.semester_key
      JOIN ros r ON r.semester_key = o.semester_key AND r.division_key = 'media_operations' AND r.node <> o.node
     WHERE o.rank < 30
     GROUP BY o.semester_key, o.node
    UNION ALL
    -- The President (office ranks 10 and 11) and the Vice-President (20 and 21) with every member of their semester.
    SELECT CASE WHEN o.rank < 20 THEN 'president' ELSE 'vice' END,
           CASE WHEN o.rank < 20 THEN 'president:' ELSE 'vice:' END || o.semester_key || ':' || o.node, o.semester_key,
           array_agg(DISTINCT m.node ORDER BY m.node), o.node
      FROM bm o
      JOIN members_of m ON m.semester_key = o.semester_key AND m.node <> o.node
     WHERE o.rank < 30
     GROUP BY o.semester_key, o.node, o.rank
    UNION ALL
    SELECT 'division', 'division:' || division_key || ':' || semester_key, semester_key, array_agg(DISTINCT node ORDER BY node), NULL
      FROM ros WHERE division_key NOT IN ('board', 'none') GROUP BY division_key, semester_key
    UNION ALL
    -- The interviewer: a head of the division a new joiner got into, that semester.
    SELECT 'interview', 'interview:' || j.semester_key || ':' || h.node || ':' || j.node, j.semester_key,
           ARRAY[least(h.node, j.node), greatest(h.node, j.node)], NULL
      FROM ros j
      JOIN firsts f ON f.node = j.node AND f.o = public.semester_ordinal(j.semester_key)
      JOIN ros h ON h.semester_key = j.semester_key AND h.division_key = j.division_key AND h.node <> j.node
                AND public.roster_office_rank(h.role_label) IS NOT NULL
     WHERE j.division_key NOT IN ('board', 'none')
       AND public.roster_office_rank(j.role_label) IS NULL
       AND f.o > (SELECT o FROM origin)
     GROUP BY j.semester_key, h.node, j.node
    UNION ALL
    SELECT 'report', 'report:' || id::text, semester_key, array_agg(DISTINCT node ORDER BY node), NULL
      FROM rep GROUP BY id, semester_key
  ), seen AS (
    SELECT node, semester_key FROM ros
    UNION SELECT node, semester_key FROM rep
  ), ppl AS (
    SELECT s.node,
           (array_agg(s.semester_key ORDER BY public.semester_ordinal(s.semester_key)))[1] AS first_key,
           (array_agg(s.semester_key ORDER BY public.semester_ordinal(s.semester_key) DESC))[1] AS last_key
      FROM seen s GROUP BY s.node
  ), home AS (
    -- The division of belonging: most semesters, then the latest. A Board
    -- office (and the two umbrella offices of Research and Asset
    -- Management) counts only for someone who held nothing else.
    SELECT DISTINCT ON (c.node) c.node,
           CASE WHEN c.d IN ('research', 'asset_management') THEN 'board' ELSE c.d END AS d
      FROM (SELECT node, division_key AS d, count(*) AS n, max(public.semester_ordinal(semester_key)) AS last
              FROM ros WHERE division_key <> 'none' GROUP BY node, division_key) c
     ORDER BY c.node, (c.d IN ('board', 'research', 'asset_management')), c.n DESC, c.last DESC, c.d
  )
  SELECT jsonb_build_object(
    'current', (SELECT k FROM now_key),
    'groups', coalesce((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('kind', g.kind, 'key', g.key, 'semester', g.semester,
                                                                               'members', to_jsonb(g.members), 'hub', g.hub))
                                         ORDER BY g.key) FROM grp g), '[]'::jsonb),
    'people', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.node,
               'name', coalesce(
                 (SELECT btrim(pe.first_name || ' ' || pe.surname) FROM public.people pe
                   WHERE p.node !~ '^m:' AND pe.id::text = p.node),
                 (SELECT btrim(l.first_name || ' ' || l.surname) FROM live l WHERE l.node = p.node LIMIT 1),
                 'Unknown'),
               'first', p.first_key,
               'last', p.last_key,
               'current', EXISTS (SELECT 1 FROM live l WHERE l.node = p.node),
               'division', (SELECT h.d FROM home h WHERE h.node = p.node))
             ORDER BY p.node)
        FROM ppl p), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.network_input() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_input() TO service_role;

-- ---------------------------------------------------------------------
-- Storing a run: as in Step 111, with each person's division and each
-- tie's officer semesters.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.network_store(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text := p ->> 'kind';
  v_id uuid;
BEGIN
  IF v_kind NOT IN ('weekly', 'update', 'semester') THEN
    RAISE EXCEPTION 'Unknown kind of run: %', v_kind;
  END IF;
  IF v_kind = 'semester' THEN
    DELETE FROM public.network_runs WHERE kind = 'semester' AND semester_key = p ->> 'semester';
  ELSIF v_kind = 'weekly' THEN
    DELETE FROM public.network_runs WHERE kind = 'weekly' AND week = p ->> 'week';
  ELSE
    DELETE FROM public.network_runs WHERE kind = 'update';
  END IF;

  INSERT INTO public.network_runs (kind, semester_key, week, fingerprint, summary, requested_by)
  VALUES (v_kind, p ->> 'semester', NULLIF(p ->> 'week', ''), p ->> 'fingerprint', coalesce(p -> 'summary', '{}'::jsonb),
          NULLIF(p ->> 'requested_by', '')::uuid)
  RETURNING id INTO v_id;

  INSERT INTO public.network_scores (run_id, node, name, first_semester, last_semester, is_current, degree, strength,
    status, mediation, coalition, cohesion, ego, reach, community, overall,
    rank_status, rank_mediation, rank_coalition, rank_overall, x, y, groups, division)
  SELECT v_id, s.node, s.name, s.first_semester, s.last_semester, coalesce(s.is_current, false), s.degree, s.strength,
         s.status, s.mediation, s.coalition, s.cohesion, s.ego, s.reach, s.community, s.overall,
         s.rank_status, s.rank_mediation, s.rank_coalition, s.rank_overall, s.x, s.y, coalesce(s.groups, '{}'::jsonb), s.division
    FROM jsonb_to_recordset(coalesce(p -> 'scores', '[]'::jsonb)) AS s(
      node text, name text, first_semester text, last_semester text, is_current boolean, degree integer, strength double precision,
      status double precision, mediation double precision, coalition double precision, cohesion double precision,
      ego double precision, reach double precision, community integer, overall double precision,
      rank_status integer, rank_mediation integer, rank_coalition integer, rank_overall integer, x real, y real, groups jsonb,
      division text);

  IF v_kind <> 'semester' THEN
    INSERT INTO public.network_ties (run_id, a, b, weight, report, board, division, interview, officer)
    SELECT v_id, t.a, t.b, t.weight, t.report, t.board, t.division, t.interview, coalesce(t.officer, 0)
      FROM jsonb_to_recordset(coalesce(p -> 'ties', '[]'::jsonb)) AS t(
        a text, b text, weight double precision, report integer, board integer, division integer, interview integer,
        officer integer);
    DELETE FROM public.network_ties WHERE run_id <> v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.network_store(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_store(jsonb) TO service_role;

-- ---------------------------------------------------------------------
-- Everything the page shows, in one read: the latest current run with
-- its ties, every semester run (positions only, for the movement over
-- time), and who is left out. No weekly points since Step 112.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.network_read()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS MATERIALIZED (
    SELECT r.* FROM public.network_runs r WHERE r.kind IN ('weekly', 'update')
     ORDER BY r.computed_at DESC LIMIT 1
  ), sc AS MATERIALIZED (
    -- The people of the latest run in order; a tie names its two people
    -- by their place in this list, which keeps the read small.
    SELECT s.*, (row_number() OVER (ORDER BY s.rank_overall, s.name, s.node) - 1)::int AS ix
      FROM public.network_scores s WHERE s.run_id = (SELECT id FROM latest)
  ), ranks AS (
    SELECT s.run_id, jsonb_object_agg(s.node, jsonb_build_array(s.rank_overall, s.rank_status, s.rank_mediation, s.rank_coalition)) AS r
      FROM public.network_scores s
     WHERE s.run_id IN (SELECT id FROM public.network_runs WHERE kind = 'semester')
     GROUP BY s.run_id
  )
  SELECT jsonb_build_object(
    'current', public.current_semester_key(),
    'latest', (SELECT jsonb_build_object(
        'id', l.id, 'kind', l.kind, 'semester', l.semester_key, 'week', l.week, 'computed_at', l.computed_at,
        'fingerprint', l.fingerprint, 'summary', l.summary,
        'scores', coalesce((SELECT jsonb_agg(to_jsonb(s) - 'run_id' - 'ix' ORDER BY s.ix) FROM sc s), '[]'::jsonb),
        'ties', coalesce((SELECT jsonb_agg(jsonb_build_array(a.ix, b.ix, round(t.weight::numeric, 4), t.report, t.board, t.division,
                                                             t.interview, t.officer)
                                           ORDER BY a.ix, b.ix)
                            FROM public.network_ties t JOIN sc a ON a.node = t.a JOIN sc b ON b.node = t.b
                           WHERE t.run_id = l.id), '[]'::jsonb))
      FROM latest l),
    'weeks', '[]'::jsonb,
    'semesters', coalesce((SELECT jsonb_agg(jsonb_build_object('semester', r.semester_key, 'computed_at', r.computed_at,
                                                               'fingerprint', r.fingerprint, 'summary', r.summary,
                                                               'ranks', coalesce(rk.r, '{}'::jsonb))
                                            ORDER BY public.semester_ordinal(r.semester_key))
                             FROM public.network_runs r LEFT JOIN ranks rk ON rk.run_id = r.id WHERE r.kind = 'semester'), '[]'::jsonb),
    'excluded', coalesce((SELECT jsonb_agg(jsonb_build_object('node', x.node, 'name', x.name, 'note', x.note, 'created_at', x.created_at)
                                           ORDER BY x.name) FROM public.network_exclusions x), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.network_read() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_read() TO service_role;

-- ---------------------------------------------------------------------
-- When it runs: at 04:50 UTC on the 1st and the 15th of each month of
-- activity (February to June, September to December), and on the 1st
-- only in January, July and August. Each run analyses the current
-- network if its data changed and every semester still to analyse,
-- continuing in further calls of its own until none is left.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('people_network') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'people_network');
    PERFORM cron.unschedule('people_network_quiet') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'people_network_quiet');
    PERFORM cron.schedule('people_network', '50 4 1,15 2-6,9-12 *', $cron$SELECT public.people_network_tick()$cron$);
    PERFORM cron.schedule('people_network_quiet', '50 4 1 1,7,8 *', $cron$SELECT public.people_network_tick()$cron$);
  END IF;
END $$;
