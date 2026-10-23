-- =====================================================================
-- STEP 92. The key numbers: one source for every figure on the website.
-- ---------------------------------------------------------------------
-- Every number the public site shows about Minerva (the homepage hero,
-- /join, the About timeline, the stats section at the foot of each page,
-- the /numbers page, and from the next delivery llms.txt and the static
-- pages) is read from here, so the same figure has the same value and
-- the same format everywhere.
--
-- Nothing in this file is typed by a person. Labels, definitions and the
-- page each figure appears on are written by this migration; the values
-- are computed by `refresh_key_numbers()` from the data the workspace
-- already holds, every night and once at the end of this file. A figure
-- that cannot be computed sensibly (no data, or a value outside its
-- plausible range) is withheld automatically rather than published.
--
--   key_numbers          one row per figure: label, value, format,
--                        definition, as-of date, published or withheld
--   key_number_pages     which figures each page shows, in order
--   key_number_history   every change of value, with its as-of date
--   key_number_page_scan the page counter's record of each report PDF
--
-- Public reading goes through `public_key_numbers()` only: published
-- figures, aggregates, no personal data. Nobody outside the database can
-- write to these tables.
--
-- Requires Step 91 (`events.date_tbc`). Safe to run twice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A new event type: Company visit.
-- ---------------------------------------------------------------------
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('meeting','aperitivo','division_event','online_call','guest','alumni_call',
                        'association_wide','association_on_display','company_visit','other'));

