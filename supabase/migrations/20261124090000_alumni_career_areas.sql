-- =====================================================================
-- STEP 107: ALUMNI CAREER AREAS.
-- ---------------------------------------------------------------------
-- The directory kept one free-text "job area" per alumnus, typed by hand:
-- 61 different spellings for 335 people ("Investment", "Investments",
-- "Investment & Strategy", "M&A", "Valuation & M&A"...), so Minerva's
-- Track Record listed sixty rows under "Where alumni work" and the filters
-- of the Alumni pages offered sixty choices.
--
-- Each alumnus now also has ONE CAREER AREA from a fixed list of twelve
-- (the list and its labels are src/lib/alumni-careers.ts; this file is
-- its database twin, checked value for value by
-- scripts/alumni-careers.test.mjs):
--
--   investment_banking  Investment Banking & Advisory
--   markets             Sales & Trading
--   asset_management    Asset & Wealth Management
--   private_markets     Private Markets
--   hedge_funds         Hedge Funds & Trading Firms
--   research            Research & Economics
--   risk_quant          Risk & Quantitative
--   consulting          Consulting
--   corporate           Corporate & Industry
--   entrepreneurship    Entrepreneurship
--   academia            Academia
--   other               Other
--
-- HOW AN AREA IS WORKED OUT. From the job area AND the employer, the way
-- a careers office reads a CV: the employer's kind first where it settles
-- the question (a strategy consultancy, a hedge fund, a private equity
-- house, a university), then the role ("M&A" is advisory, "Markets" is
-- sales and trading), then the employer again for the generic words
-- ("Investments" at an asset manager, "Finance" at a corporate). A role
-- that matches nothing is "Other"; an alumnus with neither a role nor an
-- employer that settles it has no area ("not recorded"), as before.
--
-- NOTHING IS OVERWRITTEN. The job area stays as typed and is still shown
-- as the detail of the role; the career area is a new column. A person
-- in the workspace can set the area by hand (career_area_manual), and a
-- hand-set area is never recomputed. Every other row follows its job
-- area and employer automatically, whoever writes it (the workspace, the
-- import, a graduation), through the trigger below.
--
-- Safe to run twice: every object is created or replaced, the backfill
-- writes only the rows whose automatic area differs, and no row is
-- deleted.
-- =====================================================================

