-- =====================================================================
-- STEP 111: PEOPLE > NETWORK.
-- ---------------------------------------------------------------------
-- The network of the Society: every person who is or was a member, tied
-- to the people they wrote a report with, served on a Board of Directors
-- with in the same semester (the President and the Vice-President most
-- closely), worked with in the same division in the same semester, or
-- interviewed as a new joiner of their division (or were interviewed by),
-- each kind of tie with its own weight. The edge function `people-network`
-- builds it from `network_input()`, measures each person's position with
-- the method of Soda, Iorio and Rizzo (Social Networks, 2025) in
-- `_shared/network-engine.ts`, and stores the results here.
--
--   network_runs        one analysis: the current network (kind 'weekly'
--                       once a week, 'update' when the data changed in
--                       between or someone asked for it) or the network
--                       as it stood at the end of a past semester (kind
--                       'semester', one per semester, redone only when
--                       that semester's data changes)
--   network_scores      each person's measures and ranks in a run
--   network_ties        the ties of the latest current run (for the map
--                       and each person's strongest ties)
--   network_exclusions  people left out of the analysis because they
--                       objected (Privacy Policy, section 8): they are
--                       removed before the network is built, and their
--                       stored results are deleted at once
--
-- Nobody reads these tables from the browser: row level security is on,
-- nothing is granted to anon or authenticated, and the page reads them
-- only through `people-network`, which checks the role matrix (People >
-- Network: the Board, alumni and advisors).
--
-- The analysis runs from a daily job (04:50 UTC) with its own token
-- (`scheduled_job_tokens`, job 'people_network'), as every scheduled job
-- since Step 93B. It sends no email.
--
-- Safe to run twice: tables and indexes are created only if missing,
-- functions replaced, the token kept, the job rescheduled. Nothing that
-- exists is changed or deleted.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.network_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('weekly', 'update', 'semester')),
  -- For 'semester': the semester analysed; otherwise the current semester.
  semester_key  text NOT NULL,
  -- ISO week of a current run ("2026-W48").
  week          text,
  fingerprint   text NOT NULL,
  summary       jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  computed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS network_runs_one_semester ON public.network_runs (semester_key) WHERE kind = 'semester';
CREATE UNIQUE INDEX IF NOT EXISTS network_runs_one_week ON public.network_runs (week) WHERE kind = 'weekly';
CREATE INDEX IF NOT EXISTS network_runs_recent ON public.network_runs (kind, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.network_scores (
  run_id          uuid NOT NULL REFERENCES public.network_runs(id) ON DELETE CASCADE,
  node            text NOT NULL,
  name            text NOT NULL,
  first_semester  text,
  last_semester   text,
  is_current      boolean NOT NULL DEFAULT false,
  degree          integer NOT NULL DEFAULT 0,
  strength        double precision NOT NULL DEFAULT 0,
  status          double precision NOT NULL DEFAULT 0,
  mediation       double precision NOT NULL DEFAULT 0,
  coalition       double precision NOT NULL DEFAULT 0,
  cohesion        double precision NOT NULL DEFAULT 0,
  ego             double precision NOT NULL DEFAULT 0,
  reach           double precision NOT NULL DEFAULT 0,
  community       integer NOT NULL DEFAULT 0,
  overall         double precision NOT NULL DEFAULT 0,
  rank_status     integer NOT NULL,
  rank_mediation  integer NOT NULL,
  rank_coalition  integer NOT NULL,
  rank_overall    integer NOT NULL,
  x               real,
  y               real,
  groups          jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, node)
);
CREATE INDEX IF NOT EXISTS network_scores_node ON public.network_scores (node);

CREATE TABLE IF NOT EXISTS public.network_ties (
  run_id    uuid NOT NULL REFERENCES public.network_runs(id) ON DELETE CASCADE,
  a         text NOT NULL,
  b         text NOT NULL,
  weight    double precision NOT NULL,
  report    integer NOT NULL DEFAULT 0,
  board     integer NOT NULL DEFAULT 0,
  division  integer NOT NULL DEFAULT 0,
  interview integer NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, a, b)
);
CREATE INDEX IF NOT EXISTS network_ties_b ON public.network_ties (b);

