CREATE OR REPLACE FUNCTION public.people_match_proposals()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  WITH info AS MATERIALIZED (
    SELECT p.id, p.first_name, p.surname, p.name_key,
           public.person_tokens(p.first_name || ' ' || p.surname) AS tok,
           coalesce((SELECT array_agg(DISTINCT x.record_type ORDER BY x.record_type) FROM public.person_records x WHERE x.person_id = p.id), '{}'::text[]) AS types
      FROM public.people p
  ), pair AS (
    SELECT a.id AS a_id, b.id AS b_id
      FROM info a JOIN info b ON a.id < b.id
     WHERE cardinality(a.tok) >= 2 AND cardinality(b.tok) >= 2
       AND a.name_key <> b.name_key
       AND NOT (a.types && b.types)
       AND ((a.tok @> b.tok AND b.tok @> a.tok)
         OR (a.tok @> b.tok AND cardinality(a.tok) = cardinality(b.tok) + 1)
         OR (b.tok @> a.tok AND cardinality(b.tok) = cardinality(a.tok) + 1))
       AND NOT EXISTS (SELECT 1 FROM public.people_match_decisions d WHERE d.person_a = a.id AND d.person_b = b.id)
  ), side AS (
    SELECT i.id, jsonb_build_object(
             'id', i.id, 'name', i.first_name || ' ' || i.surname, 'records', to_jsonb(i.types),
             'semesters', (SELECT count(DISTINCT e.semester_key) FROM public.roster_entries e WHERE e.person_id = i.id),
             'first', (SELECT public.semester_label(e.semester_key) FROM public.roster_entries e WHERE e.person_id = i.id ORDER BY public.semester_ordinal(e.semester_key) LIMIT 1),
             'last', (SELECT public.semester_label(e.semester_key) FROM public.roster_entries e WHERE e.person_id = i.id ORDER BY public.semester_ordinal(e.semester_key) DESC LIMIT 1),
             'last_role', (SELECT e.role_label FROM public.roster_entries e WHERE e.person_id = i.id ORDER BY public.semester_ordinal(e.semester_key) DESC, public.roster_office_rank(e.role_label) NULLS LAST LIMIT 1)
           ) AS j
      FROM info i WHERE i.id IN (SELECT a_id FROM pair UNION SELECT b_id FROM pair)
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('a', sa.j, 'b', sb.j) ORDER BY sa.j->>'name'), '[]'::jsonb)
    FROM pair p JOIN side sa ON sa.id = p.a_id JOIN side sb ON sb.id = p.b_id;
$fn$;

REVOKE ALL ON FUNCTION public.people_match_proposals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.people_match_proposals() TO service_role;