-- 1. THE LIST, IN THE ORDER THE PAGES SHOW IT ------------------------
CREATE OR REPLACE FUNCTION public.alumni_career_keys()
RETURNS text[]
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT ARRAY[
    'investment_banking', 'markets', 'asset_management', 'private_markets',
    'hedge_funds', 'research', 'risk_quant', 'consulting', 'corporate',
    'entrepreneurship', 'academia', 'other'
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.alumni_career_label(p_key text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE p_key
    WHEN 'investment_banking' THEN 'Investment Banking & Advisory'
    WHEN 'markets'            THEN 'Sales & Trading'
    WHEN 'asset_management'   THEN 'Asset & Wealth Management'
    WHEN 'private_markets'    THEN 'Private Markets'
    WHEN 'hedge_funds'        THEN 'Hedge Funds & Trading Firms'
    WHEN 'research'           THEN 'Research & Economics'
    WHEN 'risk_quant'         THEN 'Risk & Quantitative'
    WHEN 'consulting'         THEN 'Consulting'
    WHEN 'corporate'          THEN 'Corporate & Industry'
    WHEN 'entrepreneurship'   THEN 'Entrepreneurship'
    WHEN 'academia'           THEN 'Academia'
    WHEN 'other'              THEN 'Other'
    ELSE NULL
  END;
$$;

-- 2. THE KIND OF EMPLOYER ----------------------------------------------
-- From the employer's name as typed. Only names whose kind is plain are
-- listed; a name not listed has no kind and the role alone decides.
CREATE OR REPLACE FUNCTION public.alumni_employer_sector(p_company text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN s = '' THEN NULL
    -- Universities and doctoral programmes.
    WHEN s ~ '(universit|^bocconi$|^oxford$|^cambridge$|school of economics|business school|phd|doctoral|politecnico|polytechnic|institute of technology|^lse$|^insead$|^hec\M|sciences po)' THEN 'academia'
    -- Central banks, international and public institutions.
    WHEN s ~ '(^ecb$|european central bank|banca d.italia|bank of italy|^imf$|international monetary fund|european commission|european parliament|european investment bank|^eib$|european stability mechanism|world bank|^oecd$|^bis$|bank for international settlements|federal reserve|bank of england|banque de france|bundesbank|ministry|ministero|consob|^esma$|^eba$|confindustria|united nations)' THEN 'public'
    -- A company not yet named.
    WHEN s ~ '(stealth)' THEN 'startup'
    -- Strategy, management and economic consultancies.
    WHEN s ~ '(mckinsey|^bcg$|boston consulting|^bain$|^bain & co|bain and company|oliver wyman|roland berger|accenture|altman solon|value partners|^kearney|^a\.? ?t\.? kearney|strategy&|l\.?e\.?k\.? consulting|prometeia|intellera|rbb economics|fti consulting|compass lexecon|oxera|analysis group|^nera|consulting)' THEN 'consulting'
    -- The Big Four: advisory or consulting, by the role.
    WHEN s ~ '(deloitte|^ey$|ernst|kpmg|^pwc$|pricewaterhouse)' THEN 'big4'
    -- Hedge funds and proprietary trading firms.
    WHEN s ~ '(citadel|d\.? ?e\.? shaw|davidson kempner|garda capital|north rock|sculptor|basswood|squarepoint|imc trading|^imc$|millennium|balyasny|bridgewater|two sigma|jane street|optiver|flow traders|susquehanna|^sig$|man group|brevan howard|marshall wace|point72|elliott|capula|rokos|qube research|tudor|caxton|lansdowne|egerton)' THEN 'hf'
    -- Private equity, venture capital, private credit, infrastructure and real estate investors.
    WHEN s ~ '(bain capital|investindustrial|keensight|catterton|nextalia|target global|^tpg|angelo gordon|vaaka|wise equity|castellum|apollo|^ares|hayfin|hamilton lane|cube infrastructure|^hines$|aermont|fondo italiano d.investimento|dea capital|kyip|kkr|blackstone|carlyle|^cvc|^eqt|permira|cinven|advent international|^ardian|partners group|brookfield|^3i\M|bc partners|warburg pincus|general atlantic|clessidra|f2i|^hg$|bridgepoint|triton|antin|macquarie asset|tikehau|eurazeo|hig capital|h\.i\.g\.|oaktree|blue owl|golub|sixth street)' THEN 'pe'
    -- Asset and wealth managers, private banks, family offices.
    WHEN s ~ '(blackrock|vanguard|pimco|capital group|robeco|pictet|neuberger|eurizon|anima|arca sgr|allianz (global investors|im$|investment)|cpr am|natixis investment|sella sgr|azimut|amundi|fidelity|schroders|invesco|generali investments|kairos|mediolanum|banor|indosuez|reichmuth|julius b(a|ä)er|lombard odier|edmond de rothschild|alpinum|newadvise|valeur|heritage holdings|family office|asset management|investment management|wealth|\msgr\M|\mam$)' THEN 'am'
    -- Advisory firms and corporate finance boutiques.
    WHEN s ~ '(lazard|rothschild|houlihan|lincoln international|livingstone|nielen schuman|pirola corporate|translink|broletto|canson capital|fredericks michael|augusta & co|evercore|^pjt|moelis|perella|centerview|greenhill|^accuracy$|pipino|corporate finance|corporate advisory|^teneo$|alantra|vitale|^kpmg advisory)' THEN 'advisory'
    -- Banks: investment, universal and commercial.
    WHEN s ~ '(goldman|morgan stanley|j\.? ?p\.? ?morgan|jpmorgan|bank of america|^bofa|barclays|bnp|^citi|credit agricole|credite agricole|cr(e|é)dit agricole|deutsche bank|hsbc|^ing$|intesa|macquarie|mediobanca|mizuho|natixis|natwest|nomura|santander|^ubs$|unicredit|banca akros|^equita$|leonteq|^sella$|banca |^banco|credit suisse|soci(e|é)t(e|é) g(e|é)n(e|é)rale|jefferies|^rbc|wells fargo|mufg|smbc|kepler|commerzbank|bper|bpm|zurich bank|capital one|monte dei paschi|^bank)' THEN 'bank'
    -- Insurers.
    WHEN s ~ '(generali|unipol|covea|^axa|^allianz$|zurich insurance|munich re|swiss re|poste vita|reale mutua)' THEN 'insurance'
    -- Data, ratings and market infrastructure.
    WHEN s ~ '(bloomberg|moody|s&p|standard & poor|fitch|msci|refinitiv|lseg|factset|morningstar)' THEN 'data'
    WHEN s ~ '(^eurex$|euronext|borsa italiana|clearstream|euroclear|^cme$|^ice$|deutsche b(o|ö)rse)' THEN 'market_infra'
    -- Everything else that is plainly a company outside finance.
    WHEN s ~ '(^e\.? ?on$|^enel|^eni$|terna|sorgenia|nextera|contourglobal|renewables|greencor|enery|powerbus|stmicro|^p&g$|procter|^ebay$|mastercard|american express|^visa$|mundys|^moove$|christie|student accom|nido living|hoist finance|monzo|hercle|revolut|satispay|amazon|google|microsoft|^apple$|^meta$|ferrari|luxottica|pirelli|leonardo|stellantis|unilever|nestl)' THEN 'corporate'
    ELSE NULL
  END
  FROM (SELECT lower(btrim(COALESCE(p_company, ''))) AS s) c;
$$;

-- 3. THE CAREER AREA OF ONE ALUMNUS -------------------------------------
CREATE OR REPLACE FUNCTION public.alumni_career_area(p_job_area text, p_company text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  a text := lower(btrim(COALESCE(p_job_area, '')));
  s text := public.alumni_employer_sector(p_company);
BEGIN
  IF a = '' AND s IS NULL THEN
    RETURN NULL;                                   -- nothing recorded
  END IF;

  -- The employer settles it, whatever the role is called.
  IF s = 'academia' OR a ~ '(phd|ph\.d|doctoral|doctorate|professor|lecturer|academi|postdoc|teaching)' THEN
    RETURN 'academia';
  END IF;
  IF s = 'startup' OR a ~ '(start-?up|founder|entrepreneur)' THEN
    RETURN 'entrepreneurship';
  END IF;
  IF s = 'consulting' THEN
    RETURN 'consulting';
  END IF;
  IF s = 'hf' OR a ~ '(hedge fund|l/s equity|long[ /-]short|multi-?strategy)' THEN
    RETURN 'hedge_funds';
  END IF;
  IF s = 'pe' OR a ~ '(private equity|venture|private credit|special.{0,20}credit|growth equity|buyout|infrastructure|real estate private|private markets|direct lending)' THEN
    RETURN 'private_markets';
  END IF;

  -- The role.
  IF a ~ '(rating)' THEN
    RETURN 'research';
  END IF;
  IF a ~ '(risk|quant|data|analytics|machine learning|modell?ing)' THEN
    RETURN CASE WHEN s = 'big4' THEN 'consulting' ELSE 'risk_quant' END;
  END IF;
  IF a ~ '(asset manag|investment manag|portfolio manag|fund manag|wealth|private bank|investment solution|family office|trust fund|multi-?asset)' THEN
    RETURN 'asset_management';
  END IF;
  IF a ~ '(m&a|m & a|merger|acquisition|investment bank|corporate finance|coverage|\mecm\M|\mdcm\M|capital markets|leveraged|restructuring|valuation|financial advisory|transaction services|deal advisory|structured finance|project finance|corporate advisory|\mfig\M|financial institutions group)' THEN
    RETURN CASE WHEN s IN ('corporate', 'insurance') AND a ~ '(corporate finance)' THEN 'corporate' ELSE 'investment_banking' END;
  END IF;
  IF a ~ '(\mmarkets?\M|trading|trader|sales|structuring|derivative|treasury|broker|clearing|fixed income|equity solution|commodit|\mfx\M|\mrates\M|securiti[sz]ation|delta one)' THEN
    RETURN CASE
      WHEN s = 'am' THEN 'asset_management'
      WHEN s IN ('corporate', 'insurance') AND a ~ '(sales)' THEN 'corporate'
      ELSE 'markets'
    END;
  END IF;
  IF a ~ '(consult|advisory|business analyst)' THEN
    RETURN CASE WHEN s IN ('corporate', 'insurance') THEN 'corporate' ELSE 'consulting' END;
  END IF;
  IF a ~ '(research|economi|policy)' THEN
    RETURN 'research';
  END IF;
  IF a ~ '(real estate)' THEN
    RETURN CASE WHEN s IN ('corporate', 'insurance') THEN 'corporate' ELSE 'private_markets' END;
  END IF;
  IF a ~ '(invest)' THEN
    RETURN 'asset_management';
  END IF;
  IF a ~ '(financial intermediar|financial institution)' THEN
    RETURN CASE WHEN s IN ('bank', 'advisory') THEN 'investment_banking' WHEN s = 'public' THEN 'research' ELSE 'other' END;
  END IF;
  IF a ~ '(audit|accounting|tax)' AND s = 'big4' THEN
    RETURN 'consulting';
  END IF;
  IF a ~ '(business|marketing|controll|accounting|audit|product|operations|strategy|insurance|human resources|\mhr\M|legal|communication|procurement|supply chain|engineer|software|finance|financial services)' THEN
    RETURN CASE
      WHEN s = 'am' THEN 'asset_management'
      WHEN s = 'big4' THEN 'consulting'
      WHEN s = 'bank' AND a ~ '(finance|financial services)' THEN 'other'
      ELSE 'corporate'
    END;
  END IF;

  -- No role, or a role none of the above describes: the employer, when
  -- its kind says what the work is.
  RETURN CASE s
    WHEN 'big4'         THEN 'consulting'
    WHEN 'am'           THEN 'asset_management'
    WHEN 'advisory'     THEN 'investment_banking'
    WHEN 'public'       THEN 'research'
    WHEN 'data'         THEN 'research'
    WHEN 'market_infra' THEN 'markets'
    WHEN 'insurance'    THEN 'corporate'
    WHEN 'corporate'    THEN 'corporate'
    -- A bank alone does not say which desk.
    ELSE CASE WHEN a = '' THEN NULL ELSE 'other' END
  END;
END;
$$;

-- 4. THE COLUMNS ---------------------------------------------------------
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS career_area text;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS career_area_manual boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alumni_career_area_check') THEN
    ALTER TABLE public.alumni ADD CONSTRAINT alumni_career_area_check
      CHECK (career_area IS NULL OR career_area = ANY (public.alumni_career_keys()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS alumni_career_area_idx ON public.alumni (career_area);

-- 5. EVERY WRITE KEEPS THE AREA IN STEP ------------------------------------
-- An area set by hand stays; one cleared by hand goes back to automatic.
CREATE OR REPLACE FUNCTION public.alumni_set_career_area()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.career_area_manual AND NEW.career_area IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.career_area_manual := false;
  NEW.career_area := public.alumni_career_area(NEW.job_area, NEW.company);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alumni_set_career_area_trg ON public.alumni;
CREATE TRIGGER alumni_set_career_area_trg
  BEFORE INSERT OR UPDATE OF job_area, company, career_area, career_area_manual ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.alumni_set_career_area();

-- 6. THE ROWS ALREADY THERE -------------------------------------------------
-- Only the area is written, and only where it is not already right.
UPDATE public.alumni
   SET career_area = public.alumni_career_area(job_area, company)
 WHERE NOT career_area_manual
   AND career_area IS DISTINCT FROM public.alumni_career_area(job_area, company);

-- 7. THE PUBLIC READS -------------------------------------------------------
-- The alumni directory: the 100 most recent alumni as before, each with
-- the career area, and the list of areas in use for the filter. Nothing
-- else is added, so the page shows no more about anybody than before.
CREATE OR REPLACE FUNCTION public.public_alumni_directory()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.alumni),
    'rows', COALESCE((
      SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT id, name, surname, graduation_year, company, city, job_area, career_area, linkedin_url
        FROM public.alumni
        ORDER BY graduation_year DESC, surname ASC, name ASC
        LIMIT 100
      ) t), '[]'::jsonb),
    'job_areas', COALESCE((SELECT jsonb_agg(DISTINCT job_area) FROM public.alumni WHERE job_area IS NOT NULL AND job_area <> ''), '[]'::jsonb),
    'career_areas', COALESCE((
      SELECT jsonb_agg(k ORDER BY i)
        FROM unnest(public.alumni_career_keys()) WITH ORDINALITY AS u(k, i)
       WHERE EXISTS (SELECT 1 FROM public.alumni WHERE career_area = u.k)), '[]'::jsonb),
    'companies', COALESCE((SELECT jsonb_agg(DISTINCT company)  FROM public.alumni WHERE company  IS NOT NULL AND company  <> ''), '[]'::jsonb),
    'cities',    COALESCE((SELECT jsonb_agg(DISTINCT city)     FROM public.alumni WHERE city     IS NOT NULL AND city     <> ''), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.public_alumni_directory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_alumni_directory() TO anon, authenticated;

-- How many alumni of the whole directory match the public filters, the
-- career area in place of the job area. A new name, so the function the
-- page used until now stays exactly as it is for any copy still open.
CREATE OR REPLACE FUNCTION public.public_alumni_match_count(
  p_career_area text DEFAULT NULL,
  p_company     text DEFAULT NULL,
  p_city        text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.alumni
  WHERE (p_career_area IS NULL OR career_area = p_career_area)
    AND (p_company     IS NULL OR company     = p_company)
    AND (p_city        IS NULL OR city        = p_city);
$$;
REVOKE ALL ON FUNCTION public.public_alumni_match_count(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_alumni_match_count(text, text, text) TO anon, authenticated;

-- 8. MINERVA'S TRACK RECORD, "WHERE ALUMNI WORK" ----------------------------
-- The function exactly as migration 20261109090600 wrote it, except the
-- two alumni fields marked Step 107 below.
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
    -- Step 107: the career areas (alumni_career_label), most alumni first
    -- and Other last, in place of the job areas as typed. The same field
    -- and the same shape ({area, alumni}), so every page reads it as before.
    'alumni_areas', COALESCE((SELECT jsonb_agg(jsonb_build_object('area', public.alumni_career_label(k), 'key', k, 'alumni', n)
                                               ORDER BY (k = 'other'), n DESC, array_position(public.alumni_career_keys(), k))
                                FROM (SELECT career_area AS k, count(*)::int AS n
                                        FROM public.alumni
                                       WHERE career_area IS NOT NULL
                                       GROUP BY 1) a), '[]'::jsonb),
    'alumni_without_area', (SELECT count(*)::int FROM public.alumni WHERE career_area IS NULL),
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

REVOKE ALL ON FUNCTION public.public_track_record() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_track_record() TO anon, authenticated;