CREATE TABLE IF NOT EXISTS public.network_exclusions (
  -- A person's id, or 'm:' and a member record's id for a member who has
  -- no person record yet.
  node        text PRIMARY KEY,
  name        text NOT NULL,
  note        text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.network_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_ties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_exclusions  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.network_runs, public.network_scores, public.network_ties, public.network_exclusions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.network_runs, public.network_scores, public.network_ties, public.network_exclusions TO service_role;

-- ---------------------------------------------------------------------
-- What the network is built from: the groups and the people in them.
-- The Board of Directors of a semester (the offices of roster_office_rank)
-- comes in three tiers, so that each pair of its members is in one only
-- and takes that tier's weight (TIE_WEIGHTS in network-engine.ts):
--   officers  the President and the Vice-President (office ranks 10 to
--             21), with each other
--   lead      each of them with each other Board member (a pair)
--   board     the other Board members (the heads) among themselves
-- A person holding two offices in a semester takes the higher one.
--   division  a division in a semester (not the Board's own key, not none)
--   interview a new joiner with each head of the division they joined, in
--             the semester they got in (a pair): their first semester on
--             the rosters, in a division and not in an office. The first
--             semester on record is left out, because who was new in it
--             cannot be told (the rosters begin after the Society did).
--   report    a published report, with its authors as matched to people
--             by report_authorships() (the editor's pick, or a name that
--             exactly one person carries), in the semester of its date
-- Past semesters come from the rosters (People > Time Machine); the
-- current one from the live member register (roster_live), where a member
-- without a person record yet is the node 'm:<member id>'. People left
-- out (network_exclusions) are removed before anything else.
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
  ), out_nodes AS MATERIALIZED (
    SELECT x.node FROM public.network_exclusions x
    UNION
    SELECT pr.person_id::text
      FROM public.network_exclusions x
      JOIN public.person_records pr ON pr.record_type = 'member' AND 'm:' || pr.record_id::text = x.node
  ), live AS MATERIALIZED (
    SELECT coalesce(l.person_id::text, 'm:' || l.member_id::text) AS node, l.member_id, l.first_name, l.surname,
           l.role_label, l.division_key
      FROM public.roster_live() l
  ), ros AS MATERIALIZED (
    SELECT r.* FROM (
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
  ), origin AS MATERIALIZED (
    SELECT min(public.semester_ordinal(semester_key)) AS o FROM public.roster_entries
  ), firsts AS MATERIALIZED (
    SELECT node, min(public.semester_ordinal(semester_key)) AS o FROM ros GROUP BY node
  ), grp AS (
    SELECT 'officers' AS kind, 'officers:' || semester_key AS key, semester_key AS semester,
           array_agg(DISTINCT node ORDER BY node) AS members
      FROM bm WHERE rank < 30 GROUP BY semester_key
    UNION ALL
    SELECT 'lead', 'lead:' || o.semester_key || ':' || o.node || ':' || h.node, o.semester_key,
           ARRAY[least(o.node, h.node), greatest(o.node, h.node)]
      FROM bm o JOIN bm h ON h.semester_key = o.semester_key AND h.rank >= 30
     WHERE o.rank < 30
    UNION ALL
    SELECT 'board', 'board:' || semester_key, semester_key, array_agg(DISTINCT node ORDER BY node)
      FROM bm WHERE rank >= 30 GROUP BY semester_key
    UNION ALL
    SELECT 'division', 'division:' || division_key || ':' || semester_key, semester_key, array_agg(DISTINCT node ORDER BY node)
      FROM ros WHERE division_key NOT IN ('board', 'none') GROUP BY division_key, semester_key
    UNION ALL
    -- The interviewer: a head of the division a new joiner got into, that semester.
    SELECT 'interview', 'interview:' || j.semester_key || ':' || h.node || ':' || j.node, j.semester_key,
           ARRAY[least(h.node, j.node), greatest(h.node, j.node)]
      FROM ros j
      JOIN firsts f ON f.node = j.node AND f.o = public.semester_ordinal(j.semester_key)
      JOIN ros h ON h.semester_key = j.semester_key AND h.division_key = j.division_key AND h.node <> j.node
                AND public.roster_office_rank(h.role_label) IS NOT NULL
     WHERE j.division_key NOT IN ('board', 'none')
       AND public.roster_office_rank(j.role_label) IS NULL
       AND f.o > (SELECT o FROM origin)
     GROUP BY j.semester_key, h.node, j.node
    UNION ALL
    SELECT 'report', 'report:' || id::text, semester_key, array_agg(DISTINCT node ORDER BY node)
      FROM rep GROUP BY id, semester_key
  ), seen AS (
    SELECT node, semester_key FROM ros
    UNION SELECT node, semester_key FROM rep
  ), ppl AS (
    SELECT s.node,
           (array_agg(s.semester_key ORDER BY public.semester_ordinal(s.semester_key)))[1] AS first_key,
           (array_agg(s.semester_key ORDER BY public.semester_ordinal(s.semester_key) DESC))[1] AS last_key
      FROM seen s GROUP BY s.node
  )
  SELECT jsonb_build_object(
    'current', (SELECT k FROM now_key),
    'groups', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', g.kind, 'key', g.key, 'semester', g.semester, 'members', to_jsonb(g.members))
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
               'current', EXISTS (SELECT 1 FROM live l WHERE l.node = p.node))
             ORDER BY p.node)
        FROM ppl p), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.network_input() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_input() TO service_role;

