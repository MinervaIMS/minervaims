-- =====================================================================
-- Alumni city format: one canonical "City, Country" for every record.
-- ---------------------------------------------------------------------
-- The city was a free-text field, so the same place was stored as
-- "Milan", "Milano", "milan" and "Milan, Italy" and the public city
-- filter listed each spelling as a separate option. This migration
-- rewrites the historic rows to the canonical form and installs a
-- trigger so every future insert or update is normalised on the way in,
-- whoever writes it (workspace form, import, direct SQL).
--
-- The mapping matches src/lib/city-format.ts exactly, so the client and
-- the database always agree on how a city is spelled. A city that is not
-- in the table is left untouched: guessing a country is worse than
-- leaving the value alone.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.city_country (
  alias   text PRIMARY KEY,
  city    text NOT NULL,
  country text NOT NULL
);

ALTER TABLE public.city_country ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "City reference readable by everyone" ON public.city_country;
CREATE POLICY "City reference readable by everyone"
  ON public.city_country FOR SELECT USING (true);

TRUNCATE public.city_country;

INSERT INTO public.city_country (alias, city, country) VALUES
  ('milan', 'Milan', 'Italy'),
  ('milano', 'Milan', 'Italy'),
  ('rome', 'Rome', 'Italy'),
  ('roma', 'Rome', 'Italy'),
  ('turin', 'Turin', 'Italy'),
  ('torino', 'Turin', 'Italy'),
  ('bologna', 'Bologna', 'Italy'),
  ('florence', 'Florence', 'Italy'),
  ('firenze', 'Florence', 'Italy'),
  ('naples', 'Naples', 'Italy'),
  ('napoli', 'Naples', 'Italy'),
  ('genoa', 'Genoa', 'Italy'),
  ('genova', 'Genoa', 'Italy'),
  ('venice', 'Venice', 'Italy'),
  ('venezia', 'Venice', 'Italy'),
  ('verona', 'Verona', 'Italy'),
  ('padua', 'Padua', 'Italy'),
  ('padova', 'Padua', 'Italy'),
  ('brescia', 'Brescia', 'Italy'),
  ('bergamo', 'Bergamo', 'Italy'),
  ('bari', 'Bari', 'Italy'),
  ('palermo', 'Palermo', 'Italy'),
  ('catania', 'Catania', 'Italy'),
  ('trieste', 'Trieste', 'Italy'),
  ('parma', 'Parma', 'Italy'),
  ('modena', 'Modena', 'Italy'),
  ('treviso', 'Treviso', 'Italy'),
  ('vicenza', 'Vicenza', 'Italy'),
  ('ancona', 'Ancona', 'Italy'),
  ('pisa', 'Pisa', 'Italy'),
  ('perugia', 'Perugia', 'Italy'),
  ('cagliari', 'Cagliari', 'Italy'),
  ('london', 'London', 'United Kingdom'),
  ('edinburgh', 'Edinburgh', 'United Kingdom'),
  ('manchester', 'Manchester', 'United Kingdom'),
  ('cambridge', 'Cambridge', 'United Kingdom'),
  ('oxford', 'Oxford', 'United Kingdom'),
  ('glasgow', 'Glasgow', 'United Kingdom'),
  ('birmingham', 'Birmingham', 'United Kingdom'),
  ('bristol', 'Bristol', 'United Kingdom'),
  ('leeds', 'Leeds', 'United Kingdom'),
  ('new york', 'New York', 'United States'),
  ('nyc', 'New York', 'United States'),
  ('new york city', 'New York', 'United States'),
  ('boston', 'Boston', 'United States'),
  ('chicago', 'Chicago', 'United States'),
  ('san francisco', 'San Francisco', 'United States'),
  ('los angeles', 'Los Angeles', 'United States'),
  ('houston', 'Houston', 'United States'),
  ('miami', 'Miami', 'United States'),
  ('seattle', 'Seattle', 'United States'),
  ('atlanta', 'Atlanta', 'United States'),
  ('philadelphia', 'Philadelphia', 'United States'),
  ('dallas', 'Dallas', 'United States'),
  ('austin', 'Austin', 'United States'),
  ('denver', 'Denver', 'United States'),
  ('washington', 'Washington', 'United States'),
  ('washington dc', 'Washington', 'United States'),
  ('new jersey', 'New Jersey', 'United States'),
  ('princeton', 'Princeton', 'United States'),
  ('stanford', 'Stanford', 'United States'),
  ('berkeley', 'Berkeley', 'United States'),
  ('palo alto', 'Palo Alto', 'United States'),
  ('charlotte', 'Charlotte', 'United States'),
  ('zurich', 'Zurich', 'Switzerland'),
  ('zuerich', 'Zurich', 'Switzerland'),
  ('geneva', 'Geneva', 'Switzerland'),
  ('geneve', 'Geneva', 'Switzerland'),
  ('lugano', 'Lugano', 'Switzerland'),
  ('basel', 'Basel', 'Switzerland'),
  ('lausanne', 'Lausanne', 'Switzerland'),
  ('bern', 'Bern', 'Switzerland'),
  ('frankfurt', 'Frankfurt', 'Germany'),
  ('frankfurt am main', 'Frankfurt', 'Germany'),
  ('munich', 'Munich', 'Germany'),
  ('muenchen', 'Munich', 'Germany'),
  ('berlin', 'Berlin', 'Germany'),
  ('hamburg', 'Hamburg', 'Germany'),
  ('cologne', 'Cologne', 'Germany'),
  ('dusseldorf', 'Dusseldorf', 'Germany'),
  ('stuttgart', 'Stuttgart', 'Germany'),
  ('mannheim', 'Mannheim', 'Germany'),
  ('paris', 'Paris', 'France'),
  ('lyon', 'Lyon', 'France'),
  ('marseille', 'Marseille', 'France'),
  ('toulouse', 'Toulouse', 'France'),
  ('nice', 'Nice', 'France'),
  ('bordeaux', 'Bordeaux', 'France'),
  ('madrid', 'Madrid', 'Spain'),
  ('barcelona', 'Barcelona', 'Spain'),
  ('lisbon', 'Lisbon', 'Portugal'),
  ('lisboa', 'Lisbon', 'Portugal'),
  ('porto', 'Porto', 'Portugal'),
  ('amsterdam', 'Amsterdam', 'Netherlands'),
  ('rotterdam', 'Rotterdam', 'Netherlands'),
  ('the hague', 'The Hague', 'Netherlands'),
  ('utrecht', 'Utrecht', 'Netherlands'),
  ('brussels', 'Brussels', 'Belgium'),
  ('bruxelles', 'Brussels', 'Belgium'),
  ('antwerp', 'Antwerp', 'Belgium'),
  ('luxembourg', 'Luxembourg', 'Luxembourg'),
  ('dublin', 'Dublin', 'Ireland'),
  ('vienna', 'Vienna', 'Austria'),
  ('wien', 'Vienna', 'Austria'),
  ('copenhagen', 'Copenhagen', 'Denmark'),
  ('stockholm', 'Stockholm', 'Sweden'),
  ('oslo', 'Oslo', 'Norway'),
  ('helsinki', 'Helsinki', 'Finland'),
  ('warsaw', 'Warsaw', 'Poland'),
  ('warszawa', 'Warsaw', 'Poland'),
  ('krakow', 'Krakow', 'Poland'),
  ('prague', 'Prague', 'Czech Republic'),
  ('praha', 'Prague', 'Czech Republic'),
  ('budapest', 'Budapest', 'Hungary'),
  ('bucharest', 'Bucharest', 'Romania'),
  ('athens', 'Athens', 'Greece'),
  ('istanbul', 'Istanbul', 'Turkey'),
  ('ankara', 'Ankara', 'Turkey'),
  ('moscow', 'Moscow', 'Russia'),
  ('kyiv', 'Kyiv', 'Ukraine'),
  ('kiev', 'Kyiv', 'Ukraine'),
  ('sofia', 'Sofia', 'Bulgaria'),
  ('belgrade', 'Belgrade', 'Serbia'),
  ('zagreb', 'Zagreb', 'Croatia'),
  ('ljubljana', 'Ljubljana', 'Slovenia'),
  ('valletta', 'Valletta', 'Malta'),
  ('monaco', 'Monaco', 'Monaco'),
  ('dubai', 'Dubai', 'United Arab Emirates'),
  ('abu dhabi', 'Abu Dhabi', 'United Arab Emirates'),
  ('doha', 'Doha', 'Qatar'),
  ('riyadh', 'Riyadh', 'Saudi Arabia'),
  ('tel aviv', 'Tel Aviv', 'Israel'),
  ('singapore', 'Singapore', 'Singapore'),
  ('hong kong', 'Hong Kong', 'Hong Kong'),
  ('tokyo', 'Tokyo', 'Japan'),
  ('shanghai', 'Shanghai', 'China'),
  ('beijing', 'Beijing', 'China'),
  ('shenzhen', 'Shenzhen', 'China'),
  ('seoul', 'Seoul', 'South Korea'),
  ('mumbai', 'Mumbai', 'India'),
  ('delhi', 'Delhi', 'India'),
  ('bangalore', 'Bangalore', 'India'),
  ('sydney', 'Sydney', 'Australia'),
  ('melbourne', 'Melbourne', 'Australia'),
  ('toronto', 'Toronto', 'Canada'),
  ('montreal', 'Montreal', 'Canada'),
  ('vancouver', 'Vancouver', 'Canada'),
  ('sao paulo', 'Sao Paulo', 'Brazil'),
  ('rio de janeiro', 'Rio de Janeiro', 'Brazil'),
  ('mexico city', 'Mexico City', 'Mexico'),
  ('buenos aires', 'Buenos Aires', 'Argentina'),
  ('santiago', 'Santiago', 'Chile'),
  ('bogota', 'Bogota', 'Colombia'),
  ('lima', 'Lima', 'Peru'),
  ('johannesburg', 'Johannesburg', 'South Africa'),
  ('cape town', 'Cape Town', 'South Africa'),
  ('cairo', 'Cairo', 'Egypt'),
  ('lagos', 'Lagos', 'Nigeria'),
  ('nairobi', 'Nairobi', 'Kenya')ON CONFLICT (alias) DO UPDATE SET city = EXCLUDED.city, country = EXCLUDED.country;

