-- =====================================================================
-- STEP 112: ALUMNI CAREER AREAS, TWO MORE.
-- ---------------------------------------------------------------------
-- Clearing is not sales and trading: someone who studies the venue, the
-- clearing and the settlement of financial products does neither. And a
-- central bank or the IMF is not equity research. So the list of areas
-- (Step 107) gains two, and one is renamed (fourteen in all; the list and
-- its labels are src/lib/alumni-careers.ts, the edge functions' copy
-- _shared/alumni-careers.ts, checked value for value by
-- scripts/alumni-careers.test.mjs):
--
--   market_operations  Market Operations & Infrastructure   (new)
--                      clearing, settlement, custody, post-trade, and
--                      every role at an exchange or a clearing house
--   public_policy      Public Institutions & Policy         (new)
--                      central banks, international and public
--                      institutions, regulators, policy roles
--   research           Research & Ratings                   (renamed)
--                      equity, credit and macro research, ratings and
--                      financial data, outside public institutions
--
-- The employer and the role still decide, as in Step 107: a public
-- institution settles the area as a university does; a clearing,
-- settlement or custody role, or any role at an exchange or a clearing
-- house, is Market Operations & Infrastructure; 'Clearing' is no longer
-- read as a markets word.
--
-- NOTHING TYPED IS OVERWRITTEN. The job area and the employer stay as
-- typed; an area set by hand in the workspace is never recomputed. Only
-- the automatic areas that change are written, and each is copied first,
-- as it was, into `alumni_career_backup_step112`.
--
-- Safe to run twice: functions are replaced, the backup keeps its first
-- copy, and a second run finds no automatic area left to change.
-- =====================================================================

-- 1. THE LIST, IN THE ORDER THE PAGES SHOW IT ------------------------
CREATE OR REPLACE FUNCTION public.alumni_career_keys()
RETURNS text[]
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT ARRAY[
    'investment_banking', 'markets', 'market_operations', 'asset_management', 'private_markets',
    'hedge_funds', 'research', 'public_policy', 'risk_quant', 'consulting', 'corporate',
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
    WHEN 'market_operations'  THEN 'Market Operations & Infrastructure'
    WHEN 'asset_management'   THEN 'Asset & Wealth Management'
    WHEN 'private_markets'    THEN 'Private Markets'
    WHEN 'hedge_funds'        THEN 'Hedge Funds & Trading Firms'
    WHEN 'research'           THEN 'Research & Ratings'
    WHEN 'public_policy'      THEN 'Public Institutions & Policy'
    WHEN 'risk_quant'         THEN 'Risk & Quantitative'
    WHEN 'consulting'         THEN 'Consulting'
    WHEN 'corporate'          THEN 'Corporate & Industry'
    WHEN 'entrepreneurship'   THEN 'Entrepreneurship'
    WHEN 'academia'           THEN 'Academia'
    WHEN 'other'              THEN 'Other'
    ELSE NULL
  END;
$$;

-- 2. THE KIND OF EMPLOYER (exchanges, clearing houses and custodians added) --
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
    -- Exchanges, clearing houses, central securities depositories and custodians.
    WHEN s ~ '(^eurex|euronext|borsa italiana|clearstream|euroclear|^cme$|^cme group|^ice$|^ice clear|deutsche b(o|ö)rse|^lch|cc&g|cassa di compensazione|monte titoli|^six\M|^dtcc|^cboe|nasdaq|^caceis|securities services)' THEN 'market_infra'
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
  -- Central banks, international and public institutions settle it too.
  IF s = 'public' THEN
    RETURN 'public_policy';
  END IF;
  -- The venue, clearing, settlement and custody: market operations, not
  -- sales or trading (Step 112).
  IF s = 'market_infra' OR a ~ '(clearing|settlement|custod|post-?trade|securities services|collateral|market infrastructure|market operations|trade support)' THEN
    RETURN 'market_operations';
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
  IF a ~ '(\mmarkets?\M|trading|trader|sales|structuring|derivative|treasury|broker|fixed income|equity solution|commodit|\mfx\M|\mrates\M|securiti[sz]ation|delta one)' THEN
    RETURN CASE
      WHEN s = 'am' THEN 'asset_management'
      WHEN s IN ('corporate', 'insurance') AND a ~ '(sales)' THEN 'corporate'
      ELSE 'markets'
    END;
  END IF;
  IF a ~ '(consult|advisory|business analyst)' THEN
    RETURN CASE WHEN s IN ('corporate', 'insurance') THEN 'corporate' ELSE 'consulting' END;
  END IF;
  IF a ~ '(policy|regulat|public affairs|government|supervis)' THEN
    RETURN 'public_policy';
  END IF;
  IF a ~ '(research|economi)' THEN
    RETURN 'research';
  END IF;
  IF a ~ '(real estate)' THEN
    RETURN CASE WHEN s IN ('corporate', 'insurance') THEN 'corporate' ELSE 'private_markets' END;
  END IF;
  IF a ~ '(invest)' THEN
    RETURN 'asset_management';
  END IF;
  IF a ~ '(financial intermediar|financial institution)' THEN
    RETURN CASE WHEN s IN ('bank', 'advisory') THEN 'investment_banking' WHEN s = 'public' THEN 'public_policy' ELSE 'other' END;
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
    WHEN 'public'       THEN 'public_policy'
    WHEN 'data'         THEN 'research'
    WHEN 'market_infra' THEN 'market_operations'
    WHEN 'insurance'    THEN 'corporate'
    WHEN 'corporate'    THEN 'corporate'
    -- A bank alone does not say which desk.
    ELSE CASE WHEN a = '' THEN NULL ELSE 'other' END
  END;
END;
$$;

-- 4. THE ROWS ALREADY THERE, BACKED UP FIRST --------------------------------
CREATE TABLE IF NOT EXISTS public.alumni_career_backup_step112 (
  alumni_id uuid PRIMARY KEY,
  career_area text,
  career_area_manual boolean NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alumni_career_backup_step112 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alumni_career_backup_step112 FROM anon, authenticated;

INSERT INTO public.alumni_career_backup_step112 (alumni_id, career_area, career_area_manual)
SELECT id, career_area, career_area_manual
  FROM public.alumni
 WHERE NOT career_area_manual
   AND career_area IS DISTINCT FROM public.alumni_career_area(job_area, company)
ON CONFLICT (alumni_id) DO NOTHING;

-- Only the area is written, and only where it is automatic and differs.
UPDATE public.alumni
   SET career_area = public.alumni_career_area(job_area, company)
 WHERE NOT career_area_manual
   AND career_area IS DISTINCT FROM public.alumni_career_area(job_area, company);
