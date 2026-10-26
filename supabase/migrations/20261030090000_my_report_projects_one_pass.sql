-- =====================================================================
-- My Profile > Membership, Your projects: read in one pass. Safe to run
-- twice.
-- ---------------------------------------------------------------------
-- my_report_projects() (migration 20261027090000) matched the authors of
-- every report through resolve_report_authors(), which reads the whole
-- list of people again for each report. On the live data that takes
-- longer than the database allows a signed-in reader (8 seconds), so the
-- call was cancelled and the card said "Your reports could not be read
-- just now". public_reports() had the same cost and was rewritten the
-- same way before (drizzle/migrations/0006_public_reports_fast_author_links.sql).
--
-- Same answer as before, by the same rule (AGENTS.md: a report author
-- counts for a person only by the editor's pick or a name exactly one
-- person carries):
--   * the people are read once;
--   * only the authors who could be the reader are resolved: picked as
--     one of the reader's entries, or carrying the words of one of the
--     reader's names by the rule resolve_report_authors() uses;
--   * each of those is then resolved exactly as resolve_report_authors()
--     does (the editor's pick first, members before alumni, a name only
--     when exactly one person carries it), and the report counts when
--     the result is one of the reader's own entries, with the role of
--     the first such author on the cover.
--
-- Nothing else changes: the same name, no arguments, the same JSON, the
-- same rights. No table and no data is touched.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_report_projects()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_links text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to read your projects.' USING ERRCODE = '42501';
  END IF;
  -- The reader's own entries: on the Members page, and in the alumni
  -- directory under their private address (as before).
  SELECT coalesce(array_agg('/people/members?person=' || t.id::text), '{}'::text[]) INTO v_links
    FROM public.team_members t
    JOIN public.members m ON m.id = t.member_id
   WHERE m.user_id = v_uid;
  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NOT NULL AND v_email <> '' THEN
    v_links := v_links || coalesce((
      SELECT array_agg(DISTINCT '/people/alumni?person=' || c.alumni_id::text)
        FROM public.alumni_contacts c
       WHERE lower(btrim(c.email)) = v_email), '{}'::text[]);
  END IF;
  IF cardinality(v_links) = 0 THEN
    RETURN jsonb_build_object('linked', false, 'reports', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object('linked', true, 'reports', coalesce((
    WITH people AS MATERIALIZED (
      -- Everybody a report author can be linked to, read once.
      SELECT kind, id::text AS id, tokens FROM public.public_people_index()
    ), mine AS MATERIALIZED (
      -- The reader among them.
      SELECT p.kind, p.id, p.tokens
        FROM people p
       WHERE CASE p.kind WHEN 'member' THEN '/people/members?person=' ELSE '/people/alumni?person=' END || p.id = ANY (v_links)
    ), f AS MATERIALIZED (
      SELECT * FROM public.archive_files WHERE deleted_at IS NULL
    ), a AS MATERIALIZED (
      -- Every author with a name, as resolve_report_authors() reads them.
      SELECT f.id AS fid, t.ord, t.e,
             NULLIF(btrim(COALESCE(t.e->>'role', '')), '') AS role,
             public.person_tokens(t.e->>'name') AS tok
        FROM f, jsonb_array_elements(CASE WHEN jsonb_typeof(f.authors) = 'array' THEN f.authors ELSE '[]'::jsonb END)
               WITH ORDINALITY AS t(e, ord)
       WHERE jsonb_typeof(t.e) = 'object' AND btrim(COALESCE(t.e->>'name', '')) <> ''
    ), cand AS (
      -- Only an author picked as the reader, or named with one of the
      -- reader's names, can resolve to the reader.
      SELECT a.* FROM a
       WHERE EXISTS (
         SELECT 1 FROM mine m
          WHERE (m.kind = 'member' AND a.e->>'member_id' = m.id)
             OR (m.kind = 'alumni' AND a.e->>'alumni_id' = m.id)
             OR (cardinality(a.tok) >= 1
                 AND (m.tokens = a.tok OR (cardinality(a.tok) >= 2 AND cardinality(m.tokens) >= 2
                                           AND (m.tokens @> a.tok OR a.tok @> m.tokens)))))
    ), linked AS (
      -- Resolved exactly as resolve_report_authors() resolves an author.
      SELECT c.fid, c.ord, c.role, COALESCE(
        (SELECT '/people/members?person=' || p.id FROM people p WHERE p.kind = 'member' AND p.id = c.e->>'member_id' LIMIT 1),
        (SELECT '/people/alumni?person=' || p.id FROM people p WHERE p.kind = 'alumni' AND p.id = c.e->>'alumni_id' LIMIT 1),
        (SELECT CASE WHEN count(*) = 1 THEN '/people/members?person=' || min(p.id) END
           FROM people p
          WHERE p.kind = 'member' AND cardinality(c.tok) >= 1
            AND (p.tokens = c.tok OR (cardinality(c.tok) >= 2 AND cardinality(p.tokens) >= 2
                                      AND (p.tokens @> c.tok OR c.tok @> p.tokens)))),
        (SELECT CASE WHEN count(*) = 1 THEN '/people/alumni?person=' || min(p.id) END
           FROM people p
          WHERE p.kind = 'alumni' AND cardinality(c.tok) >= 1
            AND (p.tokens = c.tok OR (cardinality(c.tok) >= 2 AND cardinality(p.tokens) >= 2
                                      AND (p.tokens @> c.tok OR c.tok @> p.tokens))))
      ) AS link
        FROM cand c
    ), hit AS (
      -- The first author on the cover who is the reader gives the role.
      SELECT DISTINCT ON (l.fid) l.fid, l.role
        FROM linked l
       WHERE l.link = ANY (v_links)
       ORDER BY l.fid, l.ord
    )
    SELECT jsonb_agg(jsonb_build_object(
             'id', f.id, 'title', f.title,
             'slug', CASE WHEN f.status = 'published' THEN f.slug END,
             'date', f.date, 'division', f.division,
             'report_type', coalesce(f.report_type, public.archive_default_type(f.division::text)),
             'status', f.status, 'role', hit.role)
           ORDER BY f.date DESC NULLS LAST, f.created_at DESC)
      FROM f JOIN hit ON hit.fid = f.id), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.my_report_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_report_projects() TO authenticated, service_role;