-- Lower-case, accent-free, single-spaced: the lookup key, mirroring key() in
-- src/lib/city-format.ts. unaccent() is not assumed to be installed.
CREATE OR REPLACE FUNCTION public.city_key(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      COALESCE(value, ''),
      'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñŠšŽžÝýÿ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnSsZzYyy'
    )),
    '\s+', ' ', 'g'));
$$;

-- Canonical "City, Country" for a free-typed value.
CREATE OR REPLACE FUNCTION public.normalise_city(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  raw          text;
  city_part    text;
  country_part text;
  hit          public.city_country%ROWTYPE;
BEGIN
  raw := btrim(regexp_replace(COALESCE(value, ''), '\s+', ' ', 'g'));
  IF raw = '' THEN
    RETURN NULL;
  END IF;

  IF position(',' IN raw) > 0 THEN
    city_part    := btrim(split_part(raw, ',', 1));
    country_part := btrim(substring(raw FROM position(',' IN raw) + 1));
  ELSE
    city_part    := raw;
    country_part := NULL;
  END IF;

  SELECT * INTO hit FROM public.city_country WHERE alias = public.city_key(city_part);

  IF FOUND THEN
    -- An unfamiliar country half is respected: it may be a real move
    -- (a namesake city elsewhere) rather than a typo.
    IF country_part IS NULL
       OR public.city_key(country_part) = public.city_key(hit.country)
       OR EXISTS (SELECT 1 FROM public.city_country c
                  WHERE public.city_key(c.country) = public.city_key(country_part)
                    AND c.alias = public.city_key(city_part))
    THEN
      RETURN hit.city || ', ' || hit.country;
    END IF;
  END IF;

  RETURN raw;
END;
$$;

-- Backfill every historic alumni record.
UPDATE public.alumni
   SET city = public.normalise_city(city)
 WHERE city IS NOT NULL
   AND city <> ''
   AND public.normalise_city(city) IS DISTINCT FROM city;

-- Keep every future write canonical, whatever the source.
CREATE OR REPLACE FUNCTION public.alumni_normalise_city()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.city := public.normalise_city(NEW.city);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alumni_normalise_city_trg ON public.alumni;
CREATE TRIGGER alumni_normalise_city_trg
  BEFORE INSERT OR UPDATE OF city ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.alumni_normalise_city();

-- Data API access for the city reference table (read-only lookup).
GRANT SELECT ON public.city_country TO anon, authenticated;
GRANT ALL ON public.city_country TO service_role;
