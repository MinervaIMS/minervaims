-- =====================================================================
-- Step 93: evidence an AI can cite.
-- ---------------------------------------------------------------------
-- 1. Reports get a permanent address (`slug`), a type, tags and their
--    authors, read from each PDF's cover. The address is made from the
--    title and the year, is unique, and never changes once the report has
--    been published (`slug_locked`).
-- 2. Funds: the closed funds can hold monthly returns too; each fund has
--    a profile (inception, end, rebalancing, methodology, positions); the
--    PM team types the market references and the risk-free rate (€STR)
--    month by month; ONE function, `fund_track_record`, derives every
--    statistic from the monthly returns, for the fund pages, the data
--    files and the key numbers registry alike.
-- 3. Division pages: "How we work" and "Flagship work", edited by Heads.
-- 4. `public_track_record()`: the figures behind /track-record.
--
-- Idempotent: every statement can run twice. Nothing is deleted. Existing
-- values are never overwritten: authors, types and drafts fill only empty
-- fields, and seeds use ON CONFLICT DO NOTHING.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reports
-- ---------------------------------------------------------------------
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS slug_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS report_type text;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS authors jsonb NOT NULL DEFAULT '[]'::jsonb;
-- The PDF's own metadata (Title, Author, Subject, Keywords, Creator): what
-- was last written into the file and when, and where the untouched
-- original is kept (bucket archive-originals). A report whose page details
-- no longer match `pdf_metadata` is listed for an update in the archive.
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS pdf_metadata_at timestamptz;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS pdf_metadata jsonb;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS pdf_original_path text;

