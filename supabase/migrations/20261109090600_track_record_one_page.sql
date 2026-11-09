-- =====================================================================
-- MINERVA'S TRACK RECORD: ONE PAGE (Step 105).
-- ---------------------------------------------------------------------
-- /numbers and /track-record are one page now, "Minerva's Track Record"
-- at /track-record (/numbers sends there). Three changes in the database:
--
-- 1. public_track_record counts the members and the alumni of EVERY past
--    semester, from the roster history that People > Time Machine holds
--    (Fall 2019 onwards), instead of only the semesters whose fee
--    collection had closed. Members: the people on the semester's
--    roster, those on a semester break left out. Alumni: the people who
--    had served in an earlier semester and are not on this one. Counts
--    only; no name or person code leaves the database. The rest of the
--    function is exactly as migration 20261023120000 wrote it; the shape
--    of every field is unchanged.
-- 2. "Events held" no longer ends with "Internal meetings and recruitment
--    stands are not counted." and "Funds run since 2017" no longer says
--    "(paper)", as the President asked. Both are stored texts: the old
--    wording is copied first into key_number_wording_backup, and only
--    those two figures change, in their template (rewritten into the
--    definition every night) and in their definition today.
--
-- Safe to run twice.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.public_track_record()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Rome')::date AS d),
  reports AS (
    SELECT extract(year FROM date::date)::int AS year, division::text AS division, count(*)::int AS n,
           COALESCE(sum(page_count), 0)::int AS pages, count(page_count)::int AS pages_known
      FROM public.archive_files
     WHERE status = 'published' AND deleted_at IS NULL AND date IS NOT NULL
     GROUP BY 1, 2
  ),
  -- "Held", exactly as the registry counts events (refresh_key_numbers).
  held AS (
    SELECT e.id, e.event_type, e.date::date AS date, e.guest
      FROM public.events e, today
     WHERE NOT COALESCE(e.date_tbc, false)
       AND e.date::date <= today.d
       AND e.aod_day_id IS NULL
       AND e.event_type NOT IN ('meeting', 'association_on_display')
  ),
  ev AS (
    SELECT extract(year FROM date)::int AS year, count(*)::int AS events,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(guest) g WHERE btrim(COALESCE(g, '')) <> ''))::int AS with_guests,
           count(*) FILTER (WHERE event_type = 'alumni_call')::int AS alumni_calls,
           count(*) FILTER (WHERE event_type = 'company_visit')::int AS company_visits
      FROM held GROUP BY 1
  ),
  roster AS MATERIALIZED (
    SELECT e.semester_key AS k, public.semester_ordinal(e.semester_key) AS o, e.person_id,
           (e.role_label ~* '^on semester break') AS on_break
      FROM public.roster_entries e
  ),
  roster_semesters AS (
    SELECT DISTINCT r.k, r.o FROM roster r
     WHERE r.o < public.semester_ordinal(public.current_semester_key())
  ),
  first_served AS (
    SELECT person_id, min(o) AS o FROM roster WHERE NOT on_break GROUP BY person_id
  ),
  sp AS (
    SELECT extract(year FROM h.date)::int AS year,
           count(DISTINCT lower(regexp_replace(btrim(split_part(g, ' - ', 1)), '\s+', ' ', 'g')))::int AS speakers
      FROM held h, unnest(h.guest) g
     WHERE btrim(COALESCE(split_part(g, ' - ', 1), '')) <> ''
     GROUP BY 1
  )
  SELECT jsonb_build_object(
    'computed_at', now(),
    'last_updated', GREATEST(
       (SELECT max(updated_at) FROM public.archive_files WHERE status = 'published'),
       (SELECT max(updated_at) FROM public.fund_performance_years),
       (SELECT max(updated_at) FROM public.key_numbers),
       (SELECT max(created_at) FROM public.semester_snapshots),
       (SELECT max(updated_at) FROM public.people)),
    'research', COALESCE((SELECT jsonb_agg(jsonb_build_object('year', year, 'division', division, 'reports', n, 'pages', pages, 'pages_known', pages_known)
                                           ORDER BY year, division) FROM reports), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                          'year', ev.year, 'events', ev.events, 'with_guests', ev.with_guests,
                          'speakers', COALESCE(sp.speakers, 0), 'alumni_calls', ev.alumni_calls,
                          'company_visits', ev.company_visits) ORDER BY ev.year)
                          FROM ev LEFT JOIN sp USING (year)), '[]'::jsonb),
    'company_visits_before_archive', 4,
    -- Step 105: every past semester, from the roster history (People >
    -- Time Machine). Members: the people on the semester's roster, those on
    -- a semester break left out. Alumni: the people who had served in an
    -- earlier semester and are not on this one. Counts only, no names.
    'semesters', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                             'key', s.k, 'label', public.semester_label(s.k),
                             'members', (SELECT count(DISTINCT r.person_id)::int FROM roster r WHERE r.k = s.k AND NOT r.on_break),
                             'alumni', (SELECT count(*)::int FROM first_served f
                                         WHERE f.o < s.o
                                           AND NOT EXISTS (SELECT 1 FROM roster r WHERE r.k = s.k AND r.person_id = f.person_id)))
                             ORDER BY s.o)
                             FROM roster_semesters s), '[]'::jsonb),
    'alumni_areas', COALESCE((SELECT jsonb_agg(jsonb_build_object('area', area, 'alumni', n) ORDER BY n DESC, area)
                                FROM (SELECT btrim(job_area) AS area, count(*)::int AS n
                                        FROM public.alumni
                                       WHERE btrim(COALESCE(job_area, '')) <> ''
                                       GROUP BY 1) a), '[]'::jsonb),
    'alumni_without_area', (SELECT count(*)::int FROM public.alumni WHERE btrim(COALESCE(job_area, '')) = ''),
    'funds', (SELECT jsonb_object_agg(fund, jsonb_build_object(
                'status', CASE WHEN fund IN ('long-short', 'multi-asset') THEN 'active' ELSE 'closed' END,
                'profile', (SELECT jsonb_build_object('inception_date', p.inception_date, 'end_date', p.end_date)
                              FROM public.fund_profiles p WHERE p.fund = f.fund),
                'record', (SELECT jsonb_build_object(
                             'months_count', r->'months_count', 'first_month', r->'first_month',
                             'last_month', r->'last_month', 'itd', r->'itd', 'ann_return', r->'ann_return',
                             'ann_vol', r->'ann_vol', 'sharpe', r->'sharpe',
                             'max_drawdown', r->'max_drawdown'->'value', 'positive_share', r->'positive_share')
                             FROM (SELECT public.fund_track_record(fund) AS r) x)))
                FROM unnest(ARRAY['long-short', 'multi-asset', 'dps', 'pir']) AS f(fund))
  );
