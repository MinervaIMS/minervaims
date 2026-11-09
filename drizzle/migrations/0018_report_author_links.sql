CREATE OR REPLACE FUNCTION public.url_query_value(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT COALESCE(string_agg(
           CASE WHEN b BETWEEN 48 AND 57 OR b BETWEEN 65 AND 90 OR b BETWEEN 97 AND 122 OR b IN (45, 46, 95, 126)
                THEN chr(b)
                ELSE '%' || upper(lpad(to_hex(b), 2, '0')) END,
           '' ORDER BY i), '')
    FROM (SELECT i, get_byte(convert_to(COALESCE(p, ''), 'UTF8'), i) AS b
            FROM generate_series(0, octet_length(convert_to(COALESCE(p, ''), 'UTF8')) - 1) AS i) x;
$fn$;
GRANT EXECUTE ON FUNCTION public.url_query_value(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_reports(p_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH people AS MATERIALIZED (
    SELECT kind, id::text AS id, tokens FROM public.public_people_index()
  ), f AS MATERIALIZED (
    SELECT * FROM public.archive_files
     WHERE status = 'published' AND deleted_at IS NULL AND slug IS NOT NULL
       AND (p_slug IS NULL OR slug = p_slug)
  ), a AS MATERIALIZED (
    SELECT f.id AS fid, t.ord, t.e, btrim(t.e->>'name') AS name,
           NULLIF(btrim(COALESCE(t.e->>'role', '')), '') AS role,
           public.person_tokens(t.e->>'name') AS tok
      FROM f, jsonb_array_elements(CASE WHEN jsonb_typeof(f.authors) = 'array' THEN f.authors ELSE '[]'::jsonb END)
             WITH ORDINALITY AS t(e, ord)
     WHERE jsonb_typeof(t.e) = 'object' AND btrim(COALESCE(t.e->>'name', '')) <> ''
  ), linked AS (
    SELECT a.fid, a.ord, a.name, a.role, COALESCE(
      (SELECT '/people/members?person=' || p.id FROM people p WHERE p.kind = 'member' AND p.id = a.e->>'member_id' LIMIT 1),
      (SELECT '/people/alumni?person=' || p.id FROM people p WHERE p.kind = 'alumni' AND p.id = a.e->>'alumni_id' LIMIT 1),
      (SELECT CASE WHEN count(*) = 1 THEN '/people/members?person=' || min(p.id) END
         FROM people p
        WHERE p.kind = 'member' AND cardinality(a.tok) >= 1
          AND (p.tokens = a.tok OR (cardinality(a.tok) >= 2 AND cardinality(p.tokens) >= 2
                                    AND (p.tokens @> a.tok OR a.tok @> p.tokens)))),
      (SELECT CASE WHEN count(*) = 1 THEN '/people/alumni?person=' || min(p.id) END
         FROM people p
        WHERE p.kind = 'alumni' AND cardinality(a.tok) >= 1
          AND (p.tokens = a.tok OR (cardinality(a.tok) >= 2 AND cardinality(p.tokens) >= 2
                                    AND (p.tokens @> a.tok OR a.tok @> p.tokens)))),
      '/archive?author=' || public.url_query_value(a.name)
    ) AS link
      FROM a
  ), auth AS (
    SELECT fid, jsonb_agg(jsonb_build_object('name', name, 'role', role, 'link', link) ORDER BY ord) AS j
      FROM linked GROUP BY fid
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description,
           'date', f.date, 'division', f.division, 'fund', f.fund,
           'report_type', COALESCE(f.report_type, public.archive_default_type(f.division::text)),
           'tags', to_jsonb(f.tags), 'page_count', f.page_count, 'file_url', f.file_url,
           'updated_at', f.updated_at,
           'authors', COALESCE(auth.j, '[]'::jsonb))
         ORDER BY f.date DESC NULLS LAST, f.created_at DESC), '[]'::jsonb)
    FROM f LEFT JOIN auth ON auth.fid = f.id;
$$;
REVOKE ALL ON FUNCTION public.public_reports(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_reports(text) TO anon, authenticated;

INSERT INTO public.alumni (name, surname, graduation_year, company, city, job_area)
SELECT 'Pablo', 'Panizza', 2027, 'Santander CIB', 'London', 'Investment Banking'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.alumni a
    WHERE public.person_tokens(coalesce(a.name, '') || ' ' || coalesce(a.surname, '')) = public.person_tokens('Pablo Panizza')
 );