-- Tags: at most 12, each 1 to 40 characters.
CREATE OR REPLACE FUNCTION public.archive_tags_ok(p text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(cardinality(p), 0) <= 12
     AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p, '{}'::text[])) t
                      WHERE t IS NULL OR length(btrim(t)) = 0 OR length(t) > 40);
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archive_files_report_type_check') THEN
    ALTER TABLE public.archive_files ADD CONSTRAINT archive_files_report_type_check
      CHECK (report_type IS NULL OR report_type IN ('equity_report','investment_outlook','macro_report','fund_update','quant_paper'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archive_files_tags_check') THEN
    ALTER TABLE public.archive_files ADD CONSTRAINT archive_files_tags_check CHECK (public.archive_tags_ok(tags));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archive_files_authors_check') THEN
    ALTER TABLE public.archive_files ADD CONSTRAINT archive_files_authors_check
      CHECK (jsonb_typeof(authors) = 'array' AND jsonb_array_length(authors) <= 40);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS archive_files_slug_key ON public.archive_files (slug) WHERE slug IS NOT NULL;

-- The type a report gets from its division, until a Head changes it.
CREATE OR REPLACE FUNCTION public.archive_default_type(p_division text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_division
    WHEN 'equity' THEN 'equity_report'
    WHEN 'investment' THEN 'investment_outlook'
    WHEN 'macro' THEN 'macro_report'
    WHEN 'portfolio' THEN 'fund_update'
    WHEN 'quant' THEN 'quant_paper'
  END;
$$;

-- "Monster Beverage Corp - Equity Research", 2020-06-26
--   -> "monster-beverage-corp-equity-research-2020"
-- Lower case, accents dropped, "&" read as "and", anything else that is
-- not a letter or a digit becomes one hyphen; at most 80 characters,
-- cut at a hyphen; then the year, unless the title already has it.
CREATE OR REPLACE FUNCTION public.archive_slugify(p_title text, p_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH a AS (
    SELECT btrim(regexp_replace(
             translate(
               replace(replace(replace(replace(replace(replace(lower(COALESCE(p_title, '')),
                 '&', ' and '), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), '''', ''), '’', ''),
               'àáâãäåāăąèéêëēėęěìíîïīįıòóôõöøōőùúûüūůűųçćčďđğłńñňřśşšťţźżžýÿ',
               'aaaaaaaaaeeeeeeeeiiiiiiioooooooouuuuuuuucccddglnnnrsssttzzzyy'),
             '[^a-z0-9]+', '-', 'g'), '-') AS s
  ), b AS (
    -- At most 80 characters, cut at a hyphen, without a dangling "and",
    -- "of" or "the" at the end.
    SELECT regexp_replace(
             CASE WHEN length(s) <= 80 THEN s
                  ELSE btrim(regexp_replace(left(s, 81), '-[^-]*$', ''), '-') END,
             '(-(and|of|the|a|an|in|on|for|to|with|vs))+$', '') AS s
      FROM a
  ), y AS (
    SELECT CASE WHEN p_date IS NOT NULL THEN extract(year FROM p_date)::int::text END AS yr FROM a
  )
  -- The year is added unless the title already carries it.
  SELECT concat_ws('-', COALESCE(NULLIF(b.s, ''), 'report'),
                   CASE WHEN y.yr IS NOT NULL AND b.s !~ ('(^|-)' || y.yr || '(-|$)') THEN y.yr END)
    FROM b, y;
$$;

-- The base, or the base with "-2", "-3"... when another report has it.
CREATE OR REPLACE FUNCTION public.archive_unique_slug(p_base text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  s text := COALESCE(NULLIF(p_base, ''), 'report');
  n int := 1;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.archive_files WHERE slug = s AND id IS DISTINCT FROM p_id) LOOP
    n := n + 1;
    s := COALESCE(NULLIF(p_base, ''), 'report') || '-' || n;
  END LOOP;
  RETURN s;
END;
$$;

-- THE ADDRESS RULE, enforced where every write passes. A new report gets
-- its address from its title and year; until it is first published the
-- address follows the title and the date; from then on it is fixed, and
-- nothing a client sends can change it. A type is filled from the
-- division when none is given.
CREATE OR REPLACE FUNCTION public.archive_files_address_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.slug_locked THEN
      NEW.slug := OLD.slug;
      NEW.slug_locked := true;
    ELSIF OLD.slug IS NULL OR NEW.title IS DISTINCT FROM OLD.title OR NEW.date IS DISTINCT FROM OLD.date THEN
      NEW.slug := public.archive_unique_slug(public.archive_slugify(NEW.title, NEW.date), NEW.id);
    ELSE
      NEW.slug := OLD.slug;
      NEW.slug_locked := OLD.slug_locked;
    END IF;
  ELSE
    NEW.slug := public.archive_unique_slug(public.archive_slugify(NEW.title, NEW.date), NEW.id);
    NEW.slug_locked := false;
  END IF;
  IF NEW.status = 'published' THEN
    NEW.slug_locked := true;
  END IF;
  IF NEW.report_type IS NULL THEN
    NEW.report_type := public.archive_default_type(NEW.division::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archive_files_address_guard ON public.archive_files;
CREATE TRIGGER archive_files_address_guard
  BEFORE INSERT OR UPDATE ON public.archive_files
  FOR EACH ROW EXECUTE FUNCTION public.archive_files_address_guard();

-- Backfill, oldest first so that the first report of a title keeps the
-- plain address. The other triggers are paused for these rows only so
-- that `updated_at` (each report's "last modified" in the sitemap) keeps
-- its real value. Only empty fields are filled.
ALTER TABLE public.archive_files DISABLE TRIGGER USER;
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, title, date, status FROM public.archive_files WHERE slug IS NULL ORDER BY date NULLS LAST, created_at, id LOOP
    UPDATE public.archive_files
       SET slug = public.archive_unique_slug(public.archive_slugify(r.title, r.date), r.id),
           slug_locked = (r.status = 'published')
     WHERE id = r.id;
  END LOOP;
  UPDATE public.archive_files SET slug_locked = true WHERE status = 'published' AND slug IS NOT NULL AND NOT slug_locked;
  UPDATE public.archive_files SET report_type = public.archive_default_type(division::text) WHERE report_type IS NULL;
END $$;

-- Authors of the published reports, as printed on each PDF's cover (names
-- and roles; no contact details). Filled only where a report has none.
UPDATE public.archive_files f
   SET authors = v.authors
  FROM (VALUES
  ('92f80ae6-8161-4fc7-a161-7fbe242c59ef'::uuid, '[{"name":"Alessandro Patrizi","role":"Head of Asset Management"},{"name":"Antongiulio Frattasio","role":"Risk Analyst"},{"name":"Andrea Maccarrone","role":"Risk Analyst"},{"name":"Mohammad Pourmohammadi","role":"Risk Analyst"}]'::jsonb),
  ('4015bf6f-7d35-4b57-a943-57c07471c486'::uuid, '[{"name":"Riccardo Frangi","role":"Lead Analyst, Macro Research"},{"name":"Jacopo Signorelli","role":"Lead Analyst, Macro Research"},{"name":"Pietro Bologna","role":"Macro Research Analyst"},{"name":"Antoni Erkiert","role":"Macro Research Analyst"},{"name":"Nastassia Chyzheuskaya","role":"Macro Research Analyst"},{"name":"Jeh Patel","role":"Head of Macro Research"},{"name":"Vito Antonio Amatulli","role":"Head of Research"}]'::jsonb),
  ('91b20ae2-18cc-4468-8647-2283b6370e9b'::uuid, '[{"name":"Vito Antonio Amatulli","role":"Head of Research"}]'::jsonb),
  ('7afa6377-0a1f-4989-afa0-6812bc72617a'::uuid, '[{"name":"Arturo Schembri","role":"President"},{"name":"Gabriele Maggio","role":"Head of Markets and Alternatives"},{"name":"Tommaso Beverina","role":"Markets and Alternatives Analyst"},{"name":"Martina Schipani","role":"Markets and Alternatives Analyst"},{"name":"Daniele Tana","role":"Markets and Alternatives Analyst"},{"name":"Marco Uggeri","role":"Markets and Alternatives Analyst"}]'::jsonb),
  ('083044e2-e658-41b2-8702-e42fee4d098c'::uuid, '[{"name":"Nunzio Quaranta","role":"Analyst"}]'::jsonb),
  ('43f96719-3294-40c6-aad9-e8fe571f9a4e'::uuid, '[{"name":"Vito Antonio Amatulli","role":"Research"},{"name":"Antongiulio Frattasio","role":"Risk Management"}]'::jsonb),
  ('ba6970c9-930a-400e-b744-8c981d621552'::uuid, '[{"name":"Antonia Cicala","role":"Portfolio Analyst"},{"name":"Andrea Sala","role":"Portfolio Analyst"}]'::jsonb),
  ('1815768c-41e7-4e6b-882f-d72acc135042'::uuid, '[{"name":"Arturo Schembri","role":"President"}]'::jsonb),
  ('7e79a3f4-5cbc-4cac-bd93-c1d9504b375a'::uuid, '[{"name":"Alessandro Pisa","role":"Macro Research Analyst"}]'::jsonb),
  ('6931f226-26d5-4321-80c7-5ae210a2c009'::uuid, '[{"name":"Chiel Dupont","role":"Portfolio Analyst"}]'::jsonb),
  ('d723b1ac-4cfa-4648-ad89-d066c45c2b5f'::uuid, '[{"name":"Gianmaria Bartoccioni","role":"Analyst"},{"name":"Federico Beccari","role":"Analyst"}]'::jsonb),
  ('100a86f9-138c-4922-86ce-6aedc361f3c5'::uuid, '[{"name":"Manuel Marini","role":"Analyst"}]'::jsonb),
  ('a99047a2-4248-4c9c-a1a0-480cdb886996'::uuid, '[{"name":"Tommaso Beverina","role":"Co-Head of Markets and Alternatives"}]'::jsonb),
  ('4d08afd5-32dd-45c7-92bd-37d03f18b2e3'::uuid, '[{"name":"Daniele Tana","role":"Markets and Alternatives Analyst"},{"name":"Maria Vittoria Scino","role":"Markets and Alternatives Analyst"}]'::jsonb),
  ('e73bd72a-7fdb-4154-b499-cb2a496ec070'::uuid, '[{"name":"Daniel-Nicolae Paraschiv","role":"Analyst"},{"name":"Emanuele Licari","role":"Analyst"}]'::jsonb),
  ('9d3d6356-1f14-4199-b9f1-8bc390f2605f'::uuid, '[{"name":"Gabriele Maggio","role":"Head of Markets and Alternatives"}]'::jsonb),
  ('b7fb9703-c6ff-4c33-af09-5190cfa5b482'::uuid, '[{"name":"Vito Antonio Amatulli","role":"Analyst"},{"name":"Gianluca Luigi Segreto","role":"Analyst"}]'::jsonb),
  ('9f49e913-1ccd-48ee-8c2c-981b099fe680'::uuid, '[{"name":"Thinh Nguyen","role":"Analyst"},{"name":"Vincenzo Montilli","role":"Analyst"}]'::jsonb),
  ('1e662e51-0032-42e0-b3d5-73e51ea8894d'::uuid, '[{"name":"Gabriele Cecchi","role":"Portfolio Manager"},{"name":"Riccardo Ghirlandi","role":"Portfolio Analyst"},{"name":"Andrea Taglietti","role":"Portfolio Analyst"},{"name":"Alessandro Patrizi","role":"Head of Asset Management"},{"name":"Icaro Baraglia","role":"Head of Portfolio Management"}]'::jsonb),
  ('a0eb3471-51e2-41a2-80f8-cc34c2f57f5d'::uuid, '[{"name":"Chiel Dupont","role":"Portfolio Manager"},{"name":"Andrea Sala","role":"Portfolio Manager"},{"name":"Francesco Baiano","role":"Portfolio Analyst"},{"name":"Mirko Battini","role":"Portfolio Analyst"},{"name":"Daniel de Bruijn","role":"Portfolio Analyst"},{"name":"Antonia Cicala","role":"Portfolio Analyst"},{"name":"Maria D’Amato","role":"Portfolio Analyst"},{"name":"Giacomo Mander","role":"Portfolio Analyst"},{"name":"Giovanni Marcato","role":"Portfolio Analyst"},{"name":"Lorenzo Mirone","role":"Portfolio Analyst"},{"name":"Claudio Napoli","role":"Portfolio Analyst"},{"name":"Raffaele Zhu","role":"Portfolio Analyst"},{"name":"Alessandro Patrizi","role":"Head of Asset Management"},{"name":"Icaro Baraglia","role":"Head of Portfolio Management"}]'::jsonb),
  ('e700be29-cc07-4fd3-8d6c-946e5b1e0397'::uuid, '[{"name":"Damiano Campini","role":"Portfolio Manager"},{"name":"Edoardo Cordero","role":"Portfolio Manager"},{"name":"Vicente Capoulas","role":"Portfolio Analyst"},{"name":"Eleonora Di Veroli","role":"Portfolio Analyst"},{"name":"Marco Manzo Margiotta","role":"Portfolio Analyst"},{"name":"Alessandro Patrizi","role":"Head of Asset Management"},{"name":"Icaro Baraglia","role":"Head of Portfolio Management"}]'::jsonb),
  ('f0c1b169-0528-4487-a70a-bc1f8f0e56f9'::uuid, '[{"name":"Andrea Maccarrone","role":"Risk Analyst"}]'::jsonb),
  ('98e3fa69-0d35-4b05-96d0-a1eb81d3254d'::uuid, '[{"name":"Gianmaria Bartoccioni","role":"Analyst"},{"name":"Federico Nada","role":"Analyst"}]'::jsonb),
  ('ab7eb81c-6055-4fd9-b0ac-e4be56a0c463'::uuid, '[{"name":"Riccardo Ghirlandi","role":"Portfolio Analyst"}]'::jsonb),
  ('ecae2cd2-6b13-4961-bd26-404e631449cf'::uuid, '[{"name":"Miquel Lluesma","role":"Analyst"}]'::jsonb),
  ('7c8a49d7-2980-4c46-ab0a-e572abd1bec8'::uuid, '[{"name":"Maria D’Amato","role":"Portfolio Analyst"}]'::jsonb),
  ('888c4c08-7a11-48d6-88ee-930af71b951e'::uuid, '[{"name":"Edoardo Ferri","role":"Analyst"},{"name":"Andrea Brangi","role":"Analyst"}]'::jsonb),
  ('d2297a2a-2d80-4bb9-9202-b215132b9300'::uuid, '[{"name":"Jacopo Signorelli","role":"Macro Research"}]'::jsonb),
  ('222979eb-9a3c-44dc-9447-eaad3d8df261'::uuid, '[{"name":"Kashish Bhatia","role":"Lead Analyst"},{"name":"Federico Nada","role":"Analyst"},{"name":"Manuel Marini","role":"Analyst"},{"name":"Gianluca Luigi Segreto","role":"Analyst"},{"name":"Vincenzo Montilli","role":"Analyst"}]'::jsonb),
  ('66faf060-ee60-4025-98f0-b76db322f2f3'::uuid, '[{"name":"Gabriele Presti","role":"Lead Analyst"},{"name":"Matteo Pellandino","role":"Analyst"},{"name":"Emanuele Licari","role":"Analyst"},{"name":"Miquel Lluesma","role":"Analyst"}]'::jsonb),
  ('b012a884-4569-4d69-8d28-d2805fde05e2'::uuid, '[{"name":"Edoardo Cordero","role":"Portfolio Manager"},{"name":"Tobia Boselli","role":"Portfolio Analyst"},{"name":"Raffaele De Cicco","role":"Portfolio Analyst"},{"name":"Marco Manzo Margiotta","role":"Portfolio Analyst"},{"name":"Matteo Turri","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Icaro Baraglia","role":"Head of Asset Management"}]'::jsonb),
  ('13624abe-acb1-4393-b976-1148cffa556b'::uuid, '[{"name":"Damiano Campini","role":"Head of Markets and Alternatives"},{"name":"Dionysia Balafa","role":"Analyst"},{"name":"Maria Carla Cartone","role":"Analyst"},{"name":"Lorenzo Spiga","role":"Analyst"},{"name":"Marco Uggeri","role":"Analyst"},{"name":"Arturo Schembri","role":"President"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('8adfb3e4-15f3-443a-803d-3ab0eab42b89'::uuid, '[{"name":"Maria D’Amato","role":"Portfolio Manager"},{"name":"Eleonora Di Veroli","role":"Portfolio Analyst"},{"name":"Marco Gortan","role":"Portfolio Analyst"},{"name":"Andrea Taglietti","role":"Portfolio Analyst"},{"name":"Roberto Rainone","role":"Portfolio Analyst"},{"name":"Julia Garcia-Pelayo","role":"Portfolio Analyst"},{"name":"Icaro Baraglia","role":"Head of Asset Management"},{"name":"Edoardo Cordero","role":"Head of Portfolio Management"}]'::jsonb),
  ('88f8221e-5e47-4a91-8a35-6b8b051d24c6'::uuid, '[{"name":"Adnane Zehnine","role":"Lead Analyst"},{"name":"Daniele Cutini","role":"Analyst"},{"name":"Edoardo Ferri","role":"Analyst"},{"name":"Matteo Pellandino","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('7fb40623-f85d-41fd-9cb9-1bfce08aeeb5'::uuid, '[{"name":"Jacopo Signorelli","role":"Head of Macro Research"},{"name":"Tommaso Beverina","role":"Head of Research Area"},{"name":"Anastasia Chyzheuskaya","role":"Macro Research Analyst"},{"name":"Lara Deniz","role":"Macro Research Analyst"},{"name":"Brunon Magolewski","role":"Macro Research Analyst"},{"name":"Pietro Bologna","role":"Macro Research Analyst"},{"name":"Pietro Cucinotta","role":"Macro Research Analyst"},{"name":"Remogiulio Cavuto","role":"Macro Research Analyst"},{"name":"Riccardo Frangi","role":"Macro Research Analyst"}]'::jsonb),
  ('4a748001-332b-4ab2-a1a5-2f7538e41fd3'::uuid, '[{"name":"Çisem Almalı","role":"Analyst"},{"name":"Federico Nada","role":"Analyst"},{"name":"Enrico Conforto","role":"Analyst"},{"name":"Dario Scordamaglia","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('6e085e12-c756-486d-8db0-dbca28dfbbc2'::uuid, '[{"name":"Francesco Baiano","role":"Portfolio Manager"},{"name":"Daniel de Bruijn","role":"Portfolio Analyst"},{"name":"Vicente Capoulas","role":"Portfolio Analyst"},{"name":"Diego Castoldi","role":"Portfolio Analyst"},{"name":"Antonia Cicala","role":"Portfolio Analyst"},{"name":"Rodrigo Duarte Silva","role":"Portfolio Analyst"},{"name":"Lorenzo Vitileia","role":"Portfolio Analyst"},{"name":"Icaro Baraglia","role":"Head of Asset Management"},{"name":"Edoardo Cordero","role":"Head of Portfolio Management"}]'::jsonb),
  ('9ced3d07-13cb-4f72-b472-85c51085b8af'::uuid, '[{"name":"Andrea Brangi","role":"Analyst"},{"name":"Luciano Valerio","role":"Analyst"},{"name":"Victoria Di Vito","role":"Analyst"},{"name":"Vincenzo Montilli","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('78a93249-dbeb-4af2-8608-adee7d06d40c'::uuid, '[{"name":"Emanuele Licari","role":"Analyst"},{"name":"Manuel Marini","role":"Analyst"},{"name":"Gabriele Presti","role":"Analyst"},{"name":"Thinh Nguyen","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('f35871fc-6393-407c-ac38-c4f2f19433b5'::uuid, '[{"name":"Icaro Baraglia","role":"Head of Asset Management"}]'::jsonb),
  ('69829d05-949f-4fe6-ae91-b59be30a7eff'::uuid, '[{"name":"Tobia Boselli","role":"Portfolio Analyst"},{"name":"Matteo Turri","role":"Portfolio Analyst"}]'::jsonb),
  ('49e4ce56-e40b-4a35-89f1-eb253972fdc0'::uuid, '[{"name":"Mohammad Pourmohammadi","role":"Risk Analyst"}]'::jsonb),
  ('7124247a-27c1-4427-9842-9a921521fbb2'::uuid, '[{"name":"Dario Scordamaglia","role":"Analyst"},{"name":"Luciano Valerio","role":"Analyst"}]'::jsonb),
  ('b862b733-4da7-45fc-963a-6369d553faae'::uuid, '[{"name":"Ilaria Caponi","role":"Portfolio Analyst"},{"name":"Edoardo Toneatti","role":"Portfolio Analyst"}]'::jsonb),
  ('53438b62-e1cd-4675-b36b-44623aefbf93'::uuid, '[{"name":"Marco Uggeri","role":"Head of Markets and Alternatives Research"},{"name":"Denis Aktas","role":"Markets and Alternatives Research Analyst"},{"name":"Dionysia Balafa","role":"Markets and Alternatives Research Analyst"},{"name":"Lorenzo Spiga","role":"Markets and Alternatives Research Analyst"},{"name":"Pietro Cucinotta","role":"Macro Research Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('d7c6a49a-617f-4d18-8af8-f41a985d40cd'::uuid, '[{"name":"Enrico Conforto","role":"Analyst"},{"name":"Edoardo Ferri","role":"Analyst"},{"name":"Andrea Brangi","role":"Analyst"},{"name":"Luciano Valerio","role":"Analyst"},{"name":"Victoria Di Vito","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('4b1b16a0-56d6-46a7-8ed2-311fa499a652'::uuid, '[{"name":"Raffaele De Cicco","role":"Portfolio Manager"},{"name":"Marco Manzo Margiotta","role":"Portfolio Analyst"},{"name":"Giorgio Profeta","role":"Portfolio Analyst"},{"name":"Edoardo Toneatti","role":"Portfolio Analyst"},{"name":"Julia Garcia-Pelayo","role":"Portfolio Analyst"},{"name":"Edoardo Pelli","role":"Portfolio Analyst"},{"name":"Rodrigo Duarte Silva","role":"Portfolio Analyst"},{"name":"Edoardo Cordero","role":"Head of Asset Management"},{"name":"Maria D’Amato","role":"Head of Portfolio Management"}]'::jsonb),
  ('8d7dfbf7-42a1-448f-bca1-58314af85d26'::uuid, '[{"name":"Çisem Almalı","role":"Analyst"},{"name":"Emanuele Licari","role":"Analyst"},{"name":"Matteo Pellandino","role":"Analyst"},{"name":"Dario Scordamaglia","role":"Analyst"},{"name":"Luigi Tamburini","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('18b0c783-9a32-4e6a-8265-521afd05a9ef'::uuid, '[{"name":"Jacopo Signorelli","role":"Head of Macro Research"},{"name":"Tommaso Beverina","role":"Head of Research Area"},{"name":"Anastasia Chyzheuskaya","role":"Macro Research Analyst"},{"name":"Bianca Giovetti","role":"Macro Research Analyst"},{"name":"Marta Leva","role":"Macro Research Analyst"},{"name":"Lara Deniz","role":"Macro Research Analyst"},{"name":"Brunon Magolewski","role":"Macro Research Analyst"},{"name":"Pietro Cucinotta","role":"Macro Research Analyst"}]'::jsonb),
  ('fcb8caa1-e4db-43fe-8e13-fdb44583aeac'::uuid, '[{"name":"Maria D’Amato","role":"Portfolio Manager"},{"name":"Eleonora Di Veroli","role":"Portfolio Analyst"},{"name":"Marco Gortan","role":"Portfolio Analyst"},{"name":"Andrea Taglietti","role":"Portfolio Analyst"},{"name":"Roberto Rainone","role":"Portfolio Analyst"},{"name":"Julia Garcia-Pelayo","role":"Portfolio Analyst"},{"name":"Icaro Baraglia","role":"Head of Asset Management"},{"name":"Edoardo Cordero","role":"Head of Portfolio Management"}]'::jsonb),
  ('6892d852-d6d5-4901-9ca1-2b63f085c778'::uuid, '[{"name":"Thinh Nguyen","role":"Analyst"},{"name":"Maksim Stamenkovic","role":"Analyst"},{"name":"Erika Song","role":"Analyst"},{"name":"Niccolò Bragaglia","role":"Analyst"},{"name":"Gabriele Presti","role":"Analyst"},{"name":"Gianmaria Bartoccioni","role":"Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('487d2d16-2351-4fa3-b2c7-1b7d36747cde'::uuid, '[{"name":"Marco Gortan","role":"Portfolio Manager"},{"name":"Antonia Cicala","role":"Portfolio Analyst"},{"name":"Luca Giorgianni","role":"Portfolio Analyst"},{"name":"Saumya Das","role":"Portfolio Analyst"},{"name":"Matteo Turri","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Edoardo Cordero","role":"Head of Asset Management"},{"name":"Maria D’Amato","role":"Head of Portfolio Management"}]'::jsonb),
  ('aabc8bf5-a5b6-408b-95fd-6d287718c0b4'::uuid, '[{"name":"Giorgio Profeta","role":"Portfolio Manager"},{"name":"Luca Giorgianni","role":"Portfolio Analyst"},{"name":"Matteo Consalvo","role":"Portfolio Analyst"},{"name":"Heeseong Jeong","role":"Portfolio Analyst"},{"name":"Andrei Tudoroiu","role":"Portfolio Analyst"},{"name":"Saumya Das","role":"Portfolio Analyst"},{"name":"Marco Gortan","role":"Head of Asset Management"},{"name":"Raffaele De Cicco","role":"Head of Portfolio Management"}]'::jsonb),
  ('11fa04ec-e610-403a-96cb-3bec63f62782'::uuid, '[{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Cisem Almali","role":"Research Analyst"},{"name":"Deniz Aktas","role":"Research Analyst"},{"name":"Huiying Song","role":"Research Analyst"},{"name":"Jacopo Prevedello","role":"Research Analyst"},{"name":"Thomas Ferradini","role":"Research Analyst"}]'::jsonb),
  ('a83d798e-aeb4-4d9e-8170-322f64d690d3'::uuid, '[{"name":"Marco Uggeri","role":"Head of Markets and Alternatives Research"},{"name":"Dionysia Balafa","role":"Markets and Alternatives Research Analyst"},{"name":"Antonio Messina","role":"Markets and Alternatives Research Analyst"},{"name":"Matteo Negrini","role":"Markets and Alternatives Research Analyst"},{"name":"Tommaso Beverina","role":"Head of Research Area"}]'::jsonb),
  ('a726533f-e564-4822-a286-ce7876253c62'::uuid, '[{"name":"Dario Scordamaglia","role":"Lead Analyst"},{"name":"Luigi Tamburini","role":"Analyst"},{"name":"Maurizio De Nisi","role":"Analyst"},{"name":"Luca Nicola Introna","role":"Analyst"},{"name":"Luigi Savarese","role":"Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"}]'::jsonb),
  ('7f35793a-d1f2-4a1b-a1f9-8767e5889b28'::uuid, '[{"name":"Pietro Cucinotta","role":"Head of Macro Research"},{"name":"Tommaso Beverina","role":"Head of Research Area"},{"name":"Ada Egilmez","role":"Macro Research Analyst"},{"name":"Michele Tremolada","role":"Macro Research Analyst"},{"name":"Xuan Liu","role":"Macro Research Analyst"},{"name":"Brunon Magolewski","role":"Macro Research Analyst"},{"name":"Lara Deniz","role":"Macro Research Analyst"}]'::jsonb),
  ('9be0199a-6506-4173-9ba9-9967cbe4b07c'::uuid, '[{"name":"Luciano Valerio","role":"Analyst"},{"name":"Stefano Didone","role":"Analyst"},{"name":"Tommaso Nocchi","role":"Analyst"},{"name":"Daniele Stoia","role":"Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"}]'::jsonb),
  ('1361f057-7c54-405b-a94a-943fc5053688'::uuid, '[{"name":"Matteo Turri","role":"Portfolio Manager"},{"name":"Julia Garcia-Pelayo","role":"Portfolio Analyst"},{"name":"Matteo Pellandino","role":"Portfolio Analyst"},{"name":"Francesco Sorbone","role":"Portfolio Analyst"},{"name":"Edoardo Toneatti","role":"Portfolio Analyst"},{"name":"Lorenzo Vitileia","role":"Portfolio Analyst"},{"name":"Marco Gortan","role":"Head of Asset Management"},{"name":"Raffaele De Cicco","role":"Head of Portfolio Management"}]'::jsonb),
  ('6e4846c3-ef13-47ae-afc4-265cf0e099e5'::uuid, '[{"name":"Daniele Cutini","role":"Portfolio Manager"},{"name":"Tobia Boselli","role":"Portfolio Analyst"},{"name":"Diego Castoldi","role":"Portfolio Analyst"},{"name":"Rodrigo Duarte Silva","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Marco Gortan","role":"Head of Asset Management"},{"name":"Raffaele De Cicco","role":"Head of Portfolio Management"}]'::jsonb),
  ('e27efed9-6bf5-4ae9-a5d2-5275333b9493'::uuid, '[{"name":"Emanuele Licari","role":"Lead Analyst"},{"name":"Fabio Iacobucci","role":"Analyst"},{"name":"Baptiste Soulhol","role":"Analyst"},{"name":"Maksim Stamenkovic","role":"Analyst"},{"name":"Alessandro Bontempi","role":"Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"}]'::jsonb),
  ('52822ec1-37b5-4170-b58b-c60d6286b8b7'::uuid, '[{"name":"Luigi Tamburini","role":"Analyst"},{"name":"Luca Nicola Introna","role":"Analyst"},{"name":"Lorenzo De Felice","role":"Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Alessandro Bontempi","role":"Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"}]'::jsonb),
  ('b6bfaf51-089d-4633-b177-31bf941830cc'::uuid, '[{"name":"Luciano Valerio","role":"Analyst"},{"name":"Dario Scordamaglia","role":"Analyst"},{"name":"Andreas Bengtsson","role":"Analyst"},{"name":"Amadis Cleva","role":"Analyst"},{"name":"Maksim Stamenkovic","role":"Analyst"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"},{"name":"Tommaso Beverina","role":"Head of Research"}]'::jsonb),
  ('a7ad3901-5752-4e92-beea-e9b00509e1b8'::uuid, '[{"name":"Tobia Boselli","role":"Portfolio Manager"},{"name":"Federico Schizzi","role":"Portfolio Analyst"},{"name":"Heeseong Jeong","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Portfolio Analyst"},{"name":"Lorenzo Vitileia","role":"Portfolio Analyst"},{"name":"Matteo Consalvo","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Matteo Turri","role":"Head of Portfolio Management"}]'::jsonb),
  ('d1fec7f7-487c-4d01-9eb0-e63c9a163330'::uuid, '[{"name":"Emanuele Licari","role":"Lead Analyst"},{"name":"Luigi Savarese","role":"Analyst"},{"name":"Andrea Beretta","role":"Analyst"},{"name":"Luca Paris","role":"Analyst"},{"name":"Maurizio De Nisi","role":"Analyst"},{"name":"Tommaso Beverina","role":"Head of Research"},{"name":"Andrea Brangi","role":"Head of Equity Research"},{"name":"Enrico Conforto","role":"Co-Head of Equity Research"}]'::jsonb),
  ('3ff21dc3-9107-40ca-a0bc-91498c03f971'::uuid, '[{"name":"Pietro Cucinotta","role":"Head of Macro Research"},{"name":"Tommaso Beverina","role":"Head of Research Area"},{"name":"Ada Egilmez","role":"Macro Research Analyst"},{"name":"Michele Tremolada","role":"Macro Research Analyst"},{"name":"Xuan Liu","role":"Macro Research Analyst"},{"name":"Brunon Magolewski","role":"Macro Research Analyst"},{"name":"Alessandro Archetti","role":"Macro Research Analyst"},{"name":"Luca Vezzani","role":"Macro Research Analyst"},{"name":"Maho Yoneda","role":"Macro Research Analyst"},{"name":"Gabriele Pujatti","role":"Macro Research Analyst"}]'::jsonb),
  ('89f4d340-9812-4c3b-8139-b8c0446c87c3'::uuid, '[{"name":"Rodrigo Duarte Silva","role":"Portfolio Manager"},{"name":"Giorgio Profeta","role":"Senior Portfolio Analyst"},{"name":"Carmine Troilo","role":"Portfolio Analyst"},{"name":"Julia Garcia-Pelayo","role":"Portfolio Analyst"},{"name":"Francesco Sorbone","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Matteo Pellandino","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Matteo Turri","role":"Head of Portfolio Management"}]'::jsonb),
  ('5bb37d63-af47-4a14-9ba7-e8b9fe0b2f4b'::uuid, '[{"name":"Diego Castoldi","role":"Portfolio Manager"},{"name":"Federico Tita","role":"Portfolio Analyst"},{"name":"Martina Perrone","role":"Portfolio Analyst"},{"name":"Mattia Cosimo","role":"Portfolio Analyst"},{"name":"Gianluca Caffi","role":"Portfolio Analyst"},{"name":"Andrei Tudoroiu","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Matteo Turri","role":"Head of Portfolio Management"}]'::jsonb),
  ('9713a210-f06f-45ae-88e7-df30dd6a0162'::uuid, '[{"name":"Andreas Bengtsson","role":"Analyst"},{"name":"Vincent de Naurois","role":"Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Luciano Valerio","role":"Analyst"},{"name":"Emanuele Licari","role":"Head of Research"},{"name":"Luigi Tamburini","role":"Head of Equity Research"},{"name":"Dario Scordamaglia","role":"Co-Head of Equity Research"}]'::jsonb),
  ('797ca4cc-637a-4775-a4c0-15bcfd73e71d'::uuid, '[{"name":"Alessandro Archetti","role":"Head of Macro Research"},{"name":"Emanuele Licari","role":"Head of Research Area"},{"name":"Francesco Casapenta","role":"Macro Research Analyst"},{"name":"Giacomo de Michieli","role":"Macro Research Analyst"},{"name":"Ada Egilmez","role":"Macro Research Analyst"},{"name":"Basar Gokberk Inan","role":"Macro Research Analyst"},{"name":"Gabriele Pujatti","role":"Macro Research Analyst"},{"name":"Riccardo Mirarchi","role":"Macro Research Analyst"},{"name":"Michele Tremolada","role":"Macro Research Analyst"},{"name":"Maho Yoneda","role":"Macro Research Analyst"},{"name":"Luca Vezzani","role":"Macro Research Analyst"}]'::jsonb),
  ('9ccf3c1b-b80f-45f8-82d0-f48384250757'::uuid, '[{"name":"Francesco Sorbone","role":"Portfolio Manager"},{"name":"Federico Schizzi","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Portfolio Analyst"},{"name":"Marco Neri","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Michele Zanirato","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Tobia Boselli","role":"Head of Portfolio Management"}]'::jsonb),
  ('de386055-55e6-4fd8-8fc5-1a8facdf4beb'::uuid, '[{"name":"Luigi Savarese","role":"Lead Analyst"},{"name":"Alessandro Bontempi","role":"Analyst"},{"name":"Andrea Beretta","role":"Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Fabio Iacobucci","role":"Analyst"},{"name":"Emanuele Licari","role":"Head of Research"},{"name":"Luigi Tamburini","role":"Head of Equity Research"},{"name":"Dario Scordamaglia","role":"Co-Head of Equity Research"}]'::jsonb),
  ('672ee5ff-a70f-4349-88e6-0f7888c52e0d'::uuid, '[{"name":"Akshit Seth","role":"Equity Research Analyst"},{"name":"Luca Paris","role":"Equity Research Analyst"},{"name":"David Kurfüst","role":"Senior Editor M&A and PE, SGFER"},{"name":"Nicolas Riedmüller","role":"Editor M&A and PE, SGFER"},{"name":"Wikram Chowdhury","role":"Senior Editor M&A and PE, SGFER"},{"name":"Federico Gabriel Mejia Enriquez","role":"Co-Head of M&A and PE, SGFER"},{"name":"Luigi Savarese","role":"Head of Equity Research"}]'::jsonb),
  ('b90d7282-a8c2-4d57-b816-1f48ac2b9e75'::uuid, '[{"name":"Antonio Messina","role":"Head of Markets and Alternatives Research"},{"name":"Matteo Negrini","role":"Markets and Alternatives Research Analyst"},{"name":"Bartu Şen","role":"Markets and Alternatives Research Analyst"},{"name":"Edoardo Calleri di Sala","role":"Markets and Alternatives Research Analyst"},{"name":"Angelo Perri","role":"Markets and Alternatives Research Analyst"},{"name":"Deniz Aktas","role":"Markets and Alternatives Research Analyst"},{"name":"Emanuele Licari","role":"Head of Research Area"}]'::jsonb),
  ('ee8fd27e-8b8d-4e49-8f98-a2ca4bfe6d3e'::uuid, '[{"name":"Dan-Arthur Coseru","role":"Lead Analyst"},{"name":"Elisabetta Fabris","role":"Analyst"},{"name":"Pierpaolo Cuglietta","role":"Analyst"},{"name":"Amadis Cleva","role":"Analyst"},{"name":"Daniele Stoia","role":"Analyst"},{"name":"Emanuele Licari","role":"Head of Research"},{"name":"Luigi Tamburini","role":"Head of Equity Research"},{"name":"Dario Scordamaglia","role":"Co-Head of Equity Research"}]'::jsonb),
  ('1561e5f5-02b6-466c-ab97-467a50686c7f'::uuid, '[{"name":"Davide Giuliano","role":"Portfolio Manager"},{"name":"Lorenzo De Felice","role":"Senior Portfolio Analyst"},{"name":"Luca Delorenzi","role":"Portfolio Analyst"},{"name":"Martina Perrone","role":"Portfolio Analyst"},{"name":"Federico Tita","role":"Portfolio Analyst"},{"name":"Andrei Tudoroiu","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Tobia Boselli","role":"Head of Portfolio Management"}]'::jsonb),
  ('3ebd19cc-59f8-4bf5-9cb4-f5387c8e8bee'::uuid, '[{"name":"Gianluca Caffi","role":"Portfolio Manager"},{"name":"David Permutti","role":"Portfolio Analyst"},{"name":"Heeseong Jeong","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Portfolio Analyst"},{"name":"Edoardo Pelli","role":"Portfolio Analyst"},{"name":"Daniele Cutini","role":"Head of Asset Management"},{"name":"Tobia Boselli","role":"Head of Portfolio Management"}]'::jsonb),
  ('2af53c0f-22db-44f9-9cf6-8f4f50d1e4a3'::uuid, '[{"name":"Lorenzo De Felice","role":"Head of Investment Research, Fixed Income Strategist"},{"name":"Marco Neri","role":"Fixed Income Strategist"},{"name":"Fabio Iacobucci","role":"Fixed Income Strategist"},{"name":"Maddalena Salterini","role":"Equity Strategist"},{"name":"Bartu Şen","role":"Equity Strategist"},{"name":"Luca Natalucci","role":"Equity Strategist"},{"name":"Angelo Truono","role":"FX & Commodities Strategist"},{"name":"Giorgio Gusella","role":"FX & Commodities Strategist"}]'::jsonb),
  ('ff83aa84-25f1-4088-98ad-34a3f7ccdd6c'::uuid, '[{"name":"Vincent de Naurois","role":"Analyst"},{"name":"Andrea Barra","role":"Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('16b8c463-50e1-40cf-aac7-1ad17b1f20e7'::uuid, '[{"name":"Pierpaolo Cuglietta","role":"Lead Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Francesco Maria Nardinocchi","role":"Analyst"},{"name":"Andrea Barra","role":"Analyst"},{"name":"Matteo Tozzini","role":"Analyst"},{"name":"Luca Nicola Introna","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('7e73d669-0e2e-44ef-a322-737f2b8497a8'::uuid, '[{"name":"Dan-Arthur Coseru","role":"Lead Analyst"},{"name":"Vincent de Naurois","role":"Analyst"},{"name":"Elisabetta Fabris","role":"Analyst"},{"name":"Margherita Bonelli","role":"Analyst"},{"name":"Riccardo D’Agata","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('be2e220d-f247-40b6-98f1-97e8433160da'::uuid, '[{"name":"Matteo Consalvo","role":"Portfolio Manager"},{"name":"Pietro Cordero","role":"Portfolio Analyst"},{"name":"David Overbeck","role":"Portfolio Analyst"},{"name":"Alberto Pavanello","role":"Portfolio Analyst"},{"name":"Matilde Zampa","role":"Portfolio Analyst"},{"name":"Davide Giuliano","role":"Head of Asset Management"},{"name":"Gianluca Caffi","role":"Head of Portfolio Management"}]'::jsonb),
  ('696aa65b-a26a-4c5c-9eb7-0e728e045b1e'::uuid, '[{"name":"Francesco Sorbone","role":"Portfolio Manager"},{"name":"Caterina Beorchia","role":"Portfolio Analyst"},{"name":"Anna Maruccio","role":"Portfolio Analyst"},{"name":"David Permutti","role":"Portfolio Analyst"},{"name":"Federico Tita","role":"Portfolio Analyst"},{"name":"Davide Giuliano","role":"Head of Asset Management"},{"name":"Gianluca Caffi","role":"Head of Portfolio Management"}]'::jsonb),
  ('6ec9c779-42a9-431b-810c-f3d617d92f29'::uuid, '[{"name":"Jacopo Prevedello","role":"Portfolio Manager"},{"name":"Lorenzo Spada","role":"Senior Portfolio Analyst"},{"name":"Daniele Biondi","role":"Portfolio Analyst"},{"name":"Luca Delorenzi","role":"Portfolio Analyst"},{"name":"Martina Perrone","role":"Portfolio Analyst"},{"name":"Davide Giuliano","role":"Head of Asset Management"},{"name":"Gianluca Caffi","role":"Head of Portfolio Management"}]'::jsonb),
  ('790c3e3c-d3a2-4cc1-b347-66bda77c38ac'::uuid, '[{"name":"Federico Schizzi","role":"Portfolio Manager"},{"name":"Meric Cavus","role":"Portfolio Analyst"},{"name":"Andrei Tudoroiu","role":"Portfolio Analyst"},{"name":"Michele Zanirato","role":"Portfolio Analyst"},{"name":"Davide Giuliano","role":"Head of Asset Management"},{"name":"Gianluca Caffi","role":"Head of Portfolio Management"}]'::jsonb),
  ('9cf12a1d-c9ae-4b34-a223-7c2cd86182da'::uuid, '[{"name":"Luca Paris","role":"Analyst"},{"name":"Ruslana Karaman","role":"Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Alessandro Bontempi","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('8f5266ef-1aa8-489e-b647-ed986dd713f5'::uuid, '[{"name":"Dario Scordamaglia","role":"Head of Macro Research"},{"name":"Giacomo de Michieli","role":"Co-Head of Macro Research"},{"name":"Alessandro Archetti","role":"Head of Research Area"},{"name":"Alessandro Bosco","role":"Macro Research Analyst"},{"name":"Francesco Casapenta","role":"Macro Research Analyst"},{"name":"Giovanni Di Lecce","role":"Macro Research Analyst"},{"name":"Ada Egilmez","role":"Macro Research Analyst"},{"name":"Basar Gokberk Inan","role":"Macro Research Analyst"},{"name":"Luca Vezzani","role":"Macro Research Analyst"}]'::jsonb),
  ('5893b246-8eac-4d42-ace6-34cd87ed7b9f'::uuid, '[{"name":"Dario Scordamaglia","role":"Head of Macro Research"},{"name":"Giacomo de Michieli","role":"Co-Head of Macro Research"},{"name":"Alessandro Archetti","role":"Head of Research Area"},{"name":"Polina Mednikova","role":"Macro Research Analyst"},{"name":"Alessandro Pagan","role":"Macro Research Analyst"},{"name":"Riccardo Mirarchi","role":"Macro Research Analyst"},{"name":"Domenico Mancuso","role":"Macro Research Analyst"},{"name":"Michele Tremolada","role":"Macro Research Analyst"},{"name":"Edoardo Bini","role":"Macro Research Analyst"}]'::jsonb),
  ('464aa703-efb7-4b81-8127-0f63e06b5f8f'::uuid, '[{"name":"Emanuele Chiarini","role":"Head of Quantitative Research"},{"name":"Umberto Barbieri","role":"Quantitative Research Analyst"},{"name":"Marco Folonaro","role":"Quantitative Research Analyst"},{"name":"Vasileios Stavropoulos","role":"Quantitative Research Analyst"},{"name":"Francesco Zanettin","role":"Quantitative Research Analyst"}]'::jsonb),
  ('88bca519-f562-4a2c-8d34-fdb8a8a546f5'::uuid, '[{"name":"Lorenzo De Felice","role":"Head of Investment Research"},{"name":"Angelo Truono","role":"Co-Head of Investment Research"},{"name":"Marco Neri","role":"Fixed Income Strategist, Lead"},{"name":"Luca Natalucci","role":"Equities Strategist, Lead"},{"name":"Giorgio Gusella","role":"FX & Commodities Strategist, Lead"},{"name":"Giovanni Porporino","role":"Fixed Income Strategist"},{"name":"Marco Caccia","role":"Fixed Income Strategist"},{"name":"Maddalena Salterini","role":"Equities Strategist"},{"name":"Nicolas Carlone","role":"Equities Strategist"},{"name":"Bartu Şen","role":"Equities Strategist"},{"name":"Francesco Santoro","role":"FX & Commodities Strategist"},{"name":"Luigi Tamburini","role":"President"}]'::jsonb),
  ('ea39d35a-5045-4f81-a7aa-d3c8eaeb05ec'::uuid, '[]'::jsonb),
  ('5cfe0504-7406-452e-a74a-919028a20b45'::uuid, '[{"name":"Matteo Tozzini","role":"Lead Analyst"},{"name":"Ruslana Karaman","role":"Analyst"},{"name":"Alessandro Bosco","role":"Analyst"},{"name":"Andrea Barra","role":"Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('41a68b38-a74a-4908-be03-de2870c7a3c4'::uuid, '[{"name":"Francesco Maria Nardinocchi","role":"Lead Analyst"},{"name":"Andrea Pierini","role":"Analyst"},{"name":"Marco Di Marco","role":"Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Analyst"},{"name":"Alessandro Bontempi","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('4e800b72-5f99-4397-940f-561d898e048b'::uuid, '[{"name":"Giacomo de Michieli","role":"Head of Macro Research"},{"name":"Polina Mednikova","role":"Co-Head of Macro Research"},{"name":"Alessandro Archetti","role":"Head of Research Area"},{"name":"Matias Bonfanti","role":"Macro Research Analyst"},{"name":"Alessandro Bosco","role":"Macro Research Analyst"},{"name":"Francesco Casapenta","role":"Macro Research Analyst"},{"name":"Ada Egilmez","role":"Macro Research Analyst"},{"name":"Alessandro Pagan","role":"Macro Research Analyst"}]'::jsonb),
  ('ad2f8949-b10a-4532-b69b-5497055ca8e8'::uuid, '[{"name":"Lorenzo De Felice","role":"Head of Investment Research"},{"name":"Angelo Truono","role":"Co-Head of Investment Research"},{"name":"Marco Neri","role":"Fixed Income Strategist, Lead"},{"name":"Giorgio Gusella","role":"FX & Commodities Strategist, Lead"},{"name":"Luca Natalucci","role":"Equities Strategist, Lead"},{"name":"Giovanni Porporino","role":"Fixed Income Strategist"},{"name":"Marco Caccia","role":"Fixed Income Strategist"},{"name":"Francesco Santoro","role":"FX & Commodities Strategist"},{"name":"Giovanni Francescato","role":"FX & Commodities Strategist"},{"name":"Bartu Şen","role":"Equities Strategist"},{"name":"Maddalena Salterini","role":"Equities Strategist"},{"name":"Nicolas Carlone","role":"Equities Strategist"},{"name":"Zhang Pengcheng","role":"Equities Strategist"}]'::jsonb),
  ('bf11affc-8c53-4117-9b10-17cfe55e70c9'::uuid, '[{"name":"Riccardo D’Agata","role":"Lead Analyst"},{"name":"Dan-Arthur Coseru","role":"Analyst"},{"name":"Tho Anh Vu","role":"Analyst"},{"name":"Elisabetta Fabris","role":"Analyst"},{"name":"Giacomo Pietrosanti","role":"Analyst"},{"name":"Andrea Beretta","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Tommaso Nocchi","role":"Co-Head of Equity Research"}]'::jsonb),
  ('8d6399da-2b51-4f65-a610-18772ac16700'::uuid, '[{"name":"David Overbeck","role":"Portfolio Manager"},{"name":"Michele Rinaldi","role":"Portfolio Analyst"},{"name":"Anna Maruccio","role":"Portfolio Analyst"},{"name":"Erik Vik","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Head of Asset Management"},{"name":"Matteo Consalvo","role":"Head of Portfolio Management"}]'::jsonb),
  ('dd6e2b8c-c3e3-4b83-b0db-6b9ae25412ac'::uuid, '[{"name":"Alberto Pavanello","role":"Portfolio Manager"},{"name":"David Permutti","role":"Portfolio Analyst"},{"name":"Edoardo Bini","role":"Portfolio Analyst"},{"name":"Pietro Tracanzan","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Head of Asset Management"},{"name":"Matteo Consalvo","role":"Head of Portfolio Management"}]'::jsonb),
  ('9103e50f-58de-4713-b623-8ad4946f3ea2'::uuid, '[{"name":"Caterina Beorchia","role":"Portfolio Manager"},{"name":"Daniele Biondi","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Portfolio Analyst"},{"name":"Vittorio Garavelli","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Head of Asset Management"},{"name":"Matteo Consalvo","role":"Head of Portfolio Management"}]'::jsonb),
  ('7809c793-5c11-4931-8dbf-62260c693150'::uuid, '[{"name":"Francesco Sorbone","role":"Portfolio Manager"},{"name":"Giuseppe Palermo","role":"Portfolio Analyst"},{"name":"Federico Tita","role":"Portfolio Analyst"},{"name":"Luca Delorenzi","role":"Portfolio Analyst"},{"name":"Jacopo Prevedello","role":"Head of Asset Management"},{"name":"Matteo Consalvo","role":"Head of Portfolio Management"}]'::jsonb),
  ('7311e235-1ccd-4221-b454-04cd5555114c'::uuid, '[{"name":"Giacomo de Michieli","role":"Head of Macro Research"},{"name":"Polina Mednikova","role":"Co-Head of Macro Research"},{"name":"Alessandro Archetti","role":"Head of Research Area"},{"name":"Michele Tremolada","role":"Macro Research Analyst"},{"name":"Marina Zhilina","role":"Macro Research Analyst"},{"name":"Giovanni Di Lecce","role":"Macro Research Analyst"},{"name":"Giulia Faro","role":"Macro Research Analyst"},{"name":"Riccardo Mirarchi","role":"Macro Research Analyst"},{"name":"Giovanni Biasiucci","role":"Macro Research Analyst"},{"name":"Basar Gokberk Inan","role":"Macro Research Analyst"}]'::jsonb),
  ('9b3b9c98-76b8-45b7-a101-66ab8017c3e7'::uuid, '[{"name":"Umberto Barbieri","role":"Head of Quantitative Research"},{"name":"Antonio Petrai","role":"Quantitative Research Analyst"},{"name":"Enrico Sammarco","role":"Quantitative Research Analyst"},{"name":"Erik Vik","role":"Quantitative Research Analyst"}]'::jsonb),
  ('79fbe814-57ec-4c3e-bb39-20654bc9fb9e'::uuid, '[{"name":"Marco Neri","role":"Head of Investment Research"},{"name":"Angelo Truono","role":"Co-Head of Investment Research"},{"name":"Giovanni Porporino","role":"Fixed Income Strategist, Lead"},{"name":"Marco Caccia","role":"FX & Commodities Strategist, Lead"},{"name":"Nicolas Carlone","role":"Equities Strategist, Lead"},{"name":"Lorenzo De Felice","role":"Fixed Income Strategist"},{"name":"Giuseppe Provenzano","role":"Fixed Income Strategist"},{"name":"Giovanni Francescato","role":"Fixed Income Strategist"},{"name":"Alessandro Palasciano","role":"FX & Commodities Strategist"},{"name":"Bartu Şen","role":"FX & Commodities Strategist"},{"name":"Massimo Biavardi","role":"FX & Commodities Strategist"},{"name":"Elia Marenco","role":"Equities Strategist"},{"name":"Zhang Pengcheng","role":"Equities Strategist"},{"name":"Lukas Louhiluoto","role":"Equities Strategist"}]'::jsonb),
  ('fbc137c2-6f7e-40d5-a2bb-dd88c0c9c2ba'::uuid, '[{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Andrea Pierini","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Dan-Arthur Coseru","role":"Co-Head of Equity Research"}]'::jsonb),
  ('3e853e7a-6142-4ba5-9d45-ef9e3810dc63'::uuid, '[{"name":"Pierpaolo Cuglietta","role":"Lead Analyst"},{"name":"Marco Di Marco","role":"Analyst"},{"name":"Tho Anh Vu","role":"Analyst"},{"name":"Giacomo Pietrosanti","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Dan-Arthur Coseru","role":"Co-Head of Equity Research"}]'::jsonb),
  ('44b1fe9b-efe5-45ff-aa11-03f96f707102'::uuid, '[{"name":"Andrea Barra","role":"Lead Analyst"},{"name":"Lorenzo Lucicesare","role":"Analyst"},{"name":"Salma El Hamdi","role":"Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Stelian Cujba","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Dan-Arthur Coseru","role":"Co-Head of Equity Research"}]'::jsonb),
  ('8b606c33-b424-46ba-ab77-6ec0501b4058'::uuid, '[{"name":"Marco Neri","role":"Head of Investment Research"},{"name":"Giovanni Porporino","role":"Fixed Income Strategist, Lead"},{"name":"Marco Caccia","role":"FX & Commodities Strategist, Lead"},{"name":"Nicolas Carlone","role":"Equities Strategist, Lead"},{"name":"Lorenzo De Felice","role":"Fixed Income Strategist"},{"name":"Giuseppe Provenzano","role":"Fixed Income Strategist"},{"name":"Giovanni Francescato","role":"Fixed Income Strategist"},{"name":"Alessandro Palasciano","role":"FX & Commodities Strategist"},{"name":"Bartu Şen","role":"FX & Commodities Strategist"},{"name":"Massimo Biavardi","role":"FX & Commodities Strategist"},{"name":"Elia Marenco","role":"Equities Strategist"},{"name":"Lukas Louhiluoto","role":"Equities Strategist"}]'::jsonb),
  ('4e3453ac-8e37-4e19-9135-e83d3172cadb'::uuid, '[{"name":"Anna Maruccio","role":"Portfolio Manager"},{"name":"Luca Delorenzi","role":"Portfolio Analyst"},{"name":"Pietro Tracanzan","role":"Portfolio Analyst"},{"name":"Raman Antanovich","role":"Portfolio Analyst"},{"name":"Filippo Forzan","role":"Portfolio Analyst"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"}]'::jsonb),
  ('9c8cad88-c37b-433b-84d1-bbd37c8b0dee'::uuid, '[{"name":"Lodovico Del Re","role":"Portfolio Manager"},{"name":"Luca Riolo","role":"Portfolio Analyst"},{"name":"Giacomo Sada","role":"Portfolio Analyst"},{"name":"Elisabetta Fabris","role":"Portfolio Analyst"},{"name":"Pietro Cordero","role":"Portfolio Analyst"},{"name":"Vittorio Garavelli","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"},{"name":"Anna Maruccio","role":"Head of Portfolio Management"}]'::jsonb),
  ('e8b704e9-265d-4566-9ac1-78589e2c1f44'::uuid, '[{"name":"Erik Vik","role":"Portfolio Manager"},{"name":"Michele Rinaldi","role":"Portfolio Analyst"},{"name":"Aleksandar Georgiev","role":"Portfolio Analyst"},{"name":"Giovanni Carboniero","role":"Portfolio Analyst"},{"name":"Francesco Anastasi","role":"Portfolio Analyst"},{"name":"Vasileios Stavropoulos","role":"Portfolio Analyst"},{"name":"Antonio Petrai","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"},{"name":"Anna Maruccio","role":"Head of Portfolio Management"}]'::jsonb),
  ('65669585-202f-426a-b590-43ca77d55909'::uuid, '[{"name":"Polina Mednikova","role":"Head of Macro Research"},{"name":"Giovanni Biasiucci","role":"Macro Research Analyst"},{"name":"Giulia Faro","role":"Macro Research Analyst"},{"name":"Eloi Corman","role":"Macro Research Analyst"},{"name":"Jack Thompson","role":"Macro Research Analyst"},{"name":"Basar Gokberk Inan","role":"Macro Research Analyst"}]'::jsonb),
  ('2e11a94e-376e-4c84-bc38-efa9b2586195'::uuid, '[{"name":"Matteo Tozzini","role":"Lead Analyst"},{"name":"Andrea Pierini","role":"Analyst"},{"name":"Cosimo Jacopo Guadalupi","role":"Analyst"},{"name":"Savvina Salvaridou","role":"Analyst"},{"name":"Luigi Savarese","role":"Head of Equity Research"},{"name":"Dan-Arthur Coseru","role":"Co-Head of Equity Research"}]'::jsonb),
  ('d316a832-5dbd-44f5-be5e-9529100558b0'::uuid, '[{"name":"Vincent de Naurois","role":"Analyst"},{"name":"Tho Anh Vu","role":"Analyst"},{"name":"Andrea Pierini","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('268f2a50-7175-4de0-9d63-820fb63337e7'::uuid, '[{"name":"Marco Neri","role":"Head of Investment Research"},{"name":"Giorgio Gusella","role":"Co-Head of Investment Research"},{"name":"Giuseppe Provenzano","role":"Fixed Income Strategist, Lead"},{"name":"Marco Caccia","role":"FX & Commodities Strategist, Lead"},{"name":"Lukas Louhiluoto","role":"Equities Strategist, Lead"},{"name":"Giovanni Francescato","role":"Fixed Income Strategist"},{"name":"Elias Bouzamondo","role":"Fixed Income Strategist"},{"name":"Volodymyr Pavliv","role":"Fixed Income Strategist"},{"name":"Bartu Şen","role":"FX & Commodities Strategist"},{"name":"Lorenzo Monteduro","role":"FX & Commodities Strategist"},{"name":"Paride Lauretti","role":"FX & Commodities Strategist"},{"name":"Alessandro Palasciano","role":"Equities Strategist"},{"name":"Tom Petit","role":"Equities Strategist"},{"name":"Mylan Monteil","role":"Equities Strategist"},{"name":"Paul Chatin","role":"Equities Strategist"}]'::jsonb),
  ('bf2ee904-bdd6-4066-a96f-557e4c84bad2'::uuid, '[{"name":"Giovanni Biasiucci","role":"Head of Macro Research"},{"name":"Siddhanth Narayana Achanta","role":"Macro Research Analyst"},{"name":"Matias Bonfanti","role":"Macro Research Analyst"},{"name":"Khai Mai Cao","role":"Macro Research Analyst"},{"name":"Diego La Fontaine","role":"Macro Research Analyst"},{"name":"Alessandro Pagan","role":"Macro Research Analyst"},{"name":"Simone Vittorio Percoco","role":"Macro Research Analyst"},{"name":"Niccolò Rotondi","role":"Macro Research Analyst"},{"name":"Giuseppe Spina","role":"Macro Research Analyst"},{"name":"Jack Thompson","role":"Macro Research Analyst"}]'::jsonb),
  ('23d39ce3-1181-4464-a2d6-fdb969004a52'::uuid, '[{"name":"Federico Lazzarini","role":"Head of Quantitative Research"},{"name":"Anyi Xie","role":"Quantitative Research Analyst"}]'::jsonb),
  ('97095728-5cb9-451b-82f8-aa147295d18a'::uuid, '[{"name":"Stelian Cujba","role":"Lead Analyst"},{"name":"Alex Cuker","role":"Analyst"},{"name":"Diego Baroni","role":"Analyst"},{"name":"Giovanni Cianci","role":"Analyst"},{"name":"Marzio Bonizzi","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('af13448b-61d3-4f34-beb5-0bfb14e49cab'::uuid, '[{"name":"Federico Lazzarini","role":"Head of Quantitative Research"},{"name":"Ianina Tarca","role":"Quantitative Research Analyst"}]'::jsonb),
  ('c4b6708c-1d76-434e-ba4d-ab96b0e2000f'::uuid, '[{"name":"Federico Lazzarini","role":"Head of Quantitative Research"},{"name":"Filippo Gombac","role":"Quantitative Research Analyst"}]'::jsonb),
  ('668dc8ba-fde5-48e1-a3ef-b8a584304eda'::uuid, '[{"name":"Giovanni Biasiucci","role":"Head of Macro Research"},{"name":"Francesco Casapenta","role":"Macro Research Analyst"},{"name":"Marco Catoni","role":"Macro Research Analyst"},{"name":"Eloi Corman","role":"Macro Research Analyst"},{"name":"Ralph Hermans","role":"Macro Research Analyst"},{"name":"Sophia C. Froehlich","role":"Macro Research Analyst"},{"name":"Maria Liova","role":"Macro Research Analyst"},{"name":"Riccardo Mirarchi","role":"Macro Research Analyst"},{"name":"Pramit Priyam Saha","role":"Macro Research Analyst"},{"name":"Rishabh Rupani","role":"Macro Research Analyst"},{"name":"Matthew Walzer","role":"Macro Research Analyst"}]'::jsonb),
  ('4c378fce-6240-4b9c-a37c-bfac88ae13de'::uuid, '[{"name":"Federico Lazzarini","role":"Head of Quantitative Research"},{"name":"Filip Borzecki","role":"Quantitative Research Analyst"},{"name":"Michele Fanelli","role":"Quantitative Research Analyst"},{"name":"Giani Ranzetti","role":"Quantitative Research Analyst"}]'::jsonb),
  ('4e4ad092-2123-4089-b963-e1f141ee1a8e'::uuid, '[{"name":"Raman Antanovich","role":"Portfolio Manager"},{"name":"Pietro Tracanzan","role":"Portfolio Analyst"},{"name":"Filippo Forzan","role":"Portfolio Analyst"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Boris Penev","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Tiago Viamonte","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"},{"name":"Lodovico Del Re","role":"Head of Portfolio Management"}]'::jsonb),
  ('9dc8b5a5-ea82-435b-92eb-ecadcc9c7dfa'::uuid, '[{"name":"Michele Rinaldi","role":"Portfolio Manager"},{"name":"Aleksandar Georgiev","role":"Portfolio Analyst"},{"name":"Giovanni Carboniero","role":"Portfolio Analyst"},{"name":"Francesco Anastasi","role":"Portfolio Analyst"},{"name":"Federico Indrieri","role":"Portfolio Analyst"},{"name":"Alberto Cifrodelli","role":"Portfolio Analyst"},{"name":"Luca Riolo","role":"Portfolio Analyst"},{"name":"Antonino Di Blasi","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"},{"name":"Lodovico Del Re","role":"Head of Portfolio Management"}]'::jsonb),
  ('7ede6715-2800-4501-9c55-f7b4d52e7cbf'::uuid, '[{"name":"Luca Delorenzi","role":"Portfolio Manager"},{"name":"Luca Moretto","role":"Portfolio Analyst"},{"name":"Elisabetta Fabris","role":"Portfolio Analyst"},{"name":"Pietro Cordero","role":"Portfolio Analyst"},{"name":"Vittorio Garavelli","role":"Portfolio Analyst"},{"name":"Riccardo Colombo","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Portfolio Analyst"},{"name":"Carl Christian Bengelsdorff","role":"Portfolio Analyst"},{"name":"Giuseppe Palermo","role":"Head of Asset Management"},{"name":"Lodovico Del Re","role":"Head of Portfolio Management"}]'::jsonb),
  ('aa769c30-dd63-4f44-9b32-4c94b8a45c2e'::uuid, '[{"name":"Salma El Hamdi","role":"Lead Analyst"},{"name":"Savvina Salvaridou","role":"Analyst"},{"name":"Samuel Zanchetta","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('66353834-3b14-4b77-b992-d3480efdb1b9'::uuid, '[{"name":"Vittorio Garavelli","role":"Portfolio Manager"},{"name":"Luca Moretto","role":"Portfolio Analyst"},{"name":"Filippo Forzan","role":"Portfolio Analyst"},{"name":"Giacomo Sada","role":"Portfolio Analyst"},{"name":"Johannes Nachtigal","role":"Portfolio Analyst"},{"name":"Andrea Cavenago","role":"Portfolio Analyst"},{"name":"Carl Christian Bengelsdorff","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('a6d2412a-728a-4344-bfab-717667ad6518'::uuid, '[{"name":"Daniele Biondi","role":"Portfolio Manager"},{"name":"Pietro Tracanzan","role":"Portfolio Analyst"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Tiago Viamonte","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('1b6201c7-9ac4-4da3-beee-ed5f0678db4f'::uuid, '[{"name":"Lukas Louhiluoto","role":"Head of Investment Research"},{"name":"Giorgio Gusella","role":"Co-Head of Investment Research"},{"name":"Giuseppe Provenzano","role":"Fixed Income Strategist, Lead"},{"name":"Lorenzo Monteduro","role":"FX & Commodities Strategist, Lead"},{"name":"Alessandro Palasciano","role":"Equities Strategist, Lead"},{"name":"Felix Lehtonen","role":"Fixed Income Strategist"},{"name":"Elias Bouzamondo","role":"Fixed Income Strategist"},{"name":"Volodymyr Pavliv","role":"Fixed Income Strategist"},{"name":"Irene Vaccaro","role":"FX & Commodities Strategist"},{"name":"Francesco D’Angela","role":"FX & Commodities Strategist"},{"name":"Alexander Brune","role":"Equities Strategist"},{"name":"Tom Petit","role":"Equities Strategist"},{"name":"Mylan Monteil","role":"Equities Strategist"},{"name":"Paul Chatin","role":"Equities Strategist"}]'::jsonb),
  ('e408af45-6b6d-44bb-a836-71191a4841f4'::uuid, '[{"name":"Sara De Padova","role":"Lead Analyst"},{"name":"Tho Anh Vu","role":"Analyst"},{"name":"Bruno Matys","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('8919f549-9670-4f2b-ae22-c31b8d4d3b8c'::uuid, '[{"name":"Marco Di Marco","role":"Lead Analyst"},{"name":"Marzio Bonizzi","role":"Analyst"},{"name":"Vincenzo Esposito","role":"Analyst"},{"name":"Giorgia Giustizieri","role":"Analyst"},{"name":"Francesca Rombolà","role":"Analyst"},{"name":"Nikolaus Schmidt-Chiari","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('7939610a-d5a9-4e38-be83-a2ce4ac22038'::uuid, '[{"name":"Daniele Biondi","role":"Portfolio Manager"},{"name":"Pietro Tracanzan","role":"Portfolio Analyst"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Boris Penev","role":"Portfolio Analyst"},{"name":"Tiago Viamonte","role":"Portfolio Analyst"},{"name":"Francesco Catalanotti","role":"Portfolio Analyst"},{"name":"Elisabetta Fabris","role":"Portfolio Analyst"},{"name":"Riccardo Colombo","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('8a92a9ec-f080-4306-b4f4-cdc6d7c23a8a'::uuid, '[{"name":"Stelian Cujba","role":"Analyst"},{"name":"Filippo Torsa","role":"Analyst"},{"name":"Savvina Salvaridou","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('006f4823-cdd9-4326-8542-82cec67a9597'::uuid, '[{"name":"Vittorio Garavelli","role":"Portfolio Manager"},{"name":"Luca Moretto","role":"Portfolio Analyst"},{"name":"Filippo Forzan","role":"Portfolio Analyst"},{"name":"Giacomo Sada","role":"Portfolio Analyst"},{"name":"Johannes Nachtigal","role":"Portfolio Analyst"},{"name":"Andrea Cavenago","role":"Portfolio Analyst"},{"name":"Carl Christian Bengelsdorff","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('d63350fb-df11-44a1-8a3b-be4ba59701b2'::uuid, '[{"name":"Lukas Louhiluoto","role":"Head of Investment Research"},{"name":"Giorgio Gusella","role":"Co-Head of Investment Research"},{"name":"Giuseppe Provenzano","role":"Fixed Income Strategist, Lead"},{"name":"Lorenzo Monteduro","role":"FX & Commodities Strategist, Lead"},{"name":"Alessandro Palasciano","role":"Equities Strategist, Lead"},{"name":"Felix Lehtonen","role":"Fixed Income Strategist"},{"name":"Elias Bouzamondo","role":"Fixed Income Strategist"},{"name":"Volodymyr Pavliv","role":"Fixed Income Strategist"},{"name":"Irene Vaccaro","role":"FX & Commodities Strategist"},{"name":"Francesco D’Angela","role":"FX & Commodities Strategist"},{"name":"Alexander Brune","role":"Equities Strategist"},{"name":"Tom Petit","role":"Equities Strategist"},{"name":"Mylan Monteil","role":"Equities Strategist"},{"name":"Paul Chatin","role":"Equities Strategist"}]'::jsonb),
  ('0c375cec-6009-4a92-add5-bbf18d7e5b9b'::uuid, '[{"name":"Raman Antanovich","role":"Portfolio Manager"},{"name":"Aleksandar Georgiev","role":"Portfolio Analyst"},{"name":"Francesco Anastasi","role":"Portfolio Analyst"},{"name":"Federico Indrieri","role":"Portfolio Analyst"},{"name":"Antonino Di Blasi","role":"Portfolio Analyst"},{"name":"Ivan Yepifanov","role":"Portfolio Analyst"},{"name":"Guillermo Shaw","role":"Portfolio Analyst"},{"name":"Lodovico Del Re","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('65abeb4f-9114-41b4-99eb-a37a03debbb2'::uuid, '[{"name":"Giovanni Biasiucci","role":"Head of Macro Research"},{"name":"Niccolò Rotondi","role":"Co-Head of Macro Research"},{"name":"Simone Vittorio Percoco","role":"Group Leader"},{"name":"Ludovico Monacelli","role":"Macro Research Analyst"},{"name":"Riccardo Mirarchi","role":"Macro Research Analyst"},{"name":"Berend Dasbach","role":"Macro Research Analyst"},{"name":"Maria Liova","role":"Macro Research Analyst"},{"name":"Juliette Bourgeois","role":"Macro Research Analyst"},{"name":"Francesco Casapenta","role":"Macro Research Analyst"},{"name":"Sophia C. Froehlich","role":"Macro Research Analyst"},{"name":"Merve Abaci","role":"Macro Research Analyst"}]'::jsonb),
  ('baf1f7e4-56af-4315-ae52-037e9fedcc5a'::uuid, '[{"name":"Tho Anh Vu","role":"Lead Analyst"},{"name":"Anna Proturo","role":"Analyst"},{"name":"Diego Baroni","role":"Analyst"},{"name":"Samuel Zanchetta","role":"Analyst"},{"name":"Sara De Padova","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('e9de8f5d-48dd-45ae-a146-88cca1304d38'::uuid, '[{"name":"Riccardo Colombo","role":"Portfolio Manager"},{"name":"Carl Christian Bengelsdorff","role":"Portfolio Analyst"},{"name":"Francesco Catalanotti","role":"Portfolio Analyst"},{"name":"Boris Penev","role":"Portfolio Analyst"},{"name":"Matteo Persico","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('ed7a6448-39ef-4719-bfd7-ea9299b8dda6'::uuid, '[{"name":"Filippo Forzan","role":"Portfolio Manager"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Daniele Stella","role":"Portfolio Analyst"},{"name":"Gian Nicola Buda","role":"Portfolio Analyst"},{"name":"Anton Michels","role":"Portfolio Analyst"},{"name":"Gabriele Traina","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Matteo Caligaris","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('384460a2-330e-4ee0-bf0d-397b7a14a857'::uuid, '[{"name":"Khai Mai Cao","role":"Group Leader"},{"name":"Alessandro Pagan","role":"Group Leader"},{"name":"Siddhanth Narayana Achanta","role":"Macro Research Analyst"},{"name":"Giovanni Lacoppola","role":"Macro Research Analyst"},{"name":"Merve Abaci","role":"Macro Research Analyst"},{"name":"Pramit Priyam Saha","role":"Macro Research Analyst"},{"name":"Simona Necula","role":"Macro Research Analyst"},{"name":"Xinjie Sophia Wu","role":"Macro Research Analyst"},{"name":"Matthew Walzer","role":"Macro Research Analyst"},{"name":"Giovanni Francescato","role":"Macro Research Analyst"},{"name":"Niccolò Rotondi","role":"Macro Research Analyst"}]'::jsonb),
  ('5dca957e-02ca-494c-a41f-e0cdc68dd071'::uuid, '[{"name":"Volodymyr Pavliv","role":"Head of Investment Research"},{"name":"Lukas Louhiluoto","role":"Co-Head of Investment Research"},{"name":"Elias Bouzamondo","role":"Fixed Income Strategist, Lead"},{"name":"Francesco D’Angela","role":"FX & Commodities Strategist, Lead"},{"name":"Tom Petit","role":"Equities Strategist, Lead"},{"name":"Emanuele Bozzo","role":"Fixed Income Strategist"},{"name":"Guillermo Shaw","role":"Fixed Income Strategist"},{"name":"Felix Lehtonen","role":"Fixed Income Strategist"},{"name":"Irene Vaccaro","role":"FX & Commodities Strategist"},{"name":"Karim Vallaro","role":"FX & Commodities Strategist"},{"name":"Seungjae Kim","role":"FX & Commodities Strategist"},{"name":"Paul Chatin","role":"Equities Strategist"},{"name":"Mylan Monteil","role":"Equities Strategist"},{"name":"Alexander Brune","role":"Equities Strategist"}]'::jsonb),
  ('ff8b4fd8-fced-4fe6-be4f-3c9d3afef1ed'::uuid, '[{"name":"Aleksandar Georgiev","role":"Portfolio Manager"},{"name":"Federico Indrieri","role":"Senior Portfolio Analyst"},{"name":"Aigerim Turuspekova","role":"Portfolio Analyst"},{"name":"Annadele Tortora","role":"Portfolio Analyst"},{"name":"Giorgio Gagliardo","role":"Portfolio Analyst"},{"name":"Ivan Yepifanov","role":"Portfolio Analyst"},{"name":"Marco Di Marco","role":"Portfolio Analyst"},{"name":"Polina Drofa","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('7e1cb99c-41c1-4815-8a38-30ac476908a7'::uuid, '[{"name":"Riccardo Colombo","role":"Portfolio Manager"},{"name":"Carl Christian Bengelsdorff","role":"Portfolio Analyst"},{"name":"Francesco Catalanotti","role":"Portfolio Analyst"},{"name":"Edgar Coates","role":"Portfolio Analyst"},{"name":"Sofia M. V. De Palma","role":"Portfolio Analyst"},{"name":"Pietro Lupi","role":"Portfolio Analyst"},{"name":"Adriana Ovcharova","role":"Portfolio Analyst"},{"name":"Boris Penev","role":"Portfolio Analyst"},{"name":"Matteo Persico","role":"Portfolio Analyst"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('56bf4f97-85ff-4e3d-aa4c-768dde88f3dd'::uuid, '[{"name":"Ianina Tarca","role":"Co-Head of Quantitative Research"},{"name":"Afonso Tavares da Silva","role":"Quantitative Research Analyst"},{"name":"Lorenzo Giambra","role":"Quantitative Research Analyst"}]'::jsonb),
  ('397301ac-07fb-4135-aa9e-86a8b9ae86d6'::uuid, '[{"name":"Filippo Forzan","role":"Portfolio Manager"},{"name":"Matteo De Guidi","role":"Portfolio Analyst"},{"name":"Daniele Stella","role":"Portfolio Analyst"},{"name":"Gian Nicola Buda","role":"Portfolio Analyst"},{"name":"Anton Michels","role":"Portfolio Analyst"},{"name":"Gabriele Traina","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Matteo Caligaris","role":"Portfolio Analyst"},{"name":"Daniele Biondi","role":"Head of Asset Management"},{"name":"Michele Rinaldi","role":"Head of Portfolio Management"}]'::jsonb),
  ('452b6dac-c724-437c-8140-df002e39ad40'::uuid, '[{"name":"Cosimo Jacopo Guadalupi","role":"Analyst"},{"name":"Krister Davis Krauklis","role":"Analyst"},{"name":"Giovanni Cianci","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('031b2fb5-0efc-45b7-9f90-975a4bbe53d9'::uuid, '[{"name":"Andrea Pierini","role":"Lead Analyst"},{"name":"Giuseppe Marcarelli","role":"Analyst"},{"name":"Giorgia Giustizieri","role":"Analyst"},{"name":"Samuel Zanchetta","role":"Analyst"},{"name":"Jill Samantha Pascual","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('2cffef8b-00c8-4461-9fc8-1f09336f5cff'::uuid, '[{"name":"Niccolò Rotondi","role":"Head of Macro Research"},{"name":"Simone Vittorio Percoco","role":"Co-Head of Macro Research"},{"name":"Sophia C. Froehlich","role":"Team Leader"},{"name":"Jovana Mrdalj","role":"Research Analyst"},{"name":"Marco Catoni","role":"Research Analyst"},{"name":"Ludovico Monacelli","role":"Research Analyst"},{"name":"Juliette Bourgeois","role":"Research Analyst"},{"name":"Adam Lugossy","role":"Research Analyst"},{"name":"Ralph Hermans","role":"Research Analyst"}]'::jsonb),
  ('cc68dcef-3c3f-418b-bc7c-cee61f817881'::uuid, '[{"name":"Anna Proturo","role":"Lead Analyst"},{"name":"Filippo Torsa","role":"Analyst"},{"name":"Alex Cuker","role":"Analyst"},{"name":"Francesca Rombolà","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('0240860e-c6a6-4028-8776-32ce45339934'::uuid, '[{"name":"Savvina Salvaridou","role":"Lead Analyst"},{"name":"Rosita Cirillo","role":"Analyst"},{"name":"Nikola Stoev","role":"Analyst"},{"name":"Aniello Renzullo","role":"Analyst"},{"name":"Rezan Bagcioglu","role":"Co-Head of Equity Research"},{"name":"Giacomo Pietrosanti","role":"Co-Head of Equity Research"}]'::jsonb),
  ('499b1b39-6b39-482e-94e9-0777ee3a61cd'::uuid, '[{"name":"Ianina Tarca","role":"Head of Quantitative Research"},{"name":"Elena Sofia Broggini","role":"Quantitative Research Analyst"},{"name":"Luca Busetti","role":"Quantitative Research Analyst"},{"name":"Pablo Panizza","role":"Quantitative Research Analyst"},{"name":"Adam Lugossy","role":"Macro Research Analyst"},{"name":"Alessandro Pagan","role":"Macro Research Analyst"},{"name":"Ludovico Monacelli","role":"Macro Research Analyst"}]'::jsonb),
  ('88ddb6fa-e8d4-4e8a-a152-bcf40e478804'::uuid, '[{"name":"Ianina Tarca","role":"Head of Quantitative Research"},{"name":"Sebastian Skjensvold","role":"Quantitative Research Analyst"},{"name":"Filip Borzecki","role":"Quantitative Research Analyst"}]'::jsonb),
  ('ee32b33b-057a-4c05-a507-712da1f0b436'::uuid, '[{"name":"Edgar Coates","role":"Portfolio Manager"},{"name":"Francesco Catalanotti","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Sofia M. V. De Palma","role":"Portfolio Analyst"},{"name":"Lorenzo Larosa","role":"Portfolio Analyst"},{"name":"Anton Michels","role":"Portfolio Analyst"},{"name":"James Moser","role":"Portfolio Analyst"},{"name":"Adriana Ovcharova","role":"Portfolio Analyst"},{"name":"Daniele Stella","role":"Portfolio Analyst"},{"name":"Gabriele Traina","role":"Portfolio Analyst"},{"name":"Raffaele M. Valensise","role":"Portfolio Analyst"},{"name":"Riccardo Colombo","role":"Head of Asset Management"},{"name":"Aleksandar Georgiev","role":"Head of Portfolio Management"}]'::jsonb),
  ('c8175460-a9f9-4b29-9ff4-f30a53e6db87'::uuid, '[{"name":"Rosita Cirillo","role":"Lead Analyst"},{"name":"Giuseppe Marcarelli","role":"Analyst"},{"name":"Nikola Stoev","role":"Analyst"},{"name":"Anna Proturo","role":"Co-Head of Equity Research"},{"name":"Tho Anh Vu","role":"Co-Head of Equity Research"}]'::jsonb),
  ('90005346-3288-4001-bc3b-e9a109981807'::uuid, '[{"name":"Ianina Tarca","role":"Head of Quantitative Research"},{"name":"Michael Ladaa","role":"Quantitative Research Analyst"}]'::jsonb),
  ('4a11aed8-cc7a-42de-9434-5eeeb9037614'::uuid, '[{"name":"Alessandro Pagan","role":"Head of Macro Research"},{"name":"Khai Mai Cao","role":"Co-Head of Macro Research"},{"name":"Jovana Mrdalj","role":"Group Leader"},{"name":"Giandomenico Vumbaca","role":"Macro Research Analyst"},{"name":"Maria Liova","role":"Macro Research Analyst"},{"name":"Matthew Walzer","role":"Macro Research Analyst"},{"name":"Pramit Priyam Saha","role":"Macro Research Analyst"},{"name":"Ralph Hermans","role":"Macro Research Analyst"},{"name":"Vittorio Cravanzola","role":"Macro Research Analyst"}]'::jsonb),
  ('2793657d-4585-4aed-bc34-194c7db87817'::uuid, '[{"name":"Ianina Tarca","role":"Head of Quantitative Research"},{"name":"Afonso Tavares da Silva","role":"Quantitative Research Analyst"}]'::jsonb),
  ('83cdac4d-6b90-4aff-b0cf-b34271fdf48f'::uuid, '[{"name":"Alessandro Pagan","role":"Head of Macro Research"},{"name":"Khai Mai Cao","role":"Co-Head of Macro Research"},{"name":"Giovanni Francescato","role":"Group Leader"},{"name":"Xinjie Sophia Wu","role":"Macro Research Analyst"},{"name":"Adriano La Ragione","role":"Macro Research Analyst"},{"name":"Siddhanth Narayana Achanta","role":"Macro Research Analyst"},{"name":"Giovanni Lacoppola","role":"Macro Research Analyst"}]'::jsonb),
  ('23281747-62e1-430b-9f40-37cc616f026b'::uuid, '[{"name":"Volodymyr Pavliv","role":"Head of Investment Research"},{"name":"Tom Petit","role":"Co-Head of Investment Research"},{"name":"Elias Bouzamondo","role":"Head of Fixed Income"},{"name":"Mylan Monteil","role":"Head of Equities"},{"name":"Seungjae Kim","role":"Head of FX & Commodities"},{"name":"Emanuele Bozzo","role":"Fixed Income Strategist"},{"name":"Guillermo Shaw","role":"Fixed Income Strategist"},{"name":"Pierre-Philippe Derckx","role":"Fixed Income Strategist"},{"name":"Paul Chatin","role":"Equities Strategist"},{"name":"Oscar Bowyer","role":"Equities Strategist"},{"name":"Lorenzo Grimaldi","role":"Equities Strategist"},{"name":"Alexander Brune","role":"Equities Strategist"},{"name":"Karim Vallaro","role":"FX & Commodities Strategist"},{"name":"Elliot Blanckaert","role":"FX & Commodities Strategist"},{"name":"Tommaso Domenis","role":"FX & Commodities Strategist"},{"name":"Irene Vaccaro","role":"FX & Commodities Strategist"}]'::jsonb),
  ('5dd008e2-4c0d-461f-86c4-10570f751542'::uuid, '[{"name":"Cosimo Jacopo Guadalupi","role":"Lead Analyst"},{"name":"Aniello Renzullo","role":"Analyst"},{"name":"Luca Zhuo","role":"Analyst"},{"name":"Hans Gabriel Lin","role":"Analyst"},{"name":"Jill Samantha Pascual","role":"Analyst"},{"name":"Francesca Rombolà","role":"Analyst"},{"name":"Tho Anh Vu","role":"Co-Head of Equity Research"},{"name":"Anna Proturo","role":"Co-Head of Equity Research"}]'::jsonb),
  ('0fb40350-31d2-4564-aa89-ac100499e50c'::uuid, '[{"name":"Edgar Coates","role":"Portfolio Manager"},{"name":"Francesco Catalanotti","role":"Portfolio Analyst"},{"name":"Michele D’Andrilli","role":"Portfolio Analyst"},{"name":"Sofia M. V. De Palma","role":"Portfolio Analyst"},{"name":"Lorenzo Larosa","role":"Portfolio Analyst"},{"name":"Anton Michels","role":"Portfolio Analyst"},{"name":"James Moser","role":"Portfolio Analyst"},{"name":"Adriana Ovcharova","role":"Portfolio Analyst"},{"name":"Matteo Persico","role":"Portfolio Analyst"},{"name":"Gabriele Traina","role":"Portfolio Analyst"},{"name":"Raffaele M. Valensise","role":"Portfolio Analyst"},{"name":"Riccardo Colombo","role":"Head of Asset Management"},{"name":"Aleksandar Georgiev","role":"Head of Portfolio Management"}]'::jsonb),
  ('0d44989f-12d3-4d72-8708-f2ec2229deca'::uuid, '[{"name":"Federico Indrieri","role":"Portfolio Manager"},{"name":"Ivan Yepifanov","role":"Senior Portfolio Analyst"},{"name":"Aigerim Turuspekova","role":"Portfolio Analyst"},{"name":"Annadele Tortora","role":"Portfolio Analyst"},{"name":"Francesco Anastasi","role":"Portfolio Analyst"},{"name":"Giorgio Gagliardo","role":"Portfolio Analyst"},{"name":"Hristo Petrov","role":"Portfolio Analyst"},{"name":"Kim Lan Vo","role":"Portfolio Analyst"},{"name":"Polina Drofa","role":"Portfolio Analyst"},{"name":"Szofi Varga","role":"Portfolio Analyst"},{"name":"Aleksandar Georgiev","role":"Head of Portfolio Management"}]'::jsonb),
  ('bd0e0b57-0d25-4fd1-97be-c86adaec3b4b'::uuid, '[{"name":"Ianina Tarca","role":"Head of Quantitative Research"},{"name":"Oscar Poirier","role":"Quantitative Research Analyst"}]'::jsonb),
  ('2eceb8da-a93c-405a-a77c-094c3bb0c92c'::uuid, '[{"name":"Filippo Torsa","role":"Lead Analyst"},{"name":"Lisa Riva","role":"Analyst"},{"name":"Savvina Salvaridou","role":"Analyst"},{"name":"Loyd Patrick Thomas Hegarty","role":"Analyst"},{"name":"Alex Cuker","role":"Analyst"},{"name":"Giuseppe Marcarelli","role":"Analyst"},{"name":"Anna Proturo","role":"Co-Head of Equity Research"},{"name":"Tho Anh Vu","role":"Co-Head of Equity Research"}]'::jsonb),
  ('e4d3d333-e249-4829-a5a3-245bbb8e29dc'::uuid, '[{"name":"Elena Sofia Broggini","role":"Quantitative Research Analyst"},{"name":"Luca Busetti","role":"Quantitative Research Analyst"}]'::jsonb),
  ('4ff76c32-387c-48a9-8d56-0feba5a97505'::uuid, '[{"name":"Adam Lugossy","role":"Head of Macro Research"},{"name":"Giuseppe Spina","role":"Senior Macro Research Analyst"},{"name":"Sophia C. Froehlich","role":"Senior Macro Research Analyst"},{"name":"Matteo Dalla Val","role":"Macro Research Analyst"},{"name":"Berend Dasbach","role":"Macro Research Analyst"},{"name":"Simona Necula","role":"Macro Research Analyst"}]'::jsonb)
  ) AS v(id, authors)
 WHERE f.id = v.id AND f.authors = '[]'::jsonb;
ALTER TABLE public.archive_files ENABLE TRIGGER USER;

-- ---------------------------------------------------------------------
-- Authors link to their Members or Alumni entry.
-- ---------------------------------------------------------------------
-- A name as a set of words: lower case, accents dropped, initials and
-- punctuation ignored, in alphabetical order, so "Khai Mai Cao" and
-- "Cao-Khai Mai" are the same person.
CREATE OR REPLACE FUNCTION public.person_tokens(p text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT w ORDER BY w), '{}'::text[])
    FROM regexp_split_to_table(
           regexp_replace(
             translate(lower(COALESCE(p, '')),
               'àáâãäåāăąèéêëēėęěìíîïīįıòóôõöøōőùúûüūůűųçćčďđğłńñňřśşšťţźżžýÿ',
               'aaaaaaaaaeeeeeeeeiiiiiiioooooooouuuuuuuucccddglnnnrsssttzzzyy'),
             '[^a-z]+', ' ', 'g'), ' ') AS w
   WHERE length(w) > 1;
$$;

-- The people a reader can find on the website: everybody on the Members
-- page, and the alumni the public directory shows (the same first hundred
-- as public_alumni_directory). Nobody else is linked to.
CREATE OR REPLACE FUNCTION public.public_people_index()
RETURNS TABLE (kind text, id uuid, tokens text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'member'::text, t.id, public.person_tokens(COALESCE(t.name, '') || ' ' || COALESCE(t.surname, ''))
    FROM public.team_members t
  UNION ALL
  SELECT 'alumni'::text, a.id, public.person_tokens(COALESCE(a.name, '') || ' ' || COALESCE(a.surname, ''))
    FROM (SELECT id, name, surname FROM public.alumni
           ORDER BY graduation_year DESC, surname ASC, name ASC LIMIT 100) a;
$$;
REVOKE ALL ON FUNCTION public.public_people_index() FROM public;

-- Each author with the page that shows them, when exactly one person on
-- the website matches: the same words, or (for names of two words or more)
-- one name's words all contained in the other's, so a middle name printed
-- on one cover and not on another still matches. A person picked in the
-- editor is linked by id while they are still listed. Members come first.
-- `p_people` is public_people_index() as JSON, read once per request.
CREATE OR REPLACE FUNCTION public.resolve_report_authors(p_authors jsonb, p_people jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH people AS (
    SELECT x->>'kind' AS kind, x->>'id' AS id,
           ARRAY(SELECT jsonb_array_elements_text(x->'tokens')) AS tokens
      FROM jsonb_array_elements(COALESCE(p_people, '[]'::jsonb)) x
  ), a AS (
    SELECT t.ord, t.e, btrim(t.e->>'name') AS name,
           NULLIF(btrim(COALESCE(t.e->>'role', '')), '') AS role,
           public.person_tokens(t.e->>'name') AS tok
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_authors) = 'array' THEN p_authors ELSE '[]'::jsonb END)
             WITH ORDINALITY AS t(e, ord)
     WHERE jsonb_typeof(t.e) = 'object' AND btrim(COALESCE(t.e->>'name', '')) <> ''
  ), linked AS (
    SELECT a.ord, a.name, a.role, COALESCE(
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
                                    AND (p.tokens @> a.tok OR a.tok @> p.tokens))))
    ) AS link
      FROM a
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'role', role, 'link', link) ORDER BY ord), '[]'::jsonb)
    FROM linked;
$$;
REVOKE ALL ON FUNCTION public.resolve_report_authors(jsonb, jsonb) FROM public;

CREATE OR REPLACE FUNCTION public.public_people_json()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'tokens', to_jsonb(tokens))), '[]'::jsonb)
    FROM public.public_people_index();
$$;
REVOKE ALL ON FUNCTION public.public_people_json() FROM public;

-- Every published report (or one, by its address), newest first, as the
-- report pages, the static pages and the data files read it.
CREATE OR REPLACE FUNCTION public.public_reports(p_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH people AS (SELECT public.public_people_json() AS j)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description,
           'date', f.date, 'division', f.division, 'fund', f.fund,
           'report_type', COALESCE(f.report_type, public.archive_default_type(f.division::text)),
           'tags', to_jsonb(f.tags), 'page_count', f.page_count, 'file_url', f.file_url,
           'updated_at', f.updated_at,
           'authors', public.resolve_report_authors(f.authors, people.j))
         ORDER BY f.date DESC NULLS LAST, f.created_at DESC), '[]'::jsonb)
    FROM public.archive_files f, people
   WHERE f.status = 'published' AND f.deleted_at IS NULL AND f.slug IS NOT NULL
     AND (p_slug IS NULL OR f.slug = p_slug);
$$;
REVOKE ALL ON FUNCTION public.public_reports(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_reports(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Funds
-- ---------------------------------------------------------------------
-- The closed funds can hold monthly returns too.
ALTER TABLE public.fund_performance_years DROP CONSTRAINT IF EXISTS fund_performance_years_fund_check;
ALTER TABLE public.fund_performance_years ADD CONSTRAINT fund_performance_years_fund_check
  CHECK (fund IN ('long-short', 'multi-asset', 'dps', 'pir'));

-- What a fund page says about the fund besides its numbers. Typed by the
-- PM team in the fund editor. A closed fund's page shows its table once
-- its monthly returns and its dates are here.
CREATE TABLE IF NOT EXISTS public.fund_profiles (
  fund                text PRIMARY KEY CHECK (fund IN ('long-short', 'multi-asset', 'dps', 'pir')),
  inception_date      date,
  end_date            date,
  closing_reason      text NOT NULL DEFAULT '' CHECK (length(closing_reason) <= 600),
  rebalancing_policy  text NOT NULL DEFAULT '' CHECK (length(rebalancing_policy) <= 600),
  methodology         text NOT NULL DEFAULT '' CHECK (length(methodology) <= 2000),
  positions_count     integer CHECK (positions_count IS NULL OR positions_count BETWEEN 0 AND 2000),
  positions_as_of     date,
  updated_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fund_profiles_dates_check CHECK (end_date IS NULL OR inception_date IS NULL OR end_date >= inception_date)
);
ALTER TABLE public.fund_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fund profiles are public" ON public.fund_profiles;
CREATE POLICY "fund profiles are public" ON public.fund_profiles FOR SELECT USING (true);
GRANT SELECT ON public.fund_profiles TO anon, authenticated;
GRANT ALL ON public.fund_profiles TO service_role;

INSERT INTO public.fund_profiles (fund, inception_date, rebalancing_policy, methodology, positions_count, positions_as_of) VALUES
  ('long-short', DATE '2018-12-03',
   'Rebalanced every six months. The exposure is reset to EUR 100,000 at each rebalancing, and no intermediate rebalancing is usually performed.',
   'Zero-net-investment, multi-factor long-short portfolio of US (S&P 500) and European (STOXX Europe 600) equities, with 20 stocks in each of four segments: long and short, US and Europe. Stocks are ranked on value, momentum, quality, low volatility, illiquidity, tail risk and yield curve factors; factor weights follow a time-series factor momentum rule; each position is capped at 5% and checked for sector neutrality and geographic balance. Returns are on a EUR 100,000 exposure, from a simulated NAV.',
   80, DATE '2026-05-20'),
  ('multi-asset', DATE '2020-01-31',
   'Rebalanced every six months, with ad hoc reviews to reposition around market shocks and dislocations.',
   'Discretionary global portfolio of listed equities, fixed income and commodities, built from the macroeconomic outlook (top-down) and from fundamental analysis of single securities (bottom-up), typically about 30 holdings. Position sizing is guided by marginal risk contribution, correlation and liquidity. Derivatives are used only to hedge tail risks and currency, never for net leverage or directional exposure. The fund is valued at each day''s close, with dividends and coupons reinvested.',
   NULL, NULL)
ON CONFLICT (fund) DO NOTHING;

-- The market references and the risk-free rate, typed month by month by
-- the PM team (no scraping), each value with its source and date. Index
-- values are licensed data: only what is derived from them (beta,
-- correlation) is ever published, so the series table has no public read.
CREATE TABLE IF NOT EXISTS public.fund_reference_meta (
  series      text PRIMARY KEY CHECK (series IN ('euro_stoxx_50', 'sp_500', 'msci_china', 'estr')),
  label       text NOT NULL,
  variant     text NOT NULL DEFAULT '',
  currency    text NOT NULL DEFAULT 'EUR',
  kind        text NOT NULL CHECK (kind IN ('index', 'risk_free')),
  position    smallint NOT NULL DEFAULT 0,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fund_reference_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fund references are public" ON public.fund_reference_meta;
CREATE POLICY "fund references are public" ON public.fund_reference_meta FOR SELECT USING (true);
GRANT SELECT ON public.fund_reference_meta TO anon, authenticated;
GRANT ALL ON public.fund_reference_meta TO service_role;

INSERT INTO public.fund_reference_meta (series, label, variant, currency, kind, position) VALUES
  ('euro_stoxx_50', 'EURO STOXX 50', 'Net total return', 'EUR', 'index', 1),
  ('sp_500', 'S&P 500', 'Net total return', 'EUR', 'index', 2),
  ('msci_china', 'MSCI China', 'Net total return', 'EUR', 'index', 3),
  ('estr', '€STR (euro short-term rate)', 'Monthly average of the daily rate, % a year', 'EUR', 'risk_free', 4)
ON CONFLICT (series) DO NOTHING;

-- One value per series and month: an index's monthly return in %, or the
-- €STR's monthly average in % a year.
CREATE TABLE IF NOT EXISTS public.fund_reference_series (
  series      text NOT NULL REFERENCES public.fund_reference_meta(series),
  month       date NOT NULL CHECK (extract(day FROM month) = 1),
  value       numeric NOT NULL CHECK (value BETWEEN -100 AND 1000),
  source      text NOT NULL DEFAULT '' CHECK (length(source) <= 300),
  as_of       date,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series, month)
);
ALTER TABLE public.fund_reference_series ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.fund_reference_series TO service_role;

-- ---------------------------------------------------------------------
-- ONE FUNCTION FOR EVERY DERIVED FUND FIGURE.
-- ---------------------------------------------------------------------
-- Only the monthly returns are typed (net, in EUR, in %). From them:
--   * each year's YTD (compounded), ITD at the year's end, volatility
--     (sample standard deviation of the year's months x sqrt 12, two
--     months or more) and, for a full calendar year only, the Sharpe
--     ratio (the year's return minus the €STR compounded over the same
--     months, over the volatility; a few months annualised would read
--     as an extreme ratio that says nothing);
--   * since inception: the cumulative return, the annualised return and
--     volatility (twelve months or more), the Sharpe ratio on the same
--     rule, the maximum drawdown of the compounded series with its peak,
--     trough and recovery, the share of positive months, the best and the
--     worst month;
--   * against each market reference typed by the PM team: beta (the slope
--     of the fund's monthly returns on the index's) and correlation, over
--     the months both have, published only from twelve shared months.
-- The fund pages, the data files and the key numbers registry all read
-- this, and scripts/fund-stats.test.mjs recomputes it independently.
CREATE OR REPLACE FUNCTION public.fund_track_record(p_fund text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_m      date[];
  v_r      numeric[];
  v_rf     numeric[];
  v_w      numeric[];
  n        int;
  i        int;
  j        int;
  w        numeric := 1;
  peak     numeric := 1;
  peak_i   int := 0;
  mdd      numeric := 0;
  mdd_pi   int := 0;
  mdd_ti   int := 0;
  rec_i    int;
  dd       numeric;
  peak_w   numeric;
  v_years  jsonb;
  v_refs   jsonb;
  v_rfinfo jsonb;
  v_itd    jsonb;
BEGIN
  SELECT array_agg(m ORDER BY m), array_agg(r ORDER BY m)
    INTO v_m, v_r
    FROM (SELECT make_date(y.year, t.idx::int, 1) AS m, public.kn_points(t.v) / 100 AS r
            FROM public.fund_performance_years y,
                 LATERAL jsonb_array_elements_text(
                   CASE WHEN jsonb_typeof(y.months::jsonb) = 'array' THEN y.months::jsonb ELSE '[]'::jsonb END)
                   WITH ORDINALITY AS t(v, idx)
           WHERE y.fund::text = p_fund AND t.idx <= 12 AND public.kn_points(t.v) IS NOT NULL
             AND public.kn_points(t.v) > -100) s;
  n := COALESCE(array_length(v_m, 1), 0);
  IF n = 0 THEN
    RETURN jsonb_build_object('fund', p_fund, 'months_count', 0, 'years', '[]'::jsonb, 'monthly', '[]'::jsonb,
                              'references', '[]'::jsonb);
  END IF;

  -- The monthly risk-free return from the €STR typed for that month.
  SELECT array_agg(CASE WHEN x.value IS NOT NULL THEN power(1 + x.value / 100, 1.0 / 12) - 1 END ORDER BY u.m)
    INTO v_rf
    FROM unnest(v_m) AS u(m)
    LEFT JOIN public.fund_reference_series x ON x.series = 'estr' AND x.month = u.m;

  -- The compounded series and its deepest fall.
  v_w := ARRAY[]::numeric[];
  FOR i IN 1 .. n LOOP
    w := w * (1 + v_r[i]);
    v_w := v_w || w;
    IF w >= peak THEN peak := w; peak_i := i; END IF;
    dd := w / peak - 1;
    IF dd < mdd THEN mdd := dd; mdd_pi := peak_i; mdd_ti := i; END IF;
  END LOOP;
  rec_i := NULL;
  IF mdd < 0 THEN
    peak_w := CASE WHEN mdd_pi = 0 THEN 1 ELSE v_w[mdd_pi] END;
    FOR j IN mdd_ti + 1 .. n LOOP
      IF v_w[j] >= peak_w THEN
        rec_i := j;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  WITH s AS (
    SELECT u.m, u.r, u.rf FROM unnest(v_m, v_r, v_rf) AS u(m, r, rf)
  ), yr AS (
    SELECT extract(year FROM m)::int AS year, count(*)::int AS cnt, exp(sum(ln(1 + r))) AS g,
           stddev_samp(r) AS sd, bool_and(rf IS NOT NULL) AS rf_ok, exp(sum(ln(1 + COALESCE(rf, 0)))) AS grf
      FROM s GROUP BY 1
  ), cum AS (
    SELECT year, exp(sum(ln(g)) OVER (ORDER BY year)) AS cg FROM yr
  )
  SELECT jsonb_agg(jsonb_build_object(
           'year', yr.year,
           'n', yr.cnt,
           'months', (SELECT jsonb_agg((SELECT round(100 * s.r, 6) FROM s WHERE s.m = make_date(yr.year, mm, 1)) ORDER BY mm)
                        FROM generate_series(1, 12) AS mm),
           'ytd', round(100 * (yr.g - 1), 6),
           'itd', round(100 * (cum.cg - 1), 6),
           'vol', CASE WHEN yr.cnt >= 2 THEN round(100 * yr.sd * sqrt(12::numeric), 6) END,
           'sharpe', CASE WHEN yr.cnt = 12 AND yr.rf_ok AND yr.sd > 0
                          THEN round(((power(yr.g, 12.0 / yr.cnt) - 1) - (power(yr.grf, 12.0 / yr.cnt) - 1))
                                     / (yr.sd * sqrt(12::numeric)), 6) END)
         ORDER BY yr.year)
    INTO v_years
    FROM yr JOIN cum USING (year);

  WITH s AS (
    SELECT u.m, u.r, u.rf FROM unnest(v_m, v_r, v_rf) AS u(m, r, rf)
  ), a AS (
    SELECT exp(sum(ln(1 + r))) AS g, stddev_samp(r) AS sd, bool_and(rf IS NOT NULL) AS rf_ok,
           exp(sum(ln(1 + COALESCE(rf, 0)))) AS grf, count(*) FILTER (WHERE r > 0) AS pos
      FROM s
  )
  SELECT jsonb_build_object(
           'itd', round(100 * (a.g - 1), 6),
           'ann_return', CASE WHEN n >= 12 THEN round(100 * (power(a.g, 12.0 / n) - 1), 6) END,
           'ann_vol', CASE WHEN n >= 12 THEN round(100 * a.sd * sqrt(12::numeric), 6) END,
           'sharpe', CASE WHEN n >= 12 AND a.rf_ok AND a.sd > 0
                          THEN round(((power(a.g, 12.0 / n) - 1) - (power(a.grf, 12.0 / n) - 1))
                                     / (a.sd * sqrt(12::numeric)), 6) END,
           'positive_share', round(100.0 * a.pos / n, 6),
           'positive_months', a.pos,
           'best', (SELECT jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'value', round(100 * r, 6))
                      FROM s ORDER BY r DESC, m LIMIT 1),
           'worst', (SELECT jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'value', round(100 * r, 6))
                       FROM s ORDER BY r ASC, m LIMIT 1))
    INTO v_itd
    FROM a;

  SELECT jsonb_build_object(
           'label', COALESCE(mt.label, '€STR'),
           'months_covered', count(x.value),
           'average_rate', round(avg(x.value), 6),
           'sources', COALESCE(jsonb_agg(DISTINCT x.source) FILTER (WHERE x.source <> ''), '[]'::jsonb),
           'as_of', max(x.as_of),
           'complete', count(x.value) = n)
    INTO v_rfinfo
    FROM unnest(v_m) AS u(m)
    LEFT JOIN public.fund_reference_series x ON x.series = 'estr' AND x.month = u.m
    LEFT JOIN public.fund_reference_meta mt ON mt.series = 'estr'
   GROUP BY mt.label;

  SELECT COALESCE(jsonb_agg(ref ORDER BY pos), '[]'::jsonb) INTO v_refs
    FROM (
      SELECT mt.position AS pos, jsonb_build_object(
               'series', mt.series, 'label', mt.label, 'variant', mt.variant, 'currency', mt.currency,
               'months', count(x.value)::int,
               'from', to_char(min(f.m) FILTER (WHERE x.value IS NOT NULL), 'YYYY-MM'),
               'to', to_char(max(f.m) FILTER (WHERE x.value IS NOT NULL), 'YYYY-MM'),
               'beta', CASE WHEN count(x.value) >= 12 THEN round(regr_slope(f.r, x.value / 100)::numeric, 6) END,
               'correlation', CASE WHEN count(x.value) >= 12 THEN round(corr(f.r, x.value / 100)::numeric, 6) END,
               'sources', COALESCE(jsonb_agg(DISTINCT x.source) FILTER (WHERE x.source <> ''), '[]'::jsonb),
               'as_of', max(x.as_of)) AS ref
        FROM public.fund_reference_meta mt
        LEFT JOIN unnest(v_m, v_r) AS f(m, r) ON true
        LEFT JOIN public.fund_reference_series x ON x.series = mt.series AND x.month = f.m
       WHERE mt.kind = 'index'
       GROUP BY mt.series, mt.position, mt.label, mt.variant, mt.currency
    ) q;

  RETURN jsonb_build_object(
    'fund', p_fund,
    'months_count', n,
    'first_month', to_char(v_m[1], 'YYYY-MM'),
    'last_month', to_char(v_m[n], 'YYYY-MM'),
    'monthly', (SELECT jsonb_agg(jsonb_build_object('month', to_char(u.m, 'YYYY-MM'), 'value', round(100 * u.r, 6)) ORDER BY u.m)
                  FROM unnest(v_m, v_r) AS u(m, r)),
    'years', COALESCE(v_years, '[]'::jsonb),
    'max_drawdown', jsonb_build_object(
       'value', round(100 * mdd, 6),
       'peak_month', CASE WHEN mdd < 0 AND mdd_pi > 0 THEN to_char(v_m[mdd_pi], 'YYYY-MM') END,
       'from_inception', mdd < 0 AND mdd_pi = 0,
       'trough_month', CASE WHEN mdd < 0 THEN to_char(v_m[mdd_ti], 'YYYY-MM') END,
       'recovery_month', CASE WHEN rec_i IS NOT NULL THEN to_char(v_m[rec_i], 'YYYY-MM') END,
       'months_to_recover', CASE WHEN rec_i IS NOT NULL THEN rec_i - mdd_ti END),
    'risk_free', v_rfinfo,
    'references', v_refs
  ) || v_itd;
END;
$$;
REVOKE ALL ON FUNCTION public.fund_track_record(text) FROM public;

-- The four funds as the public pages and the data files read them.
CREATE OR REPLACE FUNCTION public.public_fund_track_records()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'computed_at', now(),
    'updated_at', GREATEST(
       (SELECT max(updated_at) FROM public.fund_performance_years),
       (SELECT max(updated_at) FROM public.fund_profiles),
       (SELECT max(updated_at) FROM public.fund_reference_series)),
    'funds', (SELECT jsonb_object_agg(f.fund, jsonb_build_object(
                'status', CASE WHEN f.fund IN ('long-short', 'multi-asset') THEN 'active' ELSE 'closed' END,
                'profile', (SELECT jsonb_build_object(
                              'inception_date', p.inception_date, 'end_date', p.end_date,
                              'closing_reason', NULLIF(p.closing_reason, ''),
                              'rebalancing_policy', NULLIF(p.rebalancing_policy, ''),
                              'methodology', NULLIF(p.methodology, ''),
                              'positions_count', p.positions_count, 'positions_as_of', p.positions_as_of,
                              'updated_at', p.updated_at)
                              FROM public.fund_profiles p WHERE p.fund = f.fund),
                'record', public.fund_track_record(f.fund)))
                FROM unnest(ARRAY['long-short', 'multi-asset', 'dps', 'pir']) AS f(fund)));
$$;
REVOKE ALL ON FUNCTION public.public_fund_track_records() FROM public;
GRANT EXECUTE ON FUNCTION public.public_fund_track_records() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- The key numbers registry reads the same function (Step 93). The
-- definitions that described the old method are brought up to date.
-- ---------------------------------------------------------------------
UPDATE public.key_numbers
   SET definition_template = 'Cumulative return from inception ({from}) to {to}, compounded from the monthly returns. Virtual (paper) portfolio; returns net, in EUR.'
 WHERE slug IN ('fund_long_short_itd', 'fund_multi_asset_itd');
UPDATE public.key_numbers
   SET definition_template = 'Annualised return in excess of the euro short-term rate (€STR) over the same months, divided by annualised volatility, {from} to {to}. Virtual (paper) portfolio; returns net, in EUR.'
 WHERE slug IN ('fund_long_short_sharpe', 'fund_multi_asset_sharpe');

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
  v_tr         jsonb;
  v_vars       jsonb;
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

  -- Every fund figure comes from fund_track_record, the one function the
  -- fund pages and the data files read too (Step 93): values in %.
  FOREACH f IN ARRAY ARRAY['long-short','multi-asset'] LOOP
    f_slug := 'fund_' || replace(f, '-', '_');
    v_tr := public.fund_track_record(f);
    v_months := COALESCE((v_tr->>'months_count')::int, 0);
    IF v_months > 0 THEN
      v_from := to_date(v_tr->>'first_month', 'YYYY-MM');
      v_to := (to_date(v_tr->>'last_month', 'YYYY-MM') + interval '1 month' - interval '1 day')::date;
      v_vars := jsonb_build_object('months', v_months,
                  'from', to_char(v_from, 'FMMonth YYYY'), 'to', to_char(v_to, 'FMMonth YYYY'));
      v_ann := (v_tr->>'ann_return')::numeric;
      v_vol := (v_tr->>'ann_vol')::numeric;
      v_itd := (v_tr->>'itd')::numeric;
      v_sharpe := (v_tr->>'sharpe')::numeric;
      v_mdd := (v_tr->'max_drawdown'->>'value')::numeric;
      PERFORM public.kn_put(f_slug || '_years', v_months / 12.0, v_to, NULL, v_vars, true);
      PERFORM public.kn_put(f_slug || '_ann_return', v_ann, v_to, NULL, v_vars,
        v_ann IS NOT NULL AND v_ann BETWEEN -90 AND 200);
      PERFORM public.kn_put(f_slug || '_ann_vol', v_vol, v_to, NULL, v_vars,
        v_vol IS NOT NULL AND v_vol > 0 AND v_vol < 60);
      PERFORM public.kn_put(f_slug || '_itd', v_itd, v_to, NULL, v_vars, v_itd BETWEEN -95 AND 2000);
      PERFORM public.kn_put(f_slug || '_sharpe', v_sharpe, v_to, NULL, v_vars,
        v_sharpe IS NOT NULL AND v_sharpe BETWEEN -5 AND 5);
      PERFORM public.kn_put(f_slug || '_mdd', v_mdd, v_to, NULL, v_vars,
        v_months >= 12 AND v_mdd <= 0 AND v_mdd > -100);
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
-- 3. Division pages: "How we work" and "Flagship work".
-- ---------------------------------------------------------------------
-- Written by each division's Head (and the Board) in the workspace. A
-- block with no text, or no flagship reports, stays hidden on the page.
-- The drafts below were written from each division's latest reports; a
-- Head edits or replaces them. They are inserted only where no row exists.
CREATE TABLE IF NOT EXISTS public.division_pages (
  division      text PRIMARY KEY CHECK (division IN ('equity', 'investment', 'macro', 'portfolio', 'quant')),
  standards     text NOT NULL DEFAULT '' CHECK (length(standards) <= 1500),
  review        text NOT NULL DEFAULT '' CHECK (length(review) <= 1500),
  tools         text NOT NULL DEFAULT '' CHECK (length(tools) <= 1500),
  flagship_ids  uuid[] NOT NULL DEFAULT '{}'::uuid[] CHECK (cardinality(flagship_ids) <= 3),
  updated_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.division_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "division pages are public" ON public.division_pages;
CREATE POLICY "division pages are public" ON public.division_pages FOR SELECT USING (true);
GRANT SELECT ON public.division_pages TO anon, authenticated;
GRANT ALL ON public.division_pages TO service_role;

INSERT INTO public.division_pages (division, standards, review, tools) VALUES
  ('equity',
   'Every report covers one listed company, or one industry ahead of the company reports that follow it. A company report opens with a one-page summary: the recommendation, the target price and upside, the investment thesis, the valuation and the key risks. It then sets out the company, the industry (PESTEL and Porter''s five forces), a SWOT analysis, the financial analysis and forecasts, the valuation and the risks. The valuation combines an intrinsic method (a discounted cash flow model, or a dividend discount or residual income model for banks and insurers) with trading multiples, usually weighted equally, and always shows a sensitivity table.',
   'Each report is written by a team of three to six analysts under a Lead Analyst, and is supervised by the Head and Co-Head of Equity Research, who are named on the cover. A report by a member who is not a Head waits as a draft until a Head publishes it.',
   'Market data and estimates from Bloomberg, LSEG Workspace (Refinitiv) and S&P Capital IQ; company filings and presentations; Damodaran''s data for risk premia and betas; rating agencies; industry research from sources such as Statista, McKinsey, PwC and Gartner.'),
  ('investment',
   'The division publishes a Global Outlook twice a year, and occasional Trade Ideas. Each Outlook reviews the markets and the outlook for the main economies (United States, euro area, United Kingdom, China, Japan and emerging markets), covers the period''s themes in depth, and sets the asset class preferences: an underweight, neutral or overweight view on each asset class, strategic and tactical, next to the previous view, with the reasoning for fixed income by duration and credit quality, equity regions and sectors, currencies and commodities, over a horizon of six to twelve months.',
   'The Outlook is written by three desks (Fixed Income, Equities, and FX and Commodities), each with a Lead Strategist, under the Head and Co-Head of Investment Research. Each exposure is discussed with and approved by the whole team before publication, and every report names all its contributors.',
   'Bloomberg and LSEG (Refinitiv) market data; releases of central banks, the IMF, the OECD and national statistics offices; ICE BofA and MSCI indices; CFTC positioning data; econometric tests such as cointegration, VECM and GARCH models where a view rests on them.'),
  ('macro',
   'Every report states its research question and scope, sets out the institutional and historical background, and analyses the subject by channel or by economy. Country chapters follow one template: economic and political context; inflation and monetary policy; fiscal policy and public finances; external sector and geopolitical exposure; key risks and upcoming events. Figures and tables carry their sources, and each report closes with its policy and market implications, a conclusion and a full reference list. Issues of the Research Focus series add an abstract and, where relevant, a formal model set against the academic literature.',
   'Reports are written by groups of analysts, each with a Group Leader, under the Head and Co-Head of Macro Research, who supervise the series; every contributor is named. A report can also receive an external review, which is acknowledged in the text.',
   'IMF (World Economic Outlook, Article IV reports, COFER), BIS, ECB, Federal Reserve and FRED, Eurostat, OECD and World Bank data; national statistics offices and central banks; peer-reviewed papers and central bank working papers; research from international institutions and the financial press.'),
  ('portfolio',
   'Each fund publishes a report at its semi-annual rebalancing, with adjustment notes in between. A report sets out the mandate and the investment approach, a market update, key statistics since inception and over the last twelve months, the monthly performance table, the main contributors and detractors, the rebalancing rationale with every entry, exit and weight change, the allocation by asset class, sector, currency and geography, the outlook for the next six months and the methodological notes. Performance is measured on a simulated portfolio, net, in EUR.',
   'An analyst proposes an idea and discusses it with the team; an approved idea gets a full analysis of its return potential and risk. Equity Research recommendations are reviewed again for later news and valuation changes before they enter a portfolio. Each fund''s Portfolio Manager takes the final decision, under the Head of Portfolio Management, and Quantitative Research contributes risk measures such as Value at Risk and Expected Shortfall.',
   'LSEG Workspace and Bloomberg for prices and fundamentals; Python models for factor construction, factor weighting, principal component diagnostics and risk measures; mean-variance optimisation and hierarchical risk parity in earlier allocations; the research of the other divisions for ideas and macroeconomic views.'),
  ('quant',
   'Every paper states its research question, develops the theory with its derivations, describes the data with sources, sample periods and the treatment of missing values, and sets out the method. Results come with their validation, such as out-of-sample tests, bootstrap or heteroskedasticity-robust standard errors, residual diagnostics, convergence checks and repricing tests, followed by an explicit section on limitations, a conclusion and numbered references to the primary literature.',
   'Papers are written by small teams of analysts and are, in most cases, co-authored by the Head of Quantitative Research. Joint papers with other divisions, such as Macro Research, name every contributor. Every paper carries an academic disclaimer.',
   'Python, with libraries such as scikit-learn, Keras, PyTorch and iisignature; Monte Carlo, PDE and Fourier methods; data from FRED, Yahoo Finance, FactSet, Robert Shiller''s dataset and published regulatory and market datasets.')
ON CONFLICT (division) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. /track-record: the figures behind it, in one read. Counts only; no
--    personal data. The totals are the registry's own, so the page and
--    the figures section can never disagree.
-- ---------------------------------------------------------------------
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
       (SELECT max(created_at) FROM public.semester_snapshots)),
    'research', COALESCE((SELECT jsonb_agg(jsonb_build_object('year', year, 'division', division, 'reports', n, 'pages', pages, 'pages_known', pages_known)
                                           ORDER BY year, division) FROM reports), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                          'year', ev.year, 'events', ev.events, 'with_guests', ev.with_guests,
                          'speakers', COALESCE(sp.speakers, 0), 'alumni_calls', ev.alumni_calls,
                          'company_visits', ev.company_visits) ORDER BY ev.year)
                          FROM ev LEFT JOIN sp USING (year)), '[]'::jsonb),
    'company_visits_before_archive', 4,
    'semesters', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                             'key', semester_key, 'label', semester_label,
                             'members', members_count, 'alumni', alumni_count) ORDER BY semester_key)
                             FROM public.semester_snapshots), '[]'::jsonb),
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

-- The page's own figures section.
INSERT INTO public.key_number_pages (page_key, slug, position) VALUES
  ('track-record', 'reports_published', 1), ('track-record', 'pages_published', 2),
  ('track-record', 'years_publishing', 3), ('track-record', 'funds_run', 4),
  ('track-record', 'events_held', 5), ('track-record', 'alumni', 6)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. The untouched originals of the report PDFs. Before the first time a
--    report's PDF gets its metadata written, the original is copied here;
--    private, read by nobody but the service role.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('archive-originals', 'archive-originals', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. First computation with the new method, reported.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_pub int;
  v_list text;
BEGIN
  v_pub := public.refresh_key_numbers();
  SELECT string_agg(slug || ' = ' || COALESCE(value::text, 'none') || CASE WHEN status = 'draft' THEN ' (withheld)' ELSE '' END, '; ' ORDER BY slug)
    INTO v_list FROM public.key_numbers WHERE slug LIKE 'fund_%';
  RAISE NOTICE 'Key numbers: % published. Funds: %', v_pub, v_list;
  RAISE NOTICE 'Reports: % with an address, % with authors, % without.',
    (SELECT count(*) FROM public.archive_files WHERE slug IS NOT NULL),
    (SELECT count(*) FROM public.archive_files WHERE jsonb_array_length(authors) > 0),
    (SELECT count(*) FROM public.archive_files WHERE status = 'published' AND deleted_at IS NULL AND jsonb_array_length(authors) = 0);
END $$;