$$;

REVOKE ALL ON FUNCTION public.public_track_record() FROM public;
GRANT EXECUTE ON FUNCTION public.public_track_record() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.key_number_wording_backup (
  slug                text NOT NULL,
  definition_template text,
  definition          text,
  saved_at            timestamptz NOT NULL DEFAULT now(),
  reason              text NOT NULL,
  PRIMARY KEY (slug, reason)
);
ALTER TABLE public.key_number_wording_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.key_number_wording_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.key_number_wording_backup TO service_role;

INSERT INTO public.key_number_wording_backup (slug, definition_template, definition, reason)
SELECT slug, definition_template, definition, 'step105'
  FROM public.key_numbers
 WHERE slug IN ('events_held', 'funds_run')
ON CONFLICT (slug, reason) DO NOTHING;

UPDATE public.key_numbers
   SET definition_template = btrim(replace(definition_template, ' Internal meetings and recruitment stands are not counted.', '')),
       definition = btrim(replace(definition, ' Internal meetings and recruitment stands are not counted.', ''))
 WHERE slug = 'events_held'
   AND (definition_template LIKE '%Internal meetings and recruitment stands are not counted.%'
        OR definition LIKE '%Internal meetings and recruitment stands are not counted.%');

UPDATE public.key_numbers
   SET definition_template = replace(definition_template, 'virtual (paper) portfolios', 'virtual portfolios'),
       definition = replace(definition, 'virtual (paper) portfolios', 'virtual portfolios')
 WHERE slug = 'funds_run'
   AND (definition_template LIKE '%virtual (paper) portfolios%' OR definition LIKE '%virtual (paper) portfolios%');