-- ---------------------------------------------------------------------
-- Store one run, whole, in one transaction (p: kind, semester, week,
-- fingerprint, summary, requested_by, scores [...], ties [...]).
--   'semester'  replaces that semester's previous run
--   'weekly'    replaces the same week's run, if any
--   'update'    replaces earlier 'update' runs
-- Only the newest current run keeps its ties.
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
    rank_status, rank_mediation, rank_coalition, rank_overall, x, y, groups)
  SELECT v_id, s.node, s.name, s.first_semester, s.last_semester, coalesce(s.is_current, false), s.degree, s.strength,
         s.status, s.mediation, s.coalition, s.cohesion, s.ego, s.reach, s.community, s.overall,
         s.rank_status, s.rank_mediation, s.rank_coalition, s.rank_overall, s.x, s.y, coalesce(s.groups, '{}'::jsonb)
    FROM jsonb_to_recordset(coalesce(p -> 'scores', '[]'::jsonb)) AS s(
      node text, name text, first_semester text, last_semester text, is_current boolean, degree integer, strength double precision,
      status double precision, mediation double precision, coalition double precision, cohesion double precision,
      ego double precision, reach double precision, community integer, overall double precision,
      rank_status integer, rank_mediation integer, rank_coalition integer, rank_overall integer, x real, y real, groups jsonb);

  IF v_kind <> 'semester' THEN
    INSERT INTO public.network_ties (run_id, a, b, weight, report, board, division, interview)
    SELECT v_id, t.a, t.b, t.weight, t.report, t.board, t.division, t.interview
      FROM jsonb_to_recordset(coalesce(p -> 'ties', '[]'::jsonb)) AS t(
        a text, b text, weight double precision, report integer, board integer, division integer, interview integer);
    DELETE FROM public.network_ties WHERE run_id <> v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.network_store(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_store(jsonb) TO service_role;

-- ---------------------------------------------------------------------
-- Everything the page shows, in one read: the latest current run with
-- its ties, the last twelve weekly runs and every semester run (ranks
-- only, for the movement over time), and who is left out.
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
    -- The people of the latest run in rank order; a tie names its two
    -- people by their place in this list, which keeps the read small.
    SELECT s.*, (row_number() OVER (ORDER BY s.rank_overall, s.name, s.node) - 1)::int AS ix
      FROM public.network_scores s WHERE s.run_id = (SELECT id FROM latest)
  ), weeks AS MATERIALIZED (
    SELECT r.* FROM public.network_runs r WHERE r.kind = 'weekly' ORDER BY r.computed_at DESC LIMIT 12
  ), ranks AS (
    SELECT s.run_id, jsonb_object_agg(s.node, jsonb_build_array(s.rank_overall, s.rank_status, s.rank_mediation, s.rank_coalition)) AS r
      FROM public.network_scores s
     WHERE s.run_id IN (SELECT id FROM weeks UNION SELECT id FROM public.network_runs WHERE kind = 'semester')
     GROUP BY s.run_id
  )
  SELECT jsonb_build_object(
    'current', public.current_semester_key(),
    'latest', (SELECT jsonb_build_object(
        'id', l.id, 'kind', l.kind, 'semester', l.semester_key, 'week', l.week, 'computed_at', l.computed_at,
        'fingerprint', l.fingerprint, 'summary', l.summary,
        'scores', coalesce((SELECT jsonb_agg(to_jsonb(s) - 'run_id' - 'ix' ORDER BY s.ix) FROM sc s), '[]'::jsonb),
        'ties', coalesce((SELECT jsonb_agg(jsonb_build_array(a.ix, b.ix, round(t.weight::numeric, 4), t.report, t.board, t.division, t.interview)
                                           ORDER BY a.ix, b.ix)
                            FROM public.network_ties t JOIN sc a ON a.node = t.a JOIN sc b ON b.node = t.b
                           WHERE t.run_id = l.id), '[]'::jsonb))
      FROM latest l),
    'weeks', coalesce((SELECT jsonb_agg(jsonb_build_object('week', w.week, 'computed_at', w.computed_at,
                                                          'ranks', coalesce(rk.r, '{}'::jsonb)) ORDER BY w.computed_at)
                         FROM weeks w LEFT JOIN ranks rk ON rk.run_id = w.id), '[]'::jsonb),
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
-- Leave a person out (or bring them back): the exclusion, and at once the
-- removal of every stored result about them. The function then runs the
-- analysis again without them.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.network_set_excluded(p_node text, p_name text, p_note text, p_by uuid, p_out boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_node IS NULL OR btrim(p_node) = '' THEN RAISE EXCEPTION 'No person given.'; END IF;
  IF p_out THEN
    INSERT INTO public.network_exclusions (node, name, note, created_by)
    VALUES (p_node, coalesce(NULLIF(btrim(p_name), ''), 'Unknown'), NULLIF(btrim(coalesce(p_note, '')), ''), p_by)
    ON CONFLICT (node) DO UPDATE SET note = EXCLUDED.note;
    DELETE FROM public.network_scores WHERE node = p_node;
    DELETE FROM public.network_ties WHERE a = p_node OR b = p_node;
  ELSE
    DELETE FROM public.network_exclusions WHERE node = p_node;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.network_set_excluded(text, text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_set_excluded(text, text, text, uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------
-- The daily job: the database calls `people-network` with the public key
-- and its own token, as every scheduled job does (job-token.ts).
-- ---------------------------------------------------------------------
INSERT INTO public.scheduled_job_tokens (job, token)
VALUES ('people_network', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (job) DO NOTHING;

CREATE OR REPLACE FUNCTION public.people_network_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN RETURN; END IF;
  EXECUTE $q$SELECT net.http_post(url := $1, headers := $2, body := $3)$q$
    USING 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/people-network',
          public.scheduled_job_headers('people_network'),
          jsonb_build_object('action', 'tick');
END;
$$;
REVOKE ALL ON FUNCTION public.people_network_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.people_network_tick() TO service_role;

-- At 04:50 UTC every day: on the first day of a week it records that
-- week's point; on other days it refreshes the current network only if
-- the data changed; every day it completes any semester still to analyse.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('people_network') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'people_network');
    PERFORM cron.schedule('people_network', '50 4 * * *', $cron$SELECT public.people_network_tick()$cron$);
  END IF;
END $$;