-- ---------------------------------------------------------------------
-- 2. The tables.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.key_numbers (
  slug                text PRIMARY KEY,
  label               text NOT NULL,
  value               numeric,
  format              text NOT NULL CHECK (format IN ('integer','percent','years','ratio','eur','year')),
  decimals            smallint NOT NULL DEFAULT 0 CHECK (decimals BETWEEN 0 AND 4),
  prefix              text NOT NULL DEFAULT '',
  suffix              text NOT NULL DEFAULT '',
  kind                text NOT NULL CHECK (kind IN ('count','volume','percentage','time','ratio','money')),
  definition_template text NOT NULL,
  definition          text,
  period              text,
  as_of               date,
  source              text NOT NULL,
  virtual_portfolio   boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_by          text NOT NULL DEFAULT 'automatic',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.key_number_pages (
  page_key  text NOT NULL,
  slug      text NOT NULL REFERENCES public.key_numbers(slug) ON DELETE CASCADE,
  position  smallint NOT NULL CHECK (position BETWEEN 1 AND 12),
  PRIMARY KEY (page_key, slug),
  UNIQUE (page_key, position)
);

CREATE TABLE IF NOT EXISTS public.key_number_history (
  id           bigserial PRIMARY KEY,
  slug         text NOT NULL REFERENCES public.key_numbers(slug) ON DELETE CASCADE,
  value        numeric,
  as_of        date,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS key_number_history_slug_idx ON public.key_number_history (slug, recorded_at DESC);

-- The page counter's notebook: which report PDFs it has read, so a file it
-- cannot read is not retried every few minutes.
CREATE TABLE IF NOT EXISTS public.key_number_page_scan (
  file_id     uuid PRIMARY KEY,
  tried_at    timestamptz NOT NULL DEFAULT now(),
  ok          boolean NOT NULL,
  pages       integer,
  error       text
);

ALTER TABLE public.key_numbers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_number_pages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_number_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_number_page_scan ENABLE ROW LEVEL SECURITY;
-- No policies: nobody reads or writes these tables through the API. The
-- public reads published figures through public_key_numbers() below.
REVOKE ALL ON public.key_numbers, public.key_number_pages, public.key_number_history, public.key_number_page_scan
  FROM anon, authenticated;
GRANT ALL ON public.key_numbers, public.key_number_pages, public.key_number_history, public.key_number_page_scan
  TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.key_number_history_id_seq TO service_role;

-- ---------------------------------------------------------------------
-- 3. The figures: what each one is called and how it is defined.
--    {placeholders} in a definition are filled in at every refresh.
-- ---------------------------------------------------------------------
INSERT INTO public.key_numbers (slug, label, format, decimals, kind, definition_template, virtual_portfolio, source) VALUES
  -- Research
  ('reports_published',  'Research reports published',      'integer', 0, 'count',      'Research reports in Minerva''s public archive, across all divisions, since the first one in {first_year}.', false, 'auto: refresh_key_numbers, reports'),
  ('pages_published',    'Pages of research published',     'integer', 0, 'volume',     'Total pages of the research reports in the public archive{coverage}.', false, 'auto: refresh_key_numbers, page counts read from the report PDFs'),
  ('years_publishing',   'Years of continuous publishing',  'integer', 0, 'time',       'Consecutive calendar years, up to {last_year}, in which at least one research report was published.', false, 'auto: refresh_key_numbers, reports'),
  ('research_divisions', 'Research divisions publishing',   'integer', 0, 'count',      'Divisions with at least one research report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('funds_run',          'Funds run since 2017',            'integer', 0, 'count',      'Student-managed virtual (paper) portfolios run since 2017, active and closed: {active} active and {closed} closed.', true, 'auto: refresh_key_numbers, funds'),
  -- People
  ('active_members',     'Active members',                  'integer', 0, 'count',      'People on the current roster shown on the Members page.', false, 'auto: refresh_key_numbers, roster'),
  ('leadership_roles',   'Members in leadership roles',     'integer', 0, 'count',      'Current members who sit on the Board or lead a division, a portfolio or a team.', false, 'auto: refresh_key_numbers, roster'),
  ('degree_programmes',  'Degree programmes represented',   'integer', 0, 'count',      'Distinct degree programmes of current members who joined through the online application.', false, 'auto: refresh_key_numbers, applications of current members'),
  ('alumni',             'Alumni',                          'integer', 0, 'count',      'Former members listed in the alumni directory.', false, 'auto: refresh_key_numbers, alumni directory'),
  ('alumni_firms',       'Firms where alumni work',         'integer', 0, 'count',      'Distinct current employers of the alumni in the directory.', false, 'auto: refresh_key_numbers, alumni directory'),
  ('alumni_countries',   'Countries where alumni work',     'integer', 0, 'count',      'Distinct countries where the alumni in the directory work, from their city.', false, 'auto: refresh_key_numbers, alumni directory'),
  ('acceptance_rate',    'Acceptance rate',                 'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in the most selective division.', false, 'auto: refresh_key_numbers, applications'),
  ('join_rate_equity',     'Equity Research',       'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in Equity Research.', false, 'auto: refresh_key_numbers, applications'),
  ('join_rate_investment', 'Investment Research',   'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in Investment Research.', false, 'auto: refresh_key_numbers, applications'),
  ('join_rate_macro',      'Macro Research',        'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in Macro Research.', false, 'auto: refresh_key_numbers, applications'),
  ('join_rate_portfolio',  'Portfolio Management',  'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in Portfolio Management.', false, 'auto: refresh_key_numbers, applications'),
  ('join_rate_quant',      'Quantitative Research', 'percent', 1, 'percentage', 'Share of applications in the {round} recruiting round that ended in a place in Quantitative Research.', false, 'auto: refresh_key_numbers, applications'),
  -- Events
  ('events_held',        'Events held',                     'integer', 0, 'count',      'Events the society has held, from the first in its events archive to today: talks, alumni calls, company visits, division and association events. Internal meetings and recruitment stands are not counted.', false, 'auto: refresh_key_numbers, events'),
  ('events_this_year',   'Events this academic year',       'integer', 0, 'count',      'Events held since 1 September {year}, the start of the current academic year.', false, 'auto: refresh_key_numbers, events'),
  ('registrations_12m',  'Event registrations, last 12 months', 'integer', 0, 'count',  'Registrations to the society''s events in the last 365 days.', false, 'auto: refresh_key_numbers, registrations'),
  ('speakers',           'Industry speakers hosted',        'integer', 0, 'count',      'Distinct guest speakers named on the events held, alumni included.', false, 'auto: refresh_key_numbers, events'),
  ('guest_sessions',     'Professional guest sessions',     'integer', 0, 'count',      'Events held with at least one guest speaker.', false, 'auto: refresh_key_numbers, events'),
  ('alumni_calls',       'Alumni calls held',               'integer', 0, 'count',      'Alumni calls held: conversations between former and current members.', false, 'auto: refresh_key_numbers, events'),
  ('company_visits',     'Company visits',                  'integer', 0, 'count',      'Visits to companies, counting the 4 held before the events archive began.', false, 'auto: refresh_key_numbers, events, plus 4 earlier visits'),
  -- Readings
  ('readings',             'Readings recommended',          'integer', 0, 'count',      'Books and papers on the recommended readings list.', false, 'auto: refresh_key_numbers, readings'),
  ('reading_contributors', 'Reading contributors',          'integer', 0, 'count',      'Members and alumni who recommended at least one reading.', false, 'auto: refresh_key_numbers, readings'),
  ('reading_years',        'Years spanned by the readings', 'integer', 0, 'time',       'Years between the oldest reading ({from}) and the newest ({to}).', false, 'auto: refresh_key_numbers, readings'),
  -- Divisions
  ('div_equity_since',     'Publishing since', 'year',    0, 'time',  'Year of Equity Research''s first report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('div_investment_since', 'Publishing since', 'year',    0, 'time',  'Year of Investment Research''s first report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('div_macro_since',      'Publishing since', 'year',    0, 'time',  'Year of Macro Research''s first report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('div_portfolio_since',  'Publishing since', 'year',    0, 'time',  'Year of Portfolio Management''s first report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('div_quant_since',      'Publishing since', 'year',    0, 'time',  'Year of Quantitative Research''s first report in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('div_equity_members',     'Members today', 'integer', 0, 'count', 'Members of Equity Research on the current roster.', false, 'auto: refresh_key_numbers, roster'),
  ('div_investment_members', 'Members today', 'integer', 0, 'count', 'Members of Investment Research on the current roster.', false, 'auto: refresh_key_numbers, roster'),
  ('div_macro_members',      'Members today', 'integer', 0, 'count', 'Members of Macro Research on the current roster.', false, 'auto: refresh_key_numbers, roster'),
  ('div_portfolio_members',  'Members today', 'integer', 0, 'count', 'Members of Portfolio Management on the current roster.', false, 'auto: refresh_key_numbers, roster'),
  ('div_quant_members',      'Members today', 'integer', 0, 'count', 'Members of Quantitative Research on the current roster.', false, 'auto: refresh_key_numbers, roster'),
  ('equity_companies',     'Companies covered',          'integer', 0, 'count', 'Estimated from the Equity Research reports in the public archive, counting four companies for every five reports, since some companies are covered more than once.', false, 'auto: refresh_key_numbers, reports'),
  ('investment_outlooks',  'Global Outlooks published',  'integer', 0, 'count', 'Investment Research reports in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('macro_reports',        'Reports published',          'integer', 0, 'count', 'Macro Research reports in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  ('portfolio_months',     'Months of track record',     'integer', 0, 'time',  'Months of recorded monthly returns of the longest-running student portfolio, a virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('quant_papers',         'Research papers',            'integer', 0, 'count', 'Quantitative Research reports in the public archive.', false, 'auto: refresh_key_numbers, reports'),
  -- Active funds (virtual portfolios)
  ('fund_long_short_years',      'Years of track record',  'years',   1, 'time',       'Years of monthly returns recorded, from {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_long_short_ann_return', 'Annualised return',      'percent', 1, 'percentage', 'The return since inception, annualised geometrically over {months} months ({from} to {to}). Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_long_short_ann_vol',    'Annualised volatility',  'percent', 1, 'percentage', 'Standard deviation of the monthly returns, {from} to {to}, multiplied by the square root of 12. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_long_short_itd',        'Return since inception', 'percent', 1, 'percentage', 'Cumulative return from inception ({from}) to {to}, as in the fund''s performance table. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_long_short_sharpe',     'Sharpe ratio',           'ratio',   2, 'ratio',      'Annualised return in excess of the risk-free rate (the US 3-month Treasury bill rate behind the yearly Sharpe ratios on this page), divided by annualised volatility, {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_long_short_mdd',        'Maximum drawdown',       'percent', 1, 'percentage', 'Largest peak-to-trough fall of the cumulative monthly series, {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_years',      'Years of track record',  'years',   1, 'time',       'Years of monthly returns recorded, from {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_ann_return', 'Annualised return',      'percent', 1, 'percentage', 'The return since inception, annualised geometrically over {months} months ({from} to {to}). Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_ann_vol',    'Annualised volatility',  'percent', 1, 'percentage', 'Standard deviation of the monthly returns, {from} to {to}, multiplied by the square root of 12. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_itd',        'Return since inception', 'percent', 1, 'percentage', 'Cumulative return from inception ({from}) to {to}, as in the fund''s performance table. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_sharpe',     'Sharpe ratio',           'ratio',   2, 'ratio',      'Annualised return in excess of the risk-free rate (the US 3-month Treasury bill rate behind the yearly Sharpe ratios on this page), divided by annualised volatility, {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  ('fund_multi_asset_mdd',        'Maximum drawdown',       'percent', 1, 'percentage', 'Largest peak-to-trough fall of the cumulative monthly series, {from} to {to}. Virtual (paper) portfolio.', true, 'auto: refresh_key_numbers, fund performance'),
  -- Closed funds
  ('fund_pir_years', 'Years of track record', 'years', 1, 'time', 'Years between the fund''s first report ({from}) and its last ({to}). Virtual (paper) portfolio, now closed.', true, 'auto: refresh_key_numbers, reports'),
  ('fund_dps_years', 'Years of track record', 'years', 1, 'time', 'Years between the fund''s first report ({from}) and its last ({to}). Virtual (paper) portfolio, now closed.', true, 'auto: refresh_key_numbers, reports')
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label, format = EXCLUDED.format, decimals = EXCLUDED.decimals, kind = EXCLUDED.kind,
  definition_template = EXCLUDED.definition_template, virtual_portfolio = EXCLUDED.virtual_portfolio,
  source = EXCLUDED.source;

-- ---------------------------------------------------------------------
-- 4. Where each figure appears, in order.
-- ---------------------------------------------------------------------
DELETE FROM public.key_number_pages;
INSERT INTO public.key_number_pages (page_key, slug, position) VALUES
  ('home','reports_published',1), ('home','pages_published',2), ('home','years_publishing',3),
  ('home','active_members',4), ('home','alumni',5), ('home','alumni_firms',6),
  ('home','events_held',7), ('home','speakers',8), ('home','company_visits',9),
  ('about','reports_published',1), ('about','pages_published',2), ('about','years_publishing',3),
  ('about','research_divisions',4), ('about','funds_run',5), ('about','acceptance_rate',6),
  ('division-equity','div_equity_since',1), ('division-equity','div_equity_members',2), ('division-equity','equity_companies',3),
  ('division-investment','div_investment_since',1), ('division-investment','div_investment_members',2), ('division-investment','investment_outlooks',3),
  ('division-macro','div_macro_since',1), ('division-macro','div_macro_members',2), ('division-macro','macro_reports',3),
  ('division-portfolio','div_portfolio_since',1), ('division-portfolio','div_portfolio_members',2), ('division-portfolio','portfolio_months',3),
  ('division-quant','div_quant_since',1), ('division-quant','div_quant_members',2), ('division-quant','quant_papers',3),
  ('fund-long-short','fund_long_short_years',1), ('fund-long-short','fund_long_short_ann_return',2), ('fund-long-short','fund_long_short_ann_vol',3),
  ('fund-long-short','fund_long_short_itd',4), ('fund-long-short','fund_long_short_sharpe',5), ('fund-long-short','fund_long_short_mdd',6),
  ('fund-multi-asset','fund_multi_asset_years',1), ('fund-multi-asset','fund_multi_asset_ann_return',2), ('fund-multi-asset','fund_multi_asset_ann_vol',3),
  ('fund-multi-asset','fund_multi_asset_itd',4), ('fund-multi-asset','fund_multi_asset_sharpe',5), ('fund-multi-asset','fund_multi_asset_mdd',6),
  ('fund-pir','fund_pir_years',1),
  ('fund-dps','fund_dps_years',1),
  ('members','active_members',1), ('members','leadership_roles',2), ('members','degree_programmes',3),
  ('alumni','alumni',1), ('alumni','alumni_firms',2), ('alumni','alumni_countries',3),
  ('events','events_held',1), ('events','events_this_year',2), ('events','registrations_12m',3),
  ('events','speakers',4), ('events','alumni_calls',5), ('events','company_visits',6),
  ('archive','reports_published',1), ('archive','pages_published',2), ('archive','research_divisions',3),
  ('readings','readings',1), ('readings','reading_contributors',2), ('readings','reading_years',3),
  ('join','join_rate_equity',1), ('join','join_rate_investment',2), ('join','join_rate_macro',3),
  ('join','join_rate_portfolio',4), ('join','join_rate_quant',5),
  ('partnerships','speakers',1), ('partnerships','guest_sessions',2), ('partnerships','company_visits',3),
  -- The /numbers page, under its three headings.
  ('numbers-people','active_members',1), ('numbers-people','leadership_roles',2), ('numbers-people','degree_programmes',3),
  ('numbers-people','alumni',4), ('numbers-people','alumni_firms',5), ('numbers-people','alumni_countries',6),
  ('numbers-events','events_held',1), ('numbers-events','registrations_12m',2), ('numbers-events','speakers',3),
  ('numbers-events','guest_sessions',4), ('numbers-events','alumni_calls',5), ('numbers-events','company_visits',6),
  ('numbers-reports','reports_published',1), ('numbers-reports','pages_published',2), ('numbers-reports','years_publishing',3),
  ('numbers-reports','research_divisions',4), ('numbers-reports','funds_run',5), ('numbers-reports','readings',6);

-- ---------------------------------------------------------------------
-- 5. Helpers.
-- ---------------------------------------------------------------------
-- "+1.2%", "-0.5 %", "12.3" as a number of percentage points; NULL if empty.
CREATE OR REPLACE FUNCTION public.kn_points(v text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text := regexp_replace(replace(COALESCE(v, ''), ',', '.'), '[^0-9.\-]', '', 'g');
BEGIN
  IF s = '' OR s = '-' OR s = '.' THEN RETURN NULL; END IF;
  RETURN s::numeric;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Write one figure: its value, as-of date, period and definition, and
-- publish it only when it is sound. A change of value is recorded.
CREATE OR REPLACE FUNCTION public.kn_put(p_slug text, p_value numeric, p_as_of date, p_period text, p_vars jsonb, p_ok boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k      public.key_numbers%ROWTYPE;
  v_def  text;
  v_key  text;
  v_val  text;
  v_dec  smallint;
  v_new  numeric;
BEGIN
  SELECT * INTO k FROM public.key_numbers WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;

  v_def := k.definition_template;
  FOR v_key, v_val IN SELECT key, value FROM jsonb_each_text(COALESCE(p_vars, '{}'::jsonb)) LOOP
    v_def := replace(v_def, '{' || v_key || '}', COALESCE(v_val, ''));
  END LOOP;

  v_dec := k.decimals;
  v_new := CASE WHEN p_value IS NULL THEN NULL ELSE round(p_value, v_dec) END;

  IF v_new IS DISTINCT FROM k.value THEN
    INSERT INTO public.key_number_history (slug, value, as_of) VALUES (p_slug, v_new, p_as_of);
  END IF;

  UPDATE public.key_numbers
     SET value = v_new,
         as_of = p_as_of,
         period = p_period,
         definition = v_def,
         status = CASE WHEN COALESCE(p_ok, false) AND v_new IS NOT NULL AND v_def !~ '\{[a-z_]+\}' THEN 'published' ELSE 'draft' END,
         updated_by = 'automatic',
         updated_at = now()
   WHERE slug = p_slug;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. The computation. Aggregates only; no personal data leaves it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_key_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      date := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_ay_start   date;
  n            numeric;
  n2           numeric;
  n3           numeric;
  v_first_year int;
  v_last_year  int;
  v_years      int[];
  v_run        int;
  v_round      text;
  v_round_end  date;
  v_total      numeric;
  v_min_rate   numeric;
  v_rate       numeric;
  d            text;
  d_label      text;
  f            text;
  f_slug       text;
  v_months     int;
  v_from       date;
  v_to         date;
  v_cum        numeric;
  v_peak       numeric;
  v_mdd        numeric;
  v_vol        numeric;
  v_ann        numeric;
  v_itd        numeric;
  v_rf         numeric;
  v_sharpe     numeric;
  v_longest    int := 0;
  r            record;
  v_count      int := 0;
BEGIN
  v_ay_start := make_date(CASE WHEN extract(month FROM v_today) >= 9 THEN extract(year FROM v_today)::int
                               ELSE extract(year FROM v_today)::int - 1 END, 9, 1);

  -- ── Research ────────────────────────────────────────────────────────
  SELECT count(*), COALESCE(sum(page_count), 0), count(page_count), min(extract(year FROM date::date))::int
    INTO n, n2, n3, v_first_year
    FROM public.archive_files WHERE status = 'published' AND deleted_at IS NULL;
  PERFORM public.kn_put('reports_published', n, v_today, NULL,
    jsonb_build_object('first_year', v_first_year), n > 0);
  -- Pages: published once at least nine in ten reports have a page count.
  PERFORM public.kn_put('pages_published', n2, v_today, NULL,
    jsonb_build_object('coverage', CASE WHEN n3 = n THEN ''
      ELSE format(' whose length is recorded (%s of %s)', n3, n) END),
    n > 0 AND n3 >= 0.9 * n AND n2 > 0);

  SELECT array_agg(y ORDER BY y DESC) INTO v_years
    FROM (SELECT DISTINCT extract(year FROM date::date)::int AS y
            FROM public.archive_files
           WHERE status = 'published' AND deleted_at IS NULL AND date IS NOT NULL) s;
  v_run := 0;
  IF v_years IS NOT NULL THEN
    v_last_year := v_years[1];
    FOR i IN 1 .. array_length(v_years, 1) LOOP
      EXIT WHEN v_years[i] <> v_last_year - (i - 1);
      v_run := v_run + 1;
    END LOOP;
  END IF;
  PERFORM public.kn_put('years_publishing', v_run, v_today, NULL,
    jsonb_build_object('last_year', v_last_year), v_run > 0);

  SELECT count(DISTINCT division::text) INTO n FROM public.archive_files
   WHERE status = 'published' AND deleted_at IS NULL
     AND division::text IN ('equity','investment','macro','portfolio','quant');
  PERFORM public.kn_put('research_divisions', n, v_today, NULL, NULL, n > 0);

  FOREACH d IN ARRAY ARRAY['equity','investment','macro','portfolio','quant'] LOOP
    SELECT count(*), min(extract(year FROM date::date))::int INTO n, v_first_year
      FROM public.archive_files
     WHERE status = 'published' AND deleted_at IS NULL AND division::text = d;
    PERFORM public.kn_put('div_' || d || '_since', v_first_year, v_today, NULL, NULL, v_first_year IS NOT NULL);
    IF d = 'equity' THEN
      PERFORM public.kn_put('equity_companies', round(n * 0.8), v_today, NULL, NULL, n > 0);
    ELSIF d = 'investment' THEN
      PERFORM public.kn_put('investment_outlooks', n, v_today, NULL, NULL, n > 0);
    ELSIF d = 'macro' THEN
      PERFORM public.kn_put('macro_reports', n, v_today, NULL, NULL, n > 0);
    ELSIF d = 'quant' THEN
      PERFORM public.kn_put('quant_papers', n, v_today, NULL, NULL, n > 0);
    END IF;

    SELECT count(*) INTO n FROM public.team_members WHERE division::text = d;
    PERFORM public.kn_put('div_' || d || '_members', n, v_today, NULL, NULL, n > 0);
  END LOOP;

  -- ── People ──────────────────────────────────────────────────────────
  SELECT count(*) INTO n FROM public.team_members;
  PERFORM public.kn_put('active_members', n, v_today, NULL, NULL, n > 0);

  SELECT count(*) INTO n FROM public.team_members
   WHERE is_board
      OR position::text LIKE 'Head of %' OR position::text LIKE 'Co-Head of %'
      OR position::text IN ('President','Vice President','Portfolio Manager','Team Leader');
  PERFORM public.kn_put('leadership_roles', n, v_today, NULL, NULL, n > 0);

  SELECT count(DISTINCT lower(regexp_replace(btrim(a.degree_course), '\s+', ' ', 'g'))) INTO n
    FROM public.applications a
   WHERE btrim(COALESCE(a.degree_course, '')) <> ''
     AND EXISTS (SELECT 1 FROM public.members m
                  WHERE m.membership_status IN ('active','on_exchange','one_semester_pause')
                    AND ((m.user_id IS NOT NULL AND m.user_id = a.user_id)
                         OR (m.email IS NOT NULL AND lower(m.email) = lower(a.email))));
  PERFORM public.kn_put('degree_programmes', n, v_today, NULL, NULL, n > 0);

  SELECT count(*) INTO n FROM public.alumni;
  PERFORM public.kn_put('alumni', n, v_today, NULL, NULL, n > 0);

  SELECT count(DISTINCT lower(regexp_replace(btrim(company), '\s+', ' ', 'g'))) INTO n
    FROM public.alumni WHERE btrim(COALESCE(company, '')) <> '';
  PERFORM public.kn_put('alumni_firms', n, v_today, NULL, NULL, n > 0);

  SELECT count(DISTINCT cc.country) INTO n
    FROM public.alumni a
    JOIN public.city_country cc ON cc.alias = public.city_key(split_part(a.city, ',', 1))
   WHERE btrim(COALESCE(a.city, '')) <> '';
  PERFORM public.kn_put('alumni_countries', n, v_today, NULL, NULL, n > 0);

  -- Selectivity: the latest full recruiting round, meaning the most recent
  -- one whose applications have all been decided, or whose last
  -- application is more than 120 days old.
  SELECT semester_label, last_at::date INTO v_round, v_round_end
    FROM (SELECT semester_label, max(created_at) AS last_at,
                 bool_and(status IN ('rejected','offer_accepted','offer_declined','joined','withdrawn')) AS decided
            FROM public.applications
           WHERE btrim(COALESCE(semester_label, '')) <> ''
           GROUP BY semester_label) rounds
   WHERE decided OR last_at < now() - interval '120 days'
   ORDER BY last_at DESC
   LIMIT 1;
  v_min_rate := NULL;
  IF v_round IS NOT NULL THEN
    SELECT count(*) INTO v_total FROM public.applications WHERE semester_label = v_round;
    FOREACH d IN ARRAY ARRAY['equity','investment','macro','portfolio','quant'] LOOP
      SELECT count(*) INTO n FROM public.applications
       WHERE semester_label = v_round AND status IN ('offer_accepted','joined') AND offer_division::text = d;
      v_rate := CASE WHEN v_total > 0 THEN 100.0 * n / v_total END;
      PERFORM public.kn_put('join_rate_' || d, v_rate, v_round_end, v_round,
        jsonb_build_object('round', v_round), v_total > 0 AND n > 0);
      IF n > 0 AND v_total > 0 AND (v_min_rate IS NULL OR v_rate < v_min_rate) THEN v_min_rate := v_rate; END IF;
    END LOOP;
  ELSE
    FOREACH d IN ARRAY ARRAY['equity','investment','macro','portfolio','quant'] LOOP
      PERFORM public.kn_put('join_rate_' || d, NULL, v_today, NULL, NULL, false);
    END LOOP;
  END IF;
  PERFORM public.kn_put('acceptance_rate', v_min_rate, COALESCE(v_round_end, v_today), v_round,
    jsonb_build_object('round', v_round), v_min_rate IS NOT NULL);

  -- ── Events ──────────────────────────────────────────────────────────
  -- "Held": the date is confirmed and not in the future; internal
  -- meetings and the Association on Display stands are not counted.
  CREATE TEMP TABLE IF NOT EXISTS kn_held (id uuid, event_type text, date date, guest text[]) ON COMMIT DROP;
  TRUNCATE kn_held;
  INSERT INTO kn_held
  SELECT e.id, e.event_type, e.date::date, e.guest
    FROM public.events e
   WHERE NOT COALESCE(e.date_tbc, false)
     AND e.date::date <= v_today
     AND e.aod_day_id IS NULL
     AND e.event_type NOT IN ('meeting','association_on_display');

  SELECT count(*) INTO n FROM kn_held;
  PERFORM public.kn_put('events_held', n, v_today, NULL, NULL, n > 0);

  SELECT count(*) INTO n FROM kn_held WHERE date >= v_ay_start;
  PERFORM public.kn_put('events_this_year', n, v_today, NULL,
    jsonb_build_object('year', extract(year FROM v_ay_start)::int), n > 0);

  SELECT count(*) INTO n FROM public.event_registrations WHERE registered_at >= now() - interval '365 days';
  PERFORM public.kn_put('registrations_12m', n, v_today, NULL, NULL, n > 0);

  SELECT count(DISTINCT lower(regexp_replace(btrim(split_part(g, ' - ', 1)), '\s+', ' ', 'g'))) INTO n
    FROM kn_held h, unnest(h.guest) g
   WHERE btrim(COALESCE(split_part(g, ' - ', 1), '')) <> '';
  PERFORM public.kn_put('speakers', n, v_today, NULL, NULL, n > 0);

  SELECT count(*) INTO n FROM kn_held
   WHERE EXISTS (SELECT 1 FROM unnest(guest) g WHERE btrim(COALESCE(g, '')) <> '');
  PERFORM public.kn_put('guest_sessions', n, v_today, NULL, NULL, n > 0);

  SELECT count(*) INTO n FROM kn_held WHERE event_type = 'alumni_call';
  PERFORM public.kn_put('alumni_calls', n, v_today, NULL, NULL, n > 0);

  SELECT 4 + count(*) INTO n FROM kn_held WHERE event_type = 'company_visit';
  PERFORM public.kn_put('company_visits', n, v_today, NULL, NULL, true);

  -- ── Readings ────────────────────────────────────────────────────────
  SELECT count(*), min(publication_year), max(publication_year) INTO n, n2, n3 FROM public.readings;
  PERFORM public.kn_put('readings', n, v_today, NULL, NULL, n > 0);
  PERFORM public.kn_put('reading_years', n3 - n2, v_today, NULL,
    jsonb_build_object('from', n2, 'to', n3), n2 IS NOT NULL AND n3 > n2);
  SELECT count(DISTINCT lower(btrim(COALESCE(contributor_name, '') || ' ' || COALESCE(contributor_surname, '')))) INTO n
    FROM public.readings
   WHERE btrim(COALESCE(contributor_name, '') || COALESCE(contributor_surname, '')) <> '';
  PERFORM public.kn_put('reading_contributors', n, v_today, NULL, NULL, n > 0);

  -- ── Funds (virtual portfolios) ──────────────────────────────────────
  SELECT count(*) FILTER (WHERE active), count(*) FILTER (WHERE NOT active) INTO n, n2
    FROM (SELECT fund, bool_or(fund IN ('long-short','multi-asset')) AS active
            FROM (SELECT fund::text AS fund FROM public.fund_performance_years
                  UNION SELECT fund::text FROM public.archive_files WHERE fund IS NOT NULL
                  UNION SELECT fund::text FROM public.team_members WHERE fund IS NOT NULL) u
           WHERE fund IN ('long-short','multi-asset','dps','pir')
           GROUP BY fund) s;
  PERFORM public.kn_put('funds_run', n + n2, v_today, NULL,
    jsonb_build_object('active', n, 'closed', n2), n + n2 > 0);

  CREATE TEMP TABLE IF NOT EXISTS kn_series (k int, month date, r numeric, rf numeric) ON COMMIT DROP;
  FOREACH f IN ARRAY ARRAY['long-short','multi-asset'] LOOP
    f_slug := 'fund_' || replace(f, '-', '_');
    TRUNCATE kn_series;
    -- The monthly returns, in order, as fractions.
    INSERT INTO kn_series (k, month, r)
    SELECT row_number() OVER (ORDER BY y.year, t.idx), make_date(y.year, t.idx::int, 1), public.kn_points(t.v) / 100
      FROM public.fund_performance_years y,
           LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(y.months::jsonb) = 'array' THEN y.months::jsonb ELSE '[]'::jsonb END)
             WITH ORDINALITY AS t(v, idx)
     WHERE y.fund::text = f AND public.kn_points(t.v) IS NOT NULL AND t.idx <= 12;
    -- Renumber after dropping empty months.
    UPDATE kn_series s SET k = o.rn FROM (SELECT month, row_number() OVER (ORDER BY month) AS rn FROM kn_series) o WHERE o.month = s.month;

    SELECT count(*), min(month), max(month) INTO v_months, v_from, v_to FROM kn_series;
    v_to := (v_to + interval '1 month' - interval '1 day')::date;

    IF v_months > 0 THEN
      v_cum := 1; v_peak := 1; v_mdd := 0;
      FOR r IN SELECT kn_series.r FROM kn_series ORDER BY k LOOP
        v_cum := v_cum * (1 + r.r);
        IF v_cum > v_peak THEN v_peak := v_cum; END IF;
        IF (v_cum / v_peak - 1) < v_mdd THEN v_mdd := v_cum / v_peak - 1; END IF;
      END LOOP;
      SELECT stddev_samp(kn_series.r) * sqrt(12) INTO v_vol FROM kn_series;
      -- Return since inception: the fund table's own ITD of its latest year
      -- when there is one, so the page never shows two different figures.
      SELECT public.kn_points(y.itd) / 100 INTO v_itd
        FROM public.fund_performance_years y
       WHERE y.fund::text = f AND public.kn_points(y.itd) IS NOT NULL
       ORDER BY y.year DESC LIMIT 1;
      v_itd := COALESCE(v_itd, v_cum - 1);
      v_ann := CASE WHEN v_months >= 12 AND 1 + v_itd > 0 THEN power(1 + v_itd, 12.0 / v_months) - 1 END;
      -- The risk-free rate behind each full year's published Sharpe ratio:
      -- return minus Sharpe times volatility. Partial years take the
      -- average of the full years.
      UPDATE kn_series s SET rf = x.rf
        FROM (SELECT y.year,
                     (public.kn_points(y.ytd) - public.kn_points(y.sharpe) * public.kn_points(y.vol)) / 100 AS rf
                FROM public.fund_performance_years y
               WHERE y.fund::text = f
                 AND (SELECT count(*) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(y.months::jsonb) = 'array' THEN y.months::jsonb ELSE '[]'::jsonb END) m
                       WHERE public.kn_points(m) IS NOT NULL) = 12
                 AND public.kn_points(y.ytd) IS NOT NULL AND public.kn_points(y.sharpe) IS NOT NULL AND public.kn_points(y.vol) IS NOT NULL) x
       WHERE extract(year FROM s.month)::int = x.year AND x.rf BETWEEN -0.01 AND 0.08;
      SELECT avg(rf) INTO v_rf FROM kn_series WHERE rf IS NOT NULL;
      UPDATE kn_series SET rf = v_rf WHERE rf IS NULL;
      SELECT avg(rf) INTO v_rf FROM kn_series;
      v_sharpe := CASE WHEN v_ann IS NOT NULL AND v_rf IS NOT NULL AND v_vol > 0 THEN (v_ann - v_rf) / v_vol END;

      PERFORM public.kn_put(f_slug || '_years', v_months / 12.0, v_to, NULL,
        jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')), v_months >= 1);
      PERFORM public.kn_put(f_slug || '_ann_return', 100 * v_ann, v_to, NULL,
        jsonb_build_object('months', v_months, 'from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
        v_ann IS NOT NULL AND v_ann BETWEEN -0.9 AND 2);
      PERFORM public.kn_put(f_slug || '_ann_vol', 100 * v_vol, v_to, NULL,
        jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
        v_months >= 12 AND v_vol > 0 AND v_vol < 0.6);
      PERFORM public.kn_put(f_slug || '_itd', 100 * v_itd, v_to, NULL,
        jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
        v_itd BETWEEN -0.95 AND 20);
      PERFORM public.kn_put(f_slug || '_sharpe', v_sharpe, v_to, NULL,
        jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
        v_sharpe IS NOT NULL AND v_sharpe BETWEEN -5 AND 5);
      PERFORM public.kn_put(f_slug || '_mdd', 100 * v_mdd, v_to, NULL,
        jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
        v_months >= 12 AND v_mdd <= 0 AND v_mdd > -1);
      IF v_months > v_longest THEN v_longest := v_months; END IF;
    ELSE
      PERFORM public.kn_put(f_slug || s, NULL, v_today, NULL, NULL, false)
        FROM unnest(ARRAY['_years','_ann_return','_ann_vol','_itd','_sharpe','_mdd']) s;
    END IF;
  END LOOP;
  PERFORM public.kn_put('portfolio_months', v_longest, v_today, NULL, NULL, v_longest > 0);

  FOREACH f IN ARRAY ARRAY['pir','dps'] LOOP
    SELECT min(date::date), max(date::date) INTO v_from, v_to
      FROM public.archive_files
     WHERE status = 'published' AND deleted_at IS NULL AND fund::text = f AND date IS NOT NULL;
    PERFORM public.kn_put('fund_' || f || '_years', (v_to - v_from) / 365.25, v_to, NULL,
      jsonb_build_object('from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY')),
      v_from IS NOT NULL AND v_to > v_from);
  END LOOP;

  SELECT count(*) INTO v_count FROM public.key_numbers WHERE status = 'published';
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. What the public reads: published figures and where they go.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_key_numbers()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'computed_at', (SELECT max(updated_at) FROM public.key_numbers),
    'numbers', COALESCE((
      SELECT jsonb_object_agg(slug, jsonb_build_object(
               'label', label, 'value', value, 'format', format, 'decimals', decimals,
               'prefix', prefix, 'suffix', suffix, 'kind', kind, 'definition', definition,
               'period', period, 'as_of', as_of, 'virtual_portfolio', virtual_portfolio))
        FROM public.key_numbers
       WHERE status = 'published' AND value IS NOT NULL), '{}'::jsonb),
    'pages', COALESCE((
      SELECT jsonb_object_agg(page_key, slugs)
        FROM (SELECT p.page_key, jsonb_agg(p.slug ORDER BY p.position) AS slugs
                FROM public.key_number_pages p
                JOIN public.key_numbers k ON k.slug = p.slug
               WHERE k.status = 'published' AND k.value IS NOT NULL
               GROUP BY p.page_key) x), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.kn_put(text, numeric, date, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_key_numbers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kn_put(text, numeric, date, text, jsonb, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_key_numbers() TO service_role;
GRANT EXECUTE ON FUNCTION public.public_key_numbers() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 8. Report page counts, read from the PDFs by the `key-numbers` edge
--    function. This tick asks it to work only while a published report
--    still has no page count and its PDF has not been tried this week.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kn_page_count_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.archive_files a
     WHERE a.status = 'published' AND a.deleted_at IS NULL AND a.page_count IS NULL AND a.file_url IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.key_number_page_scan s
                        WHERE s.file_id = a.id AND s.tried_at > now() - interval '7 days')) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     OR NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'vault') THEN
    RETURN;
  END IF;
  EXECUTE $q$SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1$q$ INTO v_key;
  IF v_key IS NULL THEN RETURN; END IF;
  EXECUTE $q$SELECT net.http_post(url := $1, headers := $2, body := $3)$q$
    USING 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/key-numbers',
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
          jsonb_build_object('action', 'backfill-pages');
END;
$$;
REVOKE ALL ON FUNCTION public.kn_page_count_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kn_page_count_tick() TO service_role;

-- ---------------------------------------------------------------------
-- 9. Schedules: the figures every night at 02:15 Rome time (00:15 UTC in
--    summer, 01:15 in winter: the job runs at 01:15 UTC), the page
--    counter every ten minutes while it has work.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh_key_numbers') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_key_numbers');
    PERFORM cron.unschedule('key_numbers_page_counts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'key_numbers_page_counts');
    PERFORM cron.schedule('refresh_key_numbers', '15 1 * * *', $cron$SELECT public.refresh_key_numbers()$cron$);
    PERFORM cron.schedule('key_numbers_page_counts', '*/10 * * * *', $cron$SELECT public.kn_page_count_tick()$cron$);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 10. First computation, reported.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_pub   int;
  v_list  text;
  v_cov   text;
BEGIN
  v_pub := public.refresh_key_numbers();
  SELECT string_agg(slug || ' = ' || COALESCE(value::text, 'none') || CASE WHEN status = 'draft' THEN ' (withheld)' ELSE '' END, '; ' ORDER BY slug)
    INTO v_list FROM public.key_numbers;
  SELECT format('%s of %s published reports have a page count', count(page_count), count(*))
    INTO v_cov FROM public.archive_files WHERE status = 'published' AND deleted_at IS NULL;
  RAISE NOTICE 'Key numbers: % published of %. %.', v_pub, (SELECT count(*) FROM public.key_numbers), v_cov;
  RAISE NOTICE 'Key numbers values: %', v_list;
END $$;
