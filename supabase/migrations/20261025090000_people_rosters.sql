-- =====================================================================
-- Step 94: people, semester rosters and the Board.
-- ---------------------------------------------------------------------
-- 1. ONE PERSON, ONE CODE. Every member, past member and alumnus is one
--    person (public.people) with a short random code ('P-7K3Q9X') that
--    never changes and carries no meaning. It is strictly internal: it
--    links a person's member record, alumni record, semester rosters and
--    certificates, so that a member who becomes an alumnus keeps one
--    history. The links live in their own table (person_records), so the
--    members and alumni tables are not rewritten: their rows, their
--    triggers and their audit trail are untouched.
-- 2. SEMESTER ROSTERS. public.roster_entries holds who held which role,
--    in which division and team, in each past semester: Fall 2019 to
--    Spring 2026 from the roster workbook (reports, the association's
--    old Drive and the President's lists), and from now on the semester
--    register the fee collection freezes, refreshed with the live roles
--    on the last day of the semester. The current semester is always
--    read live from the member register, which is also the source of the
--    public Members page (team_members): one roster, two views.
-- 3. ACCESS, in the database: the Board and Operations see every roster,
--    members from Analyst upward the rosters of their own division; only
--    the President and the Vice-President change a past roster (through
--    the admin-rosters function, which records each change). Person
--    codes are shown only to the President, the Vice-President and the
--    Head of Operations. Every read is a function that checks the caller.
-- 4. PAST BOARDS, public: each past semester's Board of Directors
--    (officers and heads, name and office only), for the Members page,
--    leaving out anyone who asked to be left out and anyone expelled.
-- 5. ALUMNI. A backup of the alumni directory is taken first; nine
--    spelling corrections from the alumni workbook are applied; the 33
--    former members who are not yet in the directory are listed as
--    "to complete" (the directory needs a graduation year, which the
--    workbook does not have, so a person adds each one in People, Alumni).
-- 6. The offer email's subject no longer names the Society twice.
--
-- Idempotent: safe to run twice. Nothing is deleted. The history import
-- runs only while the table holds no history, so a correction made in the
-- workspace is never overwritten by a second run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Helpers: a name key, the semester calendar.
-- ---------------------------------------------------------------------

-- A person's name, reduced for matching: lower case, accents removed,
-- anything that is not a letter turned into one space. "D'Agata" and
-- "D'agata", "Rombolà" and "Rombola" give the same key.
CREATE OR REPLACE FUNCTION public.person_name_key(p_first text, p_surname text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(lower(translate(
    coalesce(p_first, '') || ' ' || coalesce(p_surname, ''),
    'ÀÁÂÃÄÅĀĂĄàáâãäåāăąÇĆČçćčĎĐďđÈÉÊËĒĖĘĚèéêëēėęěÌÍÎÏĪĮİìíîïīįıŁĹĽłĺľÑŃŇñńňÒÓÔÕÖØŌŐòóôõöøōőŔŘŕřŚŠŞśšşŤŢťţÙÚÛÜŪŮŰŲùúûüūůűųÝŸýÿŹŻŽźżžßÆæŒœ',
    'AAAAAAAAAaaaaaaaaaCCCcccDDddEEEEEEEEeeeeeeeeIIIIIIIiiiiiiiLLLlllNNNnnnOOOOOOOOooooooooRRrrSSSsssTTttUUUUUUUUuuuuuuuuYYyyZZZzzzsAaOo'
  )), '[^a-z]+', ' ', 'g'))
$$;

-- Semesters: Fall runs from September to January, Spring from February
-- to August, the rule the fee register already uses (admin-fees).
CREATE OR REPLACE FUNCTION public.current_semester_key()
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE WHEN m >= 9 THEN y || '-fall' WHEN m = 1 THEN (y - 1) || '-fall' ELSE y || '-spring' END
  FROM (SELECT extract(month FROM d)::int AS m, extract(year FROM d)::int AS y
          FROM (SELECT (now() AT TIME ZONE 'Europe/Rome')::date AS d) t) x
$$;

CREATE OR REPLACE FUNCTION public.semester_ordinal(p_key text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT split_part(p_key, '-', 1)::int * 2 + CASE WHEN split_part(p_key, '-', 2) = 'fall' THEN 1 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.semester_label(p_key text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT initcap(split_part(p_key, '-', 2)) || ' ' || split_part(p_key, '-', 1)
$$;


-- ---------------------------------------------------------------------
-- 1. People and their codes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE CHECK (code ~ '^P-[0-9A-HJKMNP-TV-Z]{6}$'),
  first_name     text NOT NULL,
  surname        text NOT NULL,
  name_key       text NOT NULL,
  -- Left out of the public past Boards, on the person's request (an
  -- objection under the Privacy Policy, section 9).
  public_hidden  boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS people_name_key_idx ON public.people (name_key);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.people FROM anon, authenticated;
GRANT ALL ON public.people TO service_role;

-- Six characters from an alphabet with no I, L, O or U, so a code read
-- aloud or copied by hand cannot be misread: 32^6, about a billion codes.
CREATE OR REPLACE FUNCTION public.person_new_code()
RETURNS text
LANGUAGE plpgsql VOLATILE
SET search_path = public
AS $$
DECLARE
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
  i int;
BEGIN
  LOOP
    v_code := 'P-';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * 32)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.people WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- A code is assigned once and never changes; the name key follows the name.
CREATE OR REPLACE FUNCTION public.people_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.code IS NULL OR NEW.code = '' THEN NEW.code := public.person_new_code(); END IF;
  ELSIF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'A person code never changes.';
  END IF;
  NEW.first_name := btrim(NEW.first_name);
  NEW.surname := btrim(NEW.surname);
  NEW.name_key := public.person_name_key(NEW.first_name, NEW.surname);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS people_guard ON public.people;
CREATE TRIGGER people_guard BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_guard();

CREATE OR REPLACE FUNCTION public.person_create(p_first text, p_surname text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.people (code, first_name, surname, name_key)
  VALUES (public.person_new_code(), p_first, p_surname, '')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Which records belong to which person. Kept apart from the members and
-- alumni tables on purpose: linking a person changes none of their rows.
CREATE TABLE IF NOT EXISTS public.person_records (
  person_id    uuid NOT NULL REFERENCES public.people (id) ON DELETE CASCADE,
  record_type  text NOT NULL CHECK (record_type IN ('member', 'alumni')),
  record_id    uuid NOT NULL,
  linked_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (record_type, record_id)
);
CREATE INDEX IF NOT EXISTS person_records_person_idx ON public.person_records (person_id);

ALTER TABLE public.person_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.person_records FROM anon, authenticated;
GRANT ALL ON public.person_records TO service_role;

-- The one person with this name who has no record of this kind yet, if
-- there is exactly one; otherwise none (a namesake is never guessed).
CREATE OR REPLACE FUNCTION public.person_match(p_first text, p_surname text, p_type text)
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(p.id))[1] END
  FROM public.people p
  WHERE p.name_key = public.person_name_key(p_first, p_surname)
    AND NOT EXISTS (SELECT 1 FROM public.person_records r WHERE r.person_id = p.id AND r.record_type = p_type)
$$;

-- The person of a member, created when there is none yet.
CREATE OR REPLACE FUNCTION public.person_for_member(p_member uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  m record;
BEGIN
  SELECT person_id INTO v_person FROM public.person_records WHERE record_type = 'member' AND record_id = p_member;
  IF v_person IS NOT NULL THEN RETURN v_person; END IF;
  SELECT id, first_name, surname INTO m FROM public.members WHERE id = p_member;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_person := coalesce(public.person_match(m.first_name, m.surname, 'member'), public.person_create(m.first_name, m.surname));
  INSERT INTO public.person_records (person_id, record_type, record_id) VALUES (v_person, 'member', p_member)
  ON CONFLICT (record_type, record_id) DO NOTHING;
  RETURN v_person;
END;
$$;

-- The person of an alumnus: the member they were (same name), the
-- roster person they were, or a new person.
CREATE OR REPLACE FUNCTION public.person_for_alumni(p_alumni uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  a record;
BEGIN
  SELECT person_id INTO v_person FROM public.person_records WHERE record_type = 'alumni' AND record_id = p_alumni;
  IF v_person IS NOT NULL THEN RETURN v_person; END IF;
  SELECT id, name, surname INTO a FROM public.alumni WHERE id = p_alumni;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_person := coalesce(public.person_match(a.name, a.surname, 'alumni'), public.person_create(a.name, a.surname));
  INSERT INTO public.person_records (person_id, record_type, record_id) VALUES (v_person, 'alumni', p_alumni)
  ON CONFLICT (record_type, record_id) DO NOTHING;
  RETURN v_person;
END;
$$;

-- The person helpers are the server's alone: nobody signed in or
-- anonymous may create or match a person through the API.
REVOKE ALL ON FUNCTION public.person_new_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.person_create(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.person_match(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.person_for_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.person_for_alumni(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.person_new_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.person_create(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.person_match(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.person_for_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.person_for_alumni(uuid) TO service_role;

-- New members and new alumni are linked as they are created. A failure
-- here never stops the insert: the record is saved, and linked later.
CREATE OR REPLACE FUNCTION public.person_link_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.person_for_member(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'person_link_new_member: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS person_link_new_member ON public.members;
CREATE TRIGGER person_link_new_member AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.person_link_new_member();

CREATE OR REPLACE FUNCTION public.person_link_new_alumni()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  v_pending uuid;
BEGIN
  BEGIN
    -- A former member waiting in "to complete" is this person: link them
    -- and close the item.
    SELECT ap.id, ap.person_id INTO v_pending, v_person
    FROM public.alumni_pending ap JOIN public.people p ON p.id = ap.person_id
    WHERE ap.status = 'open' AND p.name_key = public.person_name_key(NEW.name, NEW.surname)
    ORDER BY ap.created_at LIMIT 1;
    IF v_pending IS NOT NULL THEN
      INSERT INTO public.person_records (person_id, record_type, record_id) VALUES (v_person, 'alumni', NEW.id)
      ON CONFLICT (record_type, record_id) DO NOTHING;
      UPDATE public.alumni_pending SET status = 'added', alumni_id = NEW.id, resolved_at = now() WHERE id = v_pending;
    ELSE
      PERFORM public.person_for_alumni(NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'person_link_new_alumni: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- A deleted record leaves the person and their history in place
-- (the semester rosters are the association's historical record).
CREATE OR REPLACE FUNCTION public.person_unlink_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    DELETE FROM public.person_records WHERE record_type = TG_ARGV[0] AND record_id = OLD.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'person_unlink_record: %', SQLERRM;
  END;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS person_unlink_member ON public.members;
CREATE TRIGGER person_unlink_member AFTER DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.person_unlink_record('member');
DROP TRIGGER IF EXISTS person_unlink_alumni ON public.alumni;
CREATE TRIGGER person_unlink_alumni AFTER DELETE ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.person_unlink_record('alumni');


-- ---------------------------------------------------------------------
-- 2. Roles, divisions and offices, in the roster's own words.
-- ---------------------------------------------------------------------

-- A role as the roster writes it: "Equity Research Analyst", "Head of
-- Macro Research", "Portfolio Management Analyst".
CREATE OR REPLACE FUNCTION public.roster_role_label(p_role public.app_role, p_division public.org_division)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_role::text
    WHEN 'president' THEN 'President'
    WHEN 'vice_president' THEN 'Vice President'
    WHEN 'head_of_asset_management' THEN 'Head of Asset Management'
    WHEN 'head_of_division' THEN coalesce('Head of ' || d.name, 'Head of Division')
    WHEN 'head_of_equity' THEN 'Head of Equity Research'
    WHEN 'head_of_investment' THEN 'Head of Investment Research'
    WHEN 'head_of_macro' THEN 'Head of Macro Research'
    WHEN 'head_of_portfolio' THEN 'Head of Portfolio Management'
    WHEN 'head_of_quant' THEN 'Head of Quantitative Research'
    WHEN 'head_of_media' THEN 'Head of Media & Communication'
    WHEN 'head_of_operations' THEN 'Head of Operations'
    WHEN 'portfolio_manager' THEN 'Portfolio Manager'
    WHEN 'team_leader' THEN coalesce(d.name || ' Team Leader', 'Team Leader')
    WHEN 'senior_analyst' THEN coalesce(d.name || ' Senior Analyst', 'Senior Analyst')
    WHEN 'analyst' THEN coalesce(d.name || ' Analyst', 'Analyst')
    WHEN 'media_analyst' THEN 'Media & Communication Analyst'
    WHEN 'operations_analyst' THEN 'Operations Analyst'
    WHEN 'advisor' THEN 'Advisor'
    WHEN 'silent_advisor' THEN 'Advisor'
    ELSE 'Member'
  END
  FROM (SELECT CASE p_division::text
          WHEN 'equity' THEN 'Equity Research' WHEN 'investment' THEN 'Investment Research'
          WHEN 'macro' THEN 'Macro Research' WHEN 'portfolio' THEN 'Portfolio Management'
          WHEN 'quant' THEN 'Quantitative Research' WHEN 'media' THEN 'Media & Communication'
          WHEN 'operations' THEN 'Operations' END AS name) d
$$;

CREATE OR REPLACE FUNCTION public.roster_division_key(p_role public.app_role, p_division public.org_division)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_role::text IN ('president', 'vice_president') THEN 'board'
    WHEN p_role::text = 'head_of_asset_management' THEN 'asset_management'
    WHEN p_role::text IN ('head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant')
      THEN replace(p_role::text, 'head_of_', '')
    WHEN p_role::text IN ('head_of_media', 'media_analyst') THEN 'media'
    WHEN p_role::text IN ('head_of_operations', 'operations_analyst') THEN 'operations'
    WHEN p_role::text = 'portfolio_manager' THEN 'portfolio'
    WHEN p_division::text IN ('equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations') THEN p_division::text
    ELSE 'none'
  END
$$;

-- A team only where the division has teams: a fund in Portfolio
-- Management, a desk in Investment Research.
CREATE OR REPLACE FUNCTION public.roster_team_key(p_division text, p_team text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_division = 'portfolio' AND p_team IN ('long-short', 'multi-asset', 'dps', 'pir') THEN p_team
    WHEN p_division = 'investment' AND p_team IN ('equities', 'fixed-income', 'fx-commodities') THEN p_team
    WHEN p_division = 'research' AND p_team = 'hercle-project' THEN p_team
  END
$$;

-- THE BOARD. An office's place in the Board, or NULL for a role that is
-- not on the Board. Officers first (below 50), then the heads, in the
-- Statute's order (Art. 14); older offices keep their place in it.
-- Mirrored in src/lib/rosters.ts (OFFICES); scripts/people.test.mjs
-- checks that the two lists agree.
CREATE OR REPLACE FUNCTION public.roster_office_rank(p_label text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT o.rank FROM (VALUES
    ('President', 10), ('President (outgoing)', 11),
    ('Vice President', 20), ('Vice President - External Relations Manager', 21),
    ('Head of Asset Management', 30), ('Head of Research', 31),
    ('External Relations', 40), ('Board Member', 41),
    ('Head of Equity Research', 50), ('Co-Head of Equity Research', 51),
    ('Head of Investment Research', 52), ('Co-Head of Investment Research', 53),
    ('Head of Macro Research', 54), ('Co-Head of Macro Research', 55),
    ('Head of Portfolio Management', 56), ('Co-Head of Portfolio Management', 57),
    ('Head of Quantitative Research', 58), ('Co-Head of Quantitative Research', 59),
    ('Head of Risk Management', 60), ('Co-Head of Risk Management', 61),
    ('Head of Markets & Alternatives Research', 62), ('Co-Head of Markets & Alternatives Research', 63),
    ('Head of Media & Communication', 70), ('Co-Head of Media & Communication', 71),
    ('Head of Operations', 72), ('Co-Head of Operations', 73)
  ) AS o (label, rank)
  WHERE o.label = p_label
$$;


-- ---------------------------------------------------------------------
-- 3. The rosters.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES public.people (id) ON DELETE CASCADE,
  semester_key  text NOT NULL CHECK (semester_key ~ '^[0-9]{4}-(fall|spring)$'),
  role_label    text NOT NULL CHECK (length(btrim(role_label)) BETWEEN 1 AND 120),
  division_key  text NOT NULL CHECK (division_key IN ('board', 'asset_management', 'research', 'portfolio', 'equity',
                  'investment', 'macro', 'quant', 'risk', 'markets_alternatives', 'media', 'operations', 'none')),
  team          text CHECK (team IS NULL OR team IN ('long-short', 'multi-asset', 'dps', 'pir', 'equities',
                  'fixed-income', 'fx-commodities', 'hercle-project')),
  -- history: the roster workbook; register: frozen with the fee
  -- collection; close: the live roles on the semester's last day;
  -- edit: a correction by the President or the Vice-President.
  source        text NOT NULL DEFAULT 'history' CHECK (source IN ('history', 'register', 'close', 'edit')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid,
  UNIQUE (person_id, semester_key, role_label, division_key)
);
CREATE INDEX IF NOT EXISTS roster_entries_semester_idx ON public.roster_entries (semester_key);
CREATE INDEX IF NOT EXISTS roster_entries_person_idx ON public.roster_entries (person_id);

ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roster_entries FROM anon, authenticated;
GRANT ALL ON public.roster_entries TO service_role;

-- The live roster: the member register as it stands, the same people the
-- public Members page is projected from (advisors are outside it).
CREATE OR REPLACE FUNCTION public.roster_live()
RETURNS TABLE (person_id uuid, member_id uuid, first_name text, surname text,
               role_label text, division_key text, team text, status text)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.person_id, m.id, m.first_name, m.surname,
         public.roster_role_label(m.role, m.division),
         public.roster_division_key(m.role, m.division),
         public.roster_team_key(public.roster_division_key(m.role, m.division), m.team),
         m.membership_status
  FROM public.members m
  LEFT JOIN public.person_records pr ON pr.record_type = 'member' AND pr.record_id = m.id
  WHERE m.membership_status IN ('active', 'on_exchange', 'one_semester_pause')
    AND m.role::text NOT IN ('admin', 'candidate', 'pending', 'member', 'alumni', 'advisor', 'silent_advisor')
$$;
REVOKE ALL ON FUNCTION public.roster_live() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_live() TO service_role;

-- When the fee collection freezes a semester's register, its people
-- enter that semester's roster, unless the semester came from the
-- history import. Never stops the register from being written.
CREATE OR REPLACE FUNCTION public.roster_from_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  v_role public.app_role;
  v_division public.org_division;
  v_team text;
  v_div text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM public.roster_entries e
      USING public.person_records r
      WHERE r.record_type = 'member' AND r.record_id = OLD.member_id
        AND e.person_id = r.person_id AND e.semester_key = OLD.semester_key AND e.source = 'register';
      RETURN OLD;
    END IF;
    IF NEW.member_id IS NULL
       OR EXISTS (SELECT 1 FROM public.roster_entries WHERE semester_key = NEW.semester_key AND source = 'history') THEN
      RETURN NEW;
    END IF;
    v_person := public.person_for_member(NEW.member_id);
    IF v_person IS NULL THEN RETURN NEW; END IF;
    v_role := NEW.role::public.app_role;
    v_division := coalesce(NULLIF(NEW.division, ''), 'none')::public.org_division;
    SELECT team INTO v_team FROM public.members WHERE id = NEW.member_id;
    v_div := public.roster_division_key(v_role, v_division);
    INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
    VALUES (v_person, NEW.semester_key, public.roster_role_label(v_role, v_division), v_div,
            public.roster_team_key(v_div, v_team), 'register')
    ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'roster_from_register: %', SQLERRM;
  END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS roster_from_register ON public.semester_members;
CREATE TRIGGER roster_from_register AFTER INSERT OR DELETE ON public.semester_members
  FOR EACH ROW EXECUTE FUNCTION public.roster_from_register();

-- On the semester's last day the roster takes the roles as they stand:
-- a promotion during the semester is recorded, and so is anybody active
-- who was not in the register. A correction already made by the
-- President or the Vice-President is kept as it is.
CREATE OR REPLACE FUNCTION public.roster_close_semester()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := public.current_semester_key();
  n integer := 0;
  l record;
  v_person uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.roster_entries WHERE semester_key = v_key AND source = 'history') THEN
    RETURN 0;
  END IF;
  FOR l IN SELECT * FROM public.roster_live() LOOP
    v_person := coalesce(l.person_id, public.person_for_member(l.member_id));
    CONTINUE WHEN v_person IS NULL;
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.roster_entries
                           WHERE person_id = v_person AND semester_key = v_key AND source = 'edit');
    DELETE FROM public.roster_entries
     WHERE person_id = v_person AND semester_key = v_key AND source IN ('register', 'close');
    INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
    VALUES (v_person, v_key, l.role_label, l.division_key, l.team, 'close')
    ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.roster_close_semester() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_close_semester() TO service_role;


-- ---------------------------------------------------------------------
-- 4. Who may read what.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roster_access(p_uid uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (SELECT role::text AS role, division::text AS division FROM public.user_roles WHERE user_id = p_uid),
  f AS (SELECT p_uid IS NOT NULL AND public.is_full_access(p_uid) AS is_full)
  SELECT jsonb_build_object(
    'scope', CASE
      WHEN p_uid IS NULL THEN 'none'
      WHEN (SELECT is_full FROM f) THEN 'all'
      WHEN EXISTS (SELECT 1 FROM r WHERE role IN ('vice_president', 'head_of_asset_management', 'head_of_division',
             'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant',
             'head_of_media', 'head_of_operations', 'operations_analyst', 'advisor', 'silent_advisor')) THEN 'all'
      WHEN EXISTS (SELECT 1 FROM r WHERE role IN ('portfolio_manager', 'team_leader', 'senior_analyst', 'analyst',
             'media_analyst') AND division IS NOT NULL) THEN 'division'
      ELSE 'none' END,
    'divisions', coalesce((SELECT jsonb_agg(DISTINCT division) FROM r
                             WHERE role IN ('portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'media_analyst')
                               AND division IS NOT NULL), '[]'::jsonb),
    'can_edit', coalesce((SELECT is_full FROM f), false) OR EXISTS (SELECT 1 FROM r WHERE role = 'vice_president'),
    'show_codes', coalesce((SELECT is_full FROM f), false)
                  OR EXISTS (SELECT 1 FROM r WHERE role IN ('vice_president', 'head_of_operations'))
  )
$$;
REVOKE ALL ON FUNCTION public.roster_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_access(uuid) TO service_role;

-- A division member's own division, and Risk Management for Quantitative
-- Research, which absorbed it.
CREATE OR REPLACE FUNCTION public.roster_division_visible(p_division text, p_divisions text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT p_division = ANY (p_divisions) OR (p_division = 'risk' AND 'quant' = ANY (p_divisions))
$$;

CREATE OR REPLACE FUNCTION public.roster_semesters_for(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  v_scope text := a ->> 'scope';
  v_divs text[] := ARRAY(SELECT jsonb_array_elements_text(a -> 'divisions'));
  v_now text := public.current_semester_key();
  v_out jsonb;
BEGIN
  IF v_scope = 'none' THEN RAISE EXCEPTION 'You cannot open the rosters.' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('key', k, 'label', public.semester_label(k), 'live', k = v_now, 'count', n)
                            ORDER BY public.semester_ordinal(k) DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT e.semester_key AS k, count(DISTINCT e.person_id) AS n
    FROM public.roster_entries e
    WHERE e.semester_key <> v_now
      AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_now)
      AND (v_scope = 'all' OR public.roster_division_visible(e.division_key, v_divs))
    GROUP BY e.semester_key
    UNION ALL
    SELECT v_now, count(*) FROM public.roster_live() l
    WHERE v_scope = 'all' OR public.roster_division_visible(l.division_key, v_divs)
  ) s;
  RETURN jsonb_build_object('scope', v_scope, 'divisions', a -> 'divisions', 'can_edit', (a ->> 'can_edit')::boolean,
                            'show_codes', (a ->> 'show_codes')::boolean, 'current', v_now, 'semesters', v_out);
END;
$$;
REVOKE ALL ON FUNCTION public.roster_semesters_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_semesters_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.roster_semester_for(p_uid uuid, p_key text)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  v_scope text := a ->> 'scope';
  v_divs text[] := ARRAY(SELECT jsonb_array_elements_text(a -> 'divisions'));
  v_codes boolean := (a ->> 'show_codes')::boolean;
  v_live boolean;
  v_rows jsonb;
BEGIN
  IF v_scope = 'none' THEN RAISE EXCEPTION 'You cannot open the rosters.' USING ERRCODE = '42501'; END IF;
  IF p_key IS NULL OR p_key !~ '^[0-9]{4}-(fall|spring)$' THEN
    RAISE EXCEPTION 'Unknown semester.' USING ERRCODE = '22023';
  END IF;
  v_live := p_key = public.current_semester_key();
  IF v_live THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'entry_id', NULL, 'person_id', CASE WHEN v_scope = 'all' THEN l.person_id END,
             'code', CASE WHEN v_codes THEN p.code END,
             'first_name', l.first_name, 'surname', l.surname, 'role', l.role_label,
             'division', l.division_key, 'team', l.team, 'office_rank', public.roster_office_rank(l.role_label),
             'status', l.status, 'source', 'live')
           ORDER BY public.roster_office_rank(l.role_label) NULLS LAST, l.division_key, l.role_label, l.surname, l.first_name),
           '[]'::jsonb)
    INTO v_rows
    FROM public.roster_live() l LEFT JOIN public.people p ON p.id = l.person_id
    WHERE v_scope = 'all' OR public.roster_division_visible(l.division_key, v_divs);
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'entry_id', e.id, 'person_id', CASE WHEN v_scope = 'all' THEN e.person_id END,
             'code', CASE WHEN v_codes THEN p.code END,
             'first_name', p.first_name, 'surname', p.surname, 'role', e.role_label,
             'division', e.division_key, 'team', e.team, 'office_rank', public.roster_office_rank(e.role_label),
             'status', NULL, 'source', e.source)
           ORDER BY public.roster_office_rank(e.role_label) NULLS LAST, e.division_key, e.role_label, p.surname, p.first_name),
           '[]'::jsonb)
    INTO v_rows
    FROM public.roster_entries e JOIN public.people p ON p.id = e.person_id
    WHERE e.semester_key = p_key
      AND (v_scope = 'all' OR public.roster_division_visible(e.division_key, v_divs));
  END IF;
  RETURN jsonb_build_object('key', p_key, 'label', public.semester_label(p_key), 'live', v_live,
                            'scope', v_scope, 'divisions', a -> 'divisions',
                            'can_edit', (a ->> 'can_edit')::boolean AND NOT v_live,
                            'show_codes', v_codes, 'rows', v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.roster_semester_for(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_semester_for(uuid, text) TO service_role;

-- One person's path through the Society: every semester, every role.
CREATE OR REPLACE FUNCTION public.roster_person_for(p_uid uuid, p_person uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a jsonb := public.roster_access(p_uid);
  p record;
  v_live jsonb;
  v_entries jsonb;
BEGIN
  IF a ->> 'scope' <> 'all' THEN RAISE EXCEPTION 'You cannot open a person''s history.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.people WHERE id = p_person;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown person.' USING ERRCODE = '22023'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('entry_id', e.id, 'semester', e.semester_key,
                    'label', public.semester_label(e.semester_key), 'role', e.role_label,
                    'division', e.division_key, 'team', e.team, 'source', e.source)
                  ORDER BY public.semester_ordinal(e.semester_key), public.roster_office_rank(e.role_label) NULLS LAST),
                  '[]'::jsonb)
  INTO v_entries
  FROM public.roster_entries e
  WHERE e.person_id = p_person
    AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(public.current_semester_key());
  SELECT jsonb_build_object('semester', public.current_semester_key(), 'label', public.semester_label(public.current_semester_key()),
                            'role', l.role_label, 'division', l.division_key, 'team', l.team, 'status', l.status, 'source', 'live')
  INTO v_live
  FROM public.roster_live() l WHERE l.person_id = p_person LIMIT 1;
  RETURN jsonb_build_object(
    'person_id', p.id, 'code', CASE WHEN (a ->> 'show_codes')::boolean THEN p.code END,
    'first_name', p.first_name, 'surname', p.surname, 'public_hidden', p.public_hidden,
    'is_member', EXISTS (SELECT 1 FROM public.person_records WHERE person_id = p.id AND record_type = 'member'),
    'is_alumnus', EXISTS (SELECT 1 FROM public.person_records WHERE person_id = p.id AND record_type = 'alumni'),
    'entries', v_entries, 'current', v_live,
    'can_edit', (a ->> 'can_edit')::boolean);
END;
$$;
REVOKE ALL ON FUNCTION public.roster_person_for(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roster_person_for(uuid, uuid) TO service_role;

-- The workspace's three reads, as the signed-in caller.
CREATE OR REPLACE FUNCTION public.roster_semesters()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.roster_semesters_for(auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.roster_semester(p_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.roster_semester_for(auth.uid(), p_key) $$;
CREATE OR REPLACE FUNCTION public.roster_person(p_person uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.roster_person_for(auth.uid(), p_person) $$;
REVOKE ALL ON FUNCTION public.roster_semesters() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.roster_semester(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.roster_person(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roster_semesters() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.roster_semester(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.roster_person(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------
-- 5. The public past Boards (Members page).
-- ---------------------------------------------------------------------
-- Each past semester's Board of Directors: officers, then heads, name and
-- office only. Not the current semester (the page shows it from the
-- register), nobody who asked to be left out, nobody expelled, no
-- advisor (an advisor holds no office).
CREATE OR REPLACE FUNCTION public.public_past_boards()
RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT e.semester_key, public.roster_office_rank(e.role_label) AS rank, e.role_label, p.first_name, p.surname
    FROM public.roster_entries e
    JOIN public.people p ON p.id = e.person_id
    WHERE public.roster_office_rank(e.role_label) IS NOT NULL
      AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(public.current_semester_key())
      AND NOT p.public_hidden
      AND NOT EXISTS (
        SELECT 1 FROM public.person_records r JOIN public.members m ON m.id = r.record_id
        WHERE r.person_id = p.id AND r.record_type = 'member' AND m.membership_status = 'expelled')
  ),
  s AS (
    SELECT semester_key,
           jsonb_agg(jsonb_build_object('office', role_label, 'name', first_name || ' ' || surname,
                                        'group', CASE WHEN rank < 50 THEN 'officer' ELSE 'head' END)
                     ORDER BY rank, surname, first_name) AS board
    FROM b GROUP BY semester_key
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('key', semester_key, 'label', public.semester_label(semester_key), 'board', board)
                            ORDER BY public.semester_ordinal(semester_key) DESC), '[]'::jsonb)
  FROM s
$$;
REVOKE ALL ON FUNCTION public.public_past_boards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_past_boards() TO anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- 6. Alumni to complete.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alumni_pending (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id          uuid NOT NULL UNIQUE REFERENCES public.people (id) ON DELETE CASCADE,
  last_semester_key  text,
  last_role          text,
  career             text,
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'added', 'dismissed')),
  alumni_id          uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at        timestamptz,
  resolved_by        uuid
);
ALTER TABLE public.alumni_pending ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alumni_pending FROM anon, authenticated;
GRANT ALL ON public.alumni_pending TO service_role;

DROP TRIGGER IF EXISTS person_link_new_alumni ON public.alumni;
CREATE TRIGGER person_link_new_alumni AFTER INSERT ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.person_link_new_alumni();

-- The open list, for the President and the Vice-President.
CREATE OR REPLACE FUNCTION public.alumni_pending_list()
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT ((public.roster_access(auth.uid()) ->> 'can_edit')::boolean) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', ap.id, 'first_name', p.first_name, 'surname', p.surname,
             'last_semester', public.semester_label(ap.last_semester_key), 'last_role', ap.last_role, 'career', ap.career)
             ORDER BY public.semester_ordinal(ap.last_semester_key) DESC, p.surname, p.first_name), '[]'::jsonb)
    FROM public.alumni_pending ap JOIN public.people p ON p.id = ap.person_id
    WHERE ap.status = 'open');
END;
$$;
REVOKE ALL ON FUNCTION public.alumni_pending_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alumni_pending_list() TO authenticated, service_role;


-- ---------------------------------------------------------------------
-- 7. The data, once.
-- ---------------------------------------------------------------------

-- 7a. A copy of the alumni directory as it was before this step.
CREATE TABLE IF NOT EXISTS public.alumni_backup_step94 AS TABLE public.alumni;
ALTER TABLE public.alumni_backup_step94 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alumni_backup_step94 FROM anon, authenticated;
GRANT ALL ON public.alumni_backup_step94 TO service_role;

DO $seed$
DECLARE
  r record;
  v_person uuid;
  v_n integer;
BEGIN
  -- 7b. The roster history, Fall 2019 to Spring 2026 (roster workbook,
  --     updated 11 October 2026). Only while no history is stored.
  IF NOT EXISTS (SELECT 1 FROM public.roster_entries WHERE source = 'history') THEN
    CREATE TEMP TABLE _seed (semester_key text, first_name text, surname text, role_label text, division_key text, team text) ON COMMIT DROP;
    INSERT INTO _seed VALUES
  ('2019-fall', 'Arturo', 'Schembri', 'President', 'board', NULL),
  ('2019-fall', 'Alessandro', 'Patrizi', 'Head of Asset Management', 'asset_management', NULL),
  ('2019-fall', 'Vito Antonio', 'Amatulli', 'Head of Research', 'research', NULL),
  ('2019-fall', 'Icaro', 'Baraglia', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2019-fall', 'Gabriele', 'Cecchi', 'Portfolio Manager', 'portfolio', NULL),
  ('2019-fall', 'Mirko', 'Battini', 'Portfolio Analyst', 'portfolio', NULL),
  ('2019-fall', 'Mariachiara', 'De Bellis', 'Portfolio Analyst', 'portfolio', NULL),
  ('2019-fall', 'Chiel', 'Dupont', 'Portfolio Analyst', 'portfolio', NULL),
  ('2019-fall', 'Riccardo', 'Ghirlandi', 'Portfolio Analyst', 'portfolio', NULL),
  ('2019-fall', 'Giovanni', 'Marcato', 'Portfolio Analyst', 'portfolio', NULL),
  ('2019-fall', 'Andrea', 'Drago', 'Head of Equity Research', 'equity', NULL),
  ('2019-fall', 'Gianluca Luigi', 'Segreto', 'Equity Research Analyst', 'equity', NULL),
  ('2019-fall', 'Adnane', 'Zehnine', 'Equity Research Analyst', 'equity', NULL),
  ('2019-fall', 'Jeh', 'Patel', 'Head of Macro Research', 'macro', NULL),
  ('2019-fall', 'Silvia', 'Capuano', 'Head of Media & Communication', 'media', NULL),
  ('2020-spring', 'Arturo', 'Schembri', 'President', 'board', NULL),
  ('2020-spring', 'Mariachiara', 'De Bellis', 'Vice President - External Relations Manager', 'board', NULL),
  ('2020-spring', 'Alessandro', 'Patrizi', 'Head of Asset Management', 'asset_management', NULL),
  ('2020-spring', 'Vito Antonio', 'Amatulli', 'Research member (byline "Research, Minerva IMS")', 'research', NULL),
  ('2020-spring', 'Icaro', 'Baraglia', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2020-spring', 'Damiano', 'Campini', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2020-spring', 'Gabriele', 'Cecchi', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2020-spring', 'Edoardo', 'Cordero', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2020-spring', 'Chiel', 'Dupont', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Andrea', 'Sala', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Francesco', 'Baiano', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Mirko', 'Battini', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Vicente', 'Capoulas', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-spring', 'Antonia', 'Cicala', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Maria', 'D''Amato', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Daniel', 'de Bruijn', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Eleonora', 'Di Veroli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-spring', 'Riccardo', 'Ghirlandi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-spring', 'Giacomo', 'Mander', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Marco', 'Manzo Margiotta', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-spring', 'Giovanni', 'Marcato', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Lorenzo', 'Mirone', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Claudio', 'Napoli', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Andrea', 'Taglietti', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-spring', 'Raffaele', 'Zhu', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-spring', 'Andrea', 'Maccarrone', 'Risk Analyst', 'risk', NULL),
  ('2020-spring', 'Gianmaria', 'Bartoccioni', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Federico', 'Beccari', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Kashish', 'Bhatia', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Andrea', 'Brangi', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Andrea', 'Drago', 'Member (role not stated)', 'equity', NULL),
  ('2020-spring', 'Edoardo', 'Ferri', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Emanuele', 'Licari', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Miquel', 'Lluesma', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Manuel', 'Marini', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Vincenzo', 'Montilli', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Federico', 'Nada', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Thinh', 'Nguyen', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Daniel-Nicolae', 'Paraschiv', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Matteo', 'Pellandino', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Gabriele', 'Presti', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Gianluca Luigi', 'Segreto', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Adnane', 'Zehnine', 'Equity Research Analyst', 'equity', NULL),
  ('2020-spring', 'Jacopo', 'Signorelli', 'Macro Research Analyst', 'macro', NULL),
  ('2020-spring', 'Gabriele', 'Maggio', 'Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2020-spring', 'Tommaso', 'Beverina', 'Co-Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2020-spring', 'Maria Vittoria', 'Scino', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2020-spring', 'Daniele', 'Tana', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2020-fall', 'Arturo', 'Schembri', 'President', 'board', NULL),
  ('2020-fall', 'Mariachiara', 'De Bellis', 'Vice President - External Relations Manager', 'board', NULL),
  ('2020-fall', 'Icaro', 'Baraglia', 'Head of Asset Management', 'asset_management', NULL),
  ('2020-fall', 'Tommaso', 'Beverina', 'Head of Research', 'research', NULL),
  ('2020-fall', 'Edoardo', 'Cordero', 'Head of Portfolio Management', 'portfolio', 'long-short'),
  ('2020-fall', 'Edoardo', 'Cordero', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2020-fall', 'Francesco', 'Baiano', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Maria', 'D''Amato', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2020-fall', 'Mirko', 'Battini', 'Portfolio Analyst', 'portfolio', NULL),
  ('2020-fall', 'Tobia', 'Boselli', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-fall', 'Vicente', 'Capoulas', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Diego', 'Castoldi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Antonia', 'Cicala', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Daniel', 'de Bruijn', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Raffaele', 'De Cicco', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-fall', 'Eleonora', 'Di Veroli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-fall', 'Rodrigo', 'Duarte Silva', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Chiel', 'Dupont', 'Portfolio Analyst', 'portfolio', NULL),
  ('2020-fall', 'Julia', 'Garcia Pelayo', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-fall', 'Marco', 'Gortan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-fall', 'Marco', 'Manzo Margiotta', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-fall', 'Giovanni', 'Marcato', 'Portfolio Analyst', 'portfolio', NULL),
  ('2020-fall', 'Roberto', 'Rainone', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-fall', 'Andrea', 'Taglietti', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2020-fall', 'Matteo', 'Turri', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-fall', 'Lorenzo', 'Vitileia', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2020-fall', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2020-fall', 'Andrea', 'Maccarrone', 'Head of Risk Management', 'risk', NULL),
  ('2020-fall', 'Emilio', 'Alberini', 'Risk Analyst', 'risk', NULL),
  ('2020-fall', 'Emanuele', 'Chiarini', 'Risk Analyst', 'risk', NULL),
  ('2020-fall', 'Mohammad', 'Pourmohammadi', 'Risk Analyst', 'risk', NULL),
  ('2020-fall', 'Gianmaria', 'Bartoccioni', 'Head of Equity Research', 'equity', NULL),
  ('2020-fall', 'Cisem', 'Almali', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Federico', 'Beccari', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Andrea', 'Brangi', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Enrico', 'Conforto', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Daniele', 'Cutini', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Victoria', 'Di Vito', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Andrea', 'Drago', 'Member (role not stated)', 'equity', NULL),
  ('2020-fall', 'Edoardo', 'Ferri', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Emanuele', 'Licari', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Manuel', 'Marini', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Vincenzo', 'Montilli', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Federico', 'Nada', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Thinh', 'Nguyen', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Matteo', 'Pellandino', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Gabriele', 'Presti', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Dario', 'Scordamaglia', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Luciano', 'Valerio', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Adnane', 'Zehnine', 'Equity Research Analyst', 'equity', NULL),
  ('2020-fall', 'Jacopo', 'Signorelli', 'Head of Macro Research', 'macro', NULL),
  ('2020-fall', 'Pietro', 'Bologna', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Remogiulio', 'Cavuto', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Anastasia', 'Chyzheuskaya', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Pietro', 'Cucinotta', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Lara', 'Deniz', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Riccardo', 'Frangi', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Brunon', 'Magolewski', 'Macro Research Analyst', 'macro', NULL),
  ('2020-fall', 'Damiano', 'Campini', 'Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2020-fall', 'Dionysia', 'Balafa', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2020-fall', 'Maria Carla', 'Cartone', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2020-fall', 'Lorenzo', 'Spiga', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2020-fall', 'Marco', 'Uggeri', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-spring', 'Icaro', 'Baraglia', 'President', 'board', NULL),
  ('2021-spring', 'Mariachiara', 'De Bellis', 'Vice President - External Relations Manager', 'board', NULL),
  ('2021-spring', 'Edoardo', 'Cordero', 'Head of Asset Management', 'asset_management', NULL),
  ('2021-spring', 'Tommaso', 'Beverina', 'Head of Research', 'research', NULL),
  ('2021-spring', 'Maria', 'D''Amato', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2021-spring', 'Raffaele', 'De Cicco', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2021-spring', 'Marco', 'Gortan', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Roberto', 'Rainone', 'Portfolio Manager', 'portfolio', NULL),
  ('2021-spring', 'Tobia', 'Boselli', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-spring', 'Ilaria', 'Caponi', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-spring', 'Diego', 'Castoldi', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-spring', 'Antonia', 'Cicala', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Daniele', 'Cutini', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-spring', 'Saumya', 'Das', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Eleonora', 'Di Veroli', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-spring', 'Rodrigo', 'Duarte Silva', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Julia', 'Garcia Pelayo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Luca', 'Giorgianni', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Marco', 'Manzo Margiotta', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Edoardo', 'Pelli', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Giorgio', 'Profeta', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Edoardo', 'Toneatti', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-spring', 'Matteo', 'Turri', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Lorenzo', 'Vitileia', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-spring', 'Emanuele', 'Chiarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2021-spring', 'Emanuele', 'Chiarini', 'Risk Analyst', 'risk', NULL),
  ('2021-spring', 'Andrea', 'Maccarrone', 'Head of Risk Management', 'risk', NULL),
  ('2021-spring', 'Emilio', 'Alberini', 'Risk Analyst', 'risk', NULL),
  ('2021-spring', 'Pāvels', 'Karcevs', 'Risk Analyst', 'risk', NULL),
  ('2021-spring', 'Mohammad', 'Pourmohammadi', 'Risk Analyst', 'risk', NULL),
  ('2021-spring', 'Gianmaria', 'Bartoccioni', 'Head of Equity Research', 'equity', NULL),
  ('2021-spring', 'Cisem', 'Almali', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Niccolò', 'Bragaglia', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Andrea', 'Brangi', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Enrico', 'Conforto', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Victoria', 'Di Vito', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Edoardo', 'Ferri', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Emanuele', 'Licari', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Federico', 'Nada', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Thinh', 'Nguyen', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Matteo', 'Pellandino', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Gabriele', 'Presti', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Dario', 'Scordamaglia', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Erika', 'Song', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Maksim', 'Stamenkovic', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Luigi', 'Tamburini', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Luciano', 'Valerio', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Adnane', 'Zehnine', 'Equity Research Analyst', 'equity', NULL),
  ('2021-spring', 'Jacopo', 'Signorelli', 'Head of Macro Research', 'macro', NULL),
  ('2021-spring', 'Anastasia', 'Chyzheuskaya', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Pietro', 'Cucinotta', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Lara', 'Deniz', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Bianca', 'Giovetti', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Marta', 'Leva', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Brunon', 'Magolewski', 'Macro Research Analyst', 'macro', NULL),
  ('2021-spring', 'Marco', 'Uggeri', 'Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2021-spring', 'Deniz', 'Aktas', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-spring', 'Dionysia', 'Balafa', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-spring', 'Maria Carla', 'Cartone', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-spring', 'Lorenzo', 'Spiga', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-fall', 'Jacopo', 'Signorelli', 'President', 'board', NULL),
  ('2021-fall', 'Mariachiara', 'De Bellis', 'Vice President - External Relations Manager', 'board', NULL),
  ('2021-fall', 'Marta', 'Leva', 'External Relations', 'board', NULL),
  ('2021-fall', 'Marco', 'Gortan', 'Head of Asset Management', 'asset_management', NULL),
  ('2021-fall', 'Tommaso', 'Beverina', 'Head of Research', 'research', NULL),
  ('2021-fall', 'Deniz', 'Aktas', 'Research Analyst (Hercle project)', 'research', 'hercle-project'),
  ('2021-fall', 'Cisem', 'Almali', 'Research Analyst (Hercle project)', 'research', 'hercle-project'),
  ('2021-fall', 'Thomas', 'Ferradini', 'Research Analyst (Hercle project)', 'research', 'hercle-project'),
  ('2021-fall', 'Jacopo', 'Prevedello', 'Research Analyst (Hercle project)', 'research', 'hercle-project'),
  ('2021-fall', 'Erika', 'Song', 'Research Analyst (Hercle project)', 'research', 'hercle-project'),
  ('2021-fall', 'Raffaele', 'De Cicco', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2021-fall', 'Daniele', 'Cutini', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2021-fall', 'Giorgio', 'Profeta', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2021-fall', 'Matteo', 'Turri', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Tobia', 'Boselli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2021-fall', 'Diego', 'Castoldi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2021-fall', 'Matteo', 'Consalvo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-fall', 'Saumya', 'Das', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-fall', 'Rodrigo', 'Duarte Silva', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2021-fall', 'Julia', 'Garcia Pelayo', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Luca', 'Giorgianni', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-fall', 'Heeseong', 'Jeong', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-fall', 'Matteo', 'Pellandino', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Edoardo', 'Pelli', 'Portfolio Analyst', 'portfolio', NULL),
  ('2021-fall', 'Francesco', 'Sorbone', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Edoardo', 'Toneatti', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Andrei', 'Tudoroiu', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2021-fall', 'Lorenzo', 'Vitileia', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2021-fall', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2021-fall', 'Emanuele', 'Chiarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2021-fall', 'Mohamed', 'Akhatar', 'Quantitative Research Analyst', 'quant', NULL),
  ('2021-fall', 'Umberto', 'Barbieri', 'Quantitative Research Analyst', 'quant', NULL),
  ('2021-fall', 'Anna', 'Vlastova', 'Quantitative Research Analyst', 'quant', NULL),
  ('2021-fall', 'Francesco', 'Zanettin', 'Quantitative Research Analyst', 'quant', NULL),
  ('2021-fall', 'Andrea', 'Brangi', 'Head of Equity Research', 'equity', NULL),
  ('2021-fall', 'Enrico', 'Conforto', 'Co-Head of Equity Research', 'equity', NULL),
  ('2021-fall', 'Alessandro', 'Bontempi', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Maurizio', 'De Nisi', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Stefano', 'Didone', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Fabio', 'Iacobucci', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Luca Nicola', 'Introna', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Emanuele', 'Licari', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Tommaso', 'Nocchi', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Luigi', 'Savarese', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Dario', 'Scordamaglia', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Baptiste', 'Soulhol', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Maksim', 'Stamenkovic', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Daniele', 'Stoia', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Luigi', 'Tamburini', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Luciano', 'Valerio', 'Equity Research Analyst', 'equity', NULL),
  ('2021-fall', 'Pietro', 'Cucinotta', 'Head of Macro Research', 'macro', NULL),
  ('2021-fall', 'Lara', 'Deniz', 'Macro Research Analyst', 'macro', NULL),
  ('2021-fall', 'Ada', 'Egilmez', 'Macro Research Analyst', 'macro', NULL),
  ('2021-fall', 'Xuan', 'Liu', 'Macro Research Analyst', 'macro', NULL),
  ('2021-fall', 'Brunon', 'Magolewski', 'Macro Research Analyst', 'macro', NULL),
  ('2021-fall', 'Michele', 'Tremolada', 'Macro Research Analyst', 'macro', NULL),
  ('2021-fall', 'Marco', 'Uggeri', 'Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2021-fall', 'Dionysia', 'Balafa', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-fall', 'Antonio', 'Messina', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2021-fall', 'Matteo', 'Negrini', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-spring', 'Jacopo', 'Signorelli', 'President', 'board', NULL),
  ('2022-spring', 'Marta', 'Leva', 'Vice President', 'board', NULL),
  ('2022-spring', 'Daniele', 'Cutini', 'Head of Asset Management', 'asset_management', NULL),
  ('2022-spring', 'Tommaso', 'Beverina', 'Head of Research', 'research', NULL),
  ('2022-spring', 'Matteo', 'Turri', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2022-spring', 'Tobia', 'Boselli', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2022-spring', 'Diego', 'Castoldi', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Rodrigo', 'Duarte Silva', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2022-spring', 'Giorgio', 'Profeta', 'Senior Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Gianluca', 'Caffi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Matteo', 'Consalvo', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-spring', 'Mattia', 'Cosimo', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Julia', 'Garcia Pelayo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Heeseong', 'Jeong', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-spring', 'Matteo', 'Pellandino', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Edoardo', 'Pelli', 'Portfolio Analyst', 'portfolio', NULL),
  ('2022-spring', 'Martina', 'Perrone', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Jacopo', 'Prevedello', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-spring', 'Federico', 'Schizzi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-spring', 'Francesco', 'Sorbone', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Federico', 'Tita', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Carmine', 'Troilo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Andrei', 'Tudoroiu', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-spring', 'Lorenzo', 'Vitileia', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-spring', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-spring', 'Emanuele', 'Chiarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2022-spring', 'Ismail', 'Abbassi', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Mohamed', 'Akhatar', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Umberto', 'Barbieri', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Stefan', 'Cabarkapa', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Giuseppe', 'Casapenta', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Matteo', 'Ticli', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Leonardo', 'Vitileia', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Francesco', 'Zanettin', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-spring', 'Andrea', 'Brangi', 'Head of Equity Research', 'equity', NULL),
  ('2022-spring', 'Enrico', 'Conforto', 'Co-Head of Equity Research', 'equity', NULL),
  ('2022-spring', 'Andreas', 'Bengtsson', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Andrea', 'Beretta', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Alessandro', 'Bontempi', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Amadis', 'Cleva', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Lorenzo', 'De Felice', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Maurizio', 'De Nisi', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Fabio', 'Iacobucci', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Luca Nicola', 'Introna', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Emanuele', 'Licari', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Lorenzo', 'Lucicesare', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Luca', 'Paris', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Luigi', 'Savarese', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Dario', 'Scordamaglia', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Maksim', 'Stamenkovic', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Daniele', 'Stoia', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Luigi', 'Tamburini', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Luciano', 'Valerio', 'Equity Research Analyst', 'equity', NULL),
  ('2022-spring', 'Pietro', 'Cucinotta', 'Head of Macro Research', 'macro', NULL),
  ('2022-spring', 'Alessandro', 'Archetti', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Ada', 'Egilmez', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Xuan', 'Liu', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Brunon', 'Magolewski', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Gabriele', 'Pujatti', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Michele', 'Tremolada', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Luca', 'Vezzani', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Maho', 'Yoneda', 'Macro Research Analyst', 'macro', NULL),
  ('2022-spring', 'Matteo', 'Negrini', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Jacopo', 'Signorelli', 'President', 'board', NULL),
  ('2022-fall', 'Marta', 'Leva', 'External Relations', 'board', NULL),
  ('2022-fall', 'Daniele', 'Cutini', 'Head of Asset Management', 'asset_management', NULL),
  ('2022-fall', 'Emanuele', 'Licari', 'Head of Research', 'research', NULL),
  ('2022-fall', 'Tobia', 'Boselli', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2022-fall', 'Gianluca', 'Caffi', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2022-fall', 'Davide', 'Giuliano', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2022-fall', 'Francesco', 'Sorbone', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Lorenzo', 'De Felice', 'Senior Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-fall', 'Daniele', 'Biondi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-fall', 'Matteo', 'Consalvo', 'Portfolio Analyst', 'portfolio', NULL),
  ('2022-fall', 'Luca', 'Delorenzi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-fall', 'Heeseong', 'Jeong', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-fall', 'Marco', 'Neri', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Edoardo', 'Pelli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-fall', 'David', 'Permutti', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2022-fall', 'Martina', 'Perrone', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-fall', 'Jacopo', 'Prevedello', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Federico', 'Schizzi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Federico', 'Tita', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-fall', 'Andrei', 'Tudoroiu', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2022-fall', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Michele', 'Zanirato', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2022-fall', 'Emanuele', 'Chiarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2022-fall', 'Umberto', 'Barbieri', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Stefan', 'Cabarkapa', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Giuseppe', 'Casapenta', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Marco', 'Folonaro', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Michele', 'Scalzotto', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Vasileios', 'Stavropoulos', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Matteo', 'Ticli', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Francesco', 'Zanettin', 'Quantitative Research Analyst', 'quant', NULL),
  ('2022-fall', 'Luigi', 'Tamburini', 'Head of Equity Research', 'equity', NULL),
  ('2022-fall', 'Dario', 'Scordamaglia', 'Co-Head of Equity Research', 'equity', NULL),
  ('2022-fall', 'Andreas', 'Bengtsson', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Andrea', 'Beretta', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Alessandro', 'Bontempi', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Amadis', 'Cleva', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Dan-Arthur', 'Coseru', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Pierpaolo', 'Cuglietta', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Vincent', 'de Naurois', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Elisabetta', 'Fabris', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Fabio', 'Iacobucci', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Luca Nicola', 'Introna', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Lorenzo', 'Lucicesare', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Tommaso', 'Nocchi', 'Member (internal-event sign-up only)', 'equity', NULL),
  ('2022-fall', 'Luca', 'Paris', 'Member (internal-event sign-up only)', 'equity', NULL),
  ('2022-fall', 'Luigi', 'Savarese', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Akshit', 'Seth', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Daniele', 'Stoia', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Luciano', 'Valerio', 'Equity Research Analyst', 'equity', NULL),
  ('2022-fall', 'Alessandro', 'Archetti', 'Head of Macro Research', 'macro', NULL),
  ('2022-fall', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Giacomo', 'de Michieli', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Ada', 'Egilmez', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Basar Gokberk', 'Inan', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Riccardo', 'Mirarchi', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Gabriele', 'Pujatti', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Michele', 'Tremolada', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Luca', 'Vezzani', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Maho', 'Yoneda', 'Macro Research Analyst', 'macro', NULL),
  ('2022-fall', 'Antonio', 'Messina', 'Head of Markets & Alternatives Research', 'markets_alternatives', NULL),
  ('2022-fall', 'Deniz', 'Aktas', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Edoardo', 'Calleri di Sala', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Matteo', 'Negrini', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Angelo', 'Perri', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Prasiddha', 'Rajaure', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Bartu', 'Sen', 'Markets & Alternatives Research Analyst', 'markets_alternatives', NULL),
  ('2022-fall', 'Nadia', 'Guidoccio', 'Media & Communication member', 'media', NULL),
  ('2023-spring', 'Luigi', 'Tamburini', 'President', 'board', NULL),
  ('2023-spring', 'Tobia', 'Boselli', 'Board Member', 'board', NULL),
  ('2023-spring', 'Daniele', 'Cutini', 'Board Member', 'board', NULL),
  ('2023-spring', 'Davide', 'Giuliano', 'Head of Asset Management', 'asset_management', NULL),
  ('2023-spring', 'Alessandro', 'Archetti', 'Head of Research', 'research', NULL),
  ('2023-spring', 'Gianluca', 'Caffi', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2023-spring', 'Matteo', 'Consalvo', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2023-spring', 'Jacopo', 'Prevedello', 'Portfolio Manager', 'portfolio', 'pir'),
  ('2023-spring', 'Federico', 'Schizzi', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2023-spring', 'Francesco', 'Sorbone', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2023-spring', 'Lorenzo', 'Spada', 'Senior Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-spring', 'Caterina', 'Beorchia', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-spring', 'Daniele', 'Biondi', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-spring', 'Meric', 'Cavus', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-spring', 'Pietro', 'Cordero', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-spring', 'Luca', 'Delorenzi', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-spring', 'Anna', 'Maruccio', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-spring', 'David', 'Overbeck', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-spring', 'Alberto', 'Pavanello', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-spring', 'Edoardo', 'Pelli', 'Portfolio Analyst', 'portfolio', NULL),
  ('2023-spring', 'David', 'Permutti', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-spring', 'Martina', 'Perrone', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-spring', 'Federico', 'Tita', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-spring', 'Andrei', 'Tudoroiu', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-spring', 'Matilde', 'Zampa', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-spring', 'Michele', 'Zanirato', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-spring', 'Emanuele', 'Chiarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2023-spring', 'Umberto', 'Barbieri', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Stefan', 'Cabarkapa', 'Member (role not stated)', 'quant', NULL),
  ('2023-spring', 'Riccardo', 'De Giovanni', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Marco', 'Folonaro', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Giacomo', 'Gregori', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Daniel', 'Mitoiu', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Vasileios', 'Stavropoulos', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Erik', 'Vik', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Francesco', 'Zanettin', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-spring', 'Luigi', 'Savarese', 'Head of Equity Research', 'equity', NULL),
  ('2023-spring', 'Tommaso', 'Nocchi', 'Co-Head of Equity Research', 'equity', NULL),
  ('2023-spring', 'Dan-Arthur', 'Coseru', 'Equity Research Group Leader', 'equity', NULL),
  ('2023-spring', 'Pierpaolo', 'Cuglietta', 'Senior Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Luca', 'Paris', 'Senior Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Andrea', 'Barra', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Rezan', 'Bağcıoğlu', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Andrea', 'Beretta', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Margherita', 'Bonelli', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Alessandro', 'Bontempi', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Riccardo', 'D''Agata', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Vincent', 'de Naurois', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Elisabetta', 'Fabris', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Luca Nicola', 'Introna', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Ruslana', 'Karaman', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Lorenzo', 'Lucicesare', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Francesco', 'Nardinocchi', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Akshit', 'Seth', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Matteo', 'Tozzini', 'Equity Research Analyst', 'equity', NULL),
  ('2023-spring', 'Lorenzo', 'De Felice', 'Head of Investment Research', 'investment', 'fixed-income'),
  ('2023-spring', 'Giorgio', 'Gusella', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2023-spring', 'Fabio', 'Iacobucci', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2023-spring', 'Luca', 'Natalucci', 'Equities Strategist', 'investment', 'equities'),
  ('2023-spring', 'Marco', 'Neri', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2023-spring', 'Maddalena', 'Salterini', 'Equities Strategist', 'investment', 'equities'),
  ('2023-spring', 'Bartu', 'Sen', 'Equities Strategist', 'investment', 'equities'),
  ('2023-spring', 'Angelo', 'Truono', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2023-spring', 'Dario', 'Scordamaglia', 'Head of Macro Research', 'macro', NULL),
  ('2023-spring', 'Giacomo', 'de Michieli', 'Co-Head of Macro Research', 'macro', NULL),
  ('2023-spring', 'Edoardo', 'Bini', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Alessandro', 'Bosco', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Giovanni', 'Di Lecce', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Ada', 'Egilmez', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Basar Gokberk', 'Inan', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Domenico', 'Mancuso', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Polina', 'Mednikova', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Riccardo', 'Mirarchi', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Alessandro', 'Pagan', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Gabriele', 'Pujatti', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Michele', 'Tremolada', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Luca', 'Vezzani', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Maho', 'Yoneda', 'Macro Research Analyst', 'macro', NULL),
  ('2023-spring', 'Nadia', 'Guidoccio', 'Head of Media & Communication', 'media', NULL),
  ('2023-fall', 'Gianluca', 'Caffi', 'President', 'board', NULL),
  ('2023-fall', 'Luigi', 'Tamburini', 'President', 'board', NULL),
  ('2023-fall', 'Luigi', 'Tamburini', 'Board Advisor', 'board', NULL),
  ('2023-fall', 'Jacopo', 'Prevedello', 'Head of Asset Management', 'asset_management', NULL),
  ('2023-fall', 'Alessandro', 'Archetti', 'Head of Research', 'research', NULL),
  ('2023-fall', 'Matteo', 'Consalvo', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2023-fall', 'Caterina', 'Beorchia', 'Portfolio Manager', 'portfolio', 'pir'),
  ('2023-fall', 'David', 'Overbeck', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2023-fall', 'Alberto', 'Pavanello', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2023-fall', 'Francesco', 'Sorbone', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2023-fall', 'Edoardo', 'Bini', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-fall', 'Daniele', 'Biondi', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-fall', 'Tobia', 'Boselli', 'Member (role not stated)', 'portfolio', NULL),
  ('2023-fall', 'Pietro', 'Cordero', 'On semester break (exchange)', 'portfolio', NULL),
  ('2023-fall', 'Lodovico Attilio', 'Del Re', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-fall', 'Luca', 'Delorenzi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-fall', 'Vittorio', 'Garavelli', 'Portfolio Analyst', 'portfolio', 'pir'),
  ('2023-fall', 'Anna', 'Maruccio', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-fall', 'Giuseppe', 'Palermo', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-fall', 'David', 'Permutti', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-fall', 'Michele', 'Rinaldi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-fall', 'Federico', 'Schizzi', 'Member (role not stated)', 'portfolio', NULL),
  ('2023-fall', 'Federico', 'Tita', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2023-fall', 'Pietro', 'Tracanzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2023-fall', 'Erik', 'Vik', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2023-fall', 'Erik', 'Vik', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Umberto', 'Barbieri', 'Head of Quantitative Research', 'quant', NULL),
  ('2023-fall', 'Erik', 'Bergqvist', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Francesco', 'Braicovich', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Giacomo', 'Gregori', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Antonio', 'Petrai', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Enrico', 'Sammarco', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Vasileios', 'Stavropoulos', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Nathan', 'Van Es', 'Quantitative Research Analyst', 'quant', NULL),
  ('2023-fall', 'Luigi', 'Savarese', 'Head of Equity Research', 'equity', NULL),
  ('2023-fall', 'Tommaso', 'Nocchi', 'Co-Head of Equity Research', 'equity', NULL),
  ('2023-fall', 'Riccardo', 'D''Agata', 'Equity Research Group Leader', 'equity', NULL),
  ('2023-fall', 'Francesco', 'Nardinocchi', 'Equity Research Group Leader', 'equity', NULL),
  ('2023-fall', 'Matteo', 'Tozzini', 'Equity Research Group Leader', 'equity', NULL),
  ('2023-fall', 'Andrea', 'Barra', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Rezan', 'Bağcıoğlu', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Andrea', 'Beretta', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Margherita', 'Bonelli', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Alessandro', 'Bontempi', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Alessandro', 'Bosco', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Alessandro', 'Bosco', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Dan-Arthur', 'Coseru', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Pierpaolo', 'Cuglietta', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Vincent', 'de Naurois', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Marco', 'Di Marco', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Elisabetta', 'Fabris', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Ruslana', 'Karaman', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Lorenzo', 'Lucicesare', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Luca', 'Paris', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Andrea', 'Pierini', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Giacomo', 'Pietrosanti', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Anh Tho', 'Vu', 'Equity Research Analyst', 'equity', NULL),
  ('2023-fall', 'Lorenzo', 'De Felice', 'Head of Investment Research', 'investment', NULL),
  ('2023-fall', 'Angelo', 'Truono', 'Co-Head of Investment Research', 'investment', NULL),
  ('2023-fall', 'Giorgio', 'Gusella', 'FX & Commodities Strategist - Lead', 'investment', 'fx-commodities'),
  ('2023-fall', 'Luca', 'Natalucci', 'Equities Strategist - Lead', 'investment', 'equities'),
  ('2023-fall', 'Marco', 'Neri', 'Fixed Income Strategist - Lead', 'investment', 'fixed-income'),
  ('2023-fall', 'Marco', 'Caccia', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2023-fall', 'Nicolas', 'Carlone', 'Equities Strategist', 'investment', 'equities'),
  ('2023-fall', 'Giovanni', 'Francescato', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2023-fall', 'Fabio', 'Iacobucci', 'Investment Research Analyst', 'investment', NULL),
  ('2023-fall', 'Giovanni', 'Porporino', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2023-fall', 'Maddalena', 'Salterini', 'Equities Strategist', 'investment', 'equities'),
  ('2023-fall', 'Francesco', 'Santoro', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2023-fall', 'Bartu', 'Sen', 'Equities Strategist', 'investment', 'equities'),
  ('2023-fall', 'Pengcheng', 'Zhang', 'Equities Strategist', 'investment', 'equities'),
  ('2023-fall', 'Giacomo', 'de Michieli', 'Head of Macro Research', 'macro', NULL),
  ('2023-fall', 'Polina', 'Mednikova', 'Co-Head of Macro Research', 'macro', NULL),
  ('2023-fall', 'Giovanni', 'Biasiucci', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Matias', 'Bonfanti', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Giovanni', 'Di Lecce', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Ada', 'Egilmez', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Giulia', 'Faro', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Basar Gokberk', 'Inan', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Domenico', 'Mancuso', 'Member (role not stated)', 'macro', NULL),
  ('2023-fall', 'Riccardo', 'Mirarchi', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Alessandro', 'Pagan', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Michele', 'Tremolada', 'Macro Research Analyst', 'macro', NULL),
  ('2023-fall', 'Marina', 'Zhilina', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Gianluca', 'Caffi', 'President', 'board', NULL),
  ('2024-spring', 'Giuseppe', 'Palermo', 'Head of Asset Management', 'asset_management', NULL),
  ('2024-spring', 'Anna', 'Maruccio', 'Head of Portfolio Management', 'portfolio', 'dps'),
  ('2024-spring', 'Anna', 'Maruccio', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2024-spring', 'Lodovico Attilio', 'Del Re', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Erik', 'Vik', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2024-spring', 'Erik', 'Vik', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Francesco', 'Anastasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Raman', 'Antanovich', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-spring', 'Caterina', 'Beorchia', 'Member (role not stated)', 'portfolio', NULL),
  ('2024-spring', 'Edoardo', 'Bini', 'On semester break', 'portfolio', NULL),
  ('2024-spring', 'Daniele', 'Biondi', 'On semester break', 'portfolio', NULL),
  ('2024-spring', 'Giovanni', 'Carboniero', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Giovanni', 'Carboniero', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Pietro', 'Cordero', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Matteo', 'De Guidi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-spring', 'Luca', 'Delorenzi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-spring', 'Elisabetta', 'Fabris', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Filippo', 'Forzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-spring', 'Vittorio', 'Garavelli', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Aleksandar', 'Georgiev', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Alberto', 'Pavanello', 'Member (role not stated)', 'portfolio', NULL),
  ('2024-spring', 'David', 'Permutti', 'On semester break', 'portfolio', NULL),
  ('2024-spring', 'Antonio', 'Petrai', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Antonio', 'Petrai', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Michele', 'Rinaldi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Luca', 'Riolo', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Giacomo', 'Sada', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-spring', 'Federico', 'Schizzi', 'On semester break', 'portfolio', NULL),
  ('2024-spring', 'Vasileios', 'Stavropoulos', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-spring', 'Vasileios', 'Stavropoulos', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Federico', 'Tita', 'On semester break', 'portfolio', NULL),
  ('2024-spring', 'Pietro', 'Tracanzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-spring', 'Umberto', 'Barbieri', 'Head of Quantitative Research', 'quant', NULL),
  ('2024-spring', 'Erik', 'Bergqvist', 'Member (role not stated)', 'quant', NULL),
  ('2024-spring', 'Francesco', 'Braicovich', 'Member (role not stated)', 'quant', NULL),
  ('2024-spring', 'Michele', 'Fanelli', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Federico', 'Lazzarini', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Rolf', 'Minardi', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Enrico', 'Sammarco', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Nathan', 'Van Es', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-spring', 'Luigi', 'Savarese', 'Head of Equity Research', 'equity', NULL),
  ('2024-spring', 'Dan-Arthur', 'Coseru', 'Co-Head of Equity Research', 'equity', NULL),
  ('2024-spring', 'Andrea', 'Barra', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Rezan', 'Bağcıoğlu', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Andrea', 'Beretta', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Margherita', 'Bonelli', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Alessandro', 'Bontempi', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Alessandro', 'Bosco', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Nicolas De Lacerda', 'Bregantim', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Pierpaolo', 'Cuglietta', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Stelian', 'Cujba', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Riccardo', 'D''Agata', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Vincent', 'de Naurois', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Marco', 'Di Marco', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Salma', 'El Hamdi', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Cosimo Jacopo', 'Guadalupi', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Ruslana', 'Karaman', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Lorenzo', 'Lucicesare', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Francesco', 'Nardinocchi', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Tommaso', 'Nocchi', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Luca', 'Paris', 'Member (role not stated)', 'equity', NULL),
  ('2024-spring', 'Andrea', 'Pierini', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Giacomo', 'Pietrosanti', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Savvina', 'Salvaridou', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Matteo', 'Tozzini', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Anh Tho', 'Vu', 'Equity Research Analyst', 'equity', NULL),
  ('2024-spring', 'Marco', 'Neri', 'Head of Investment Research', 'investment', NULL),
  ('2024-spring', 'Angelo', 'Truono', 'Co-Head of Investment Research', 'investment', NULL),
  ('2024-spring', 'Marco', 'Caccia', 'FX & Commodities Strategist - Lead', 'investment', 'fx-commodities'),
  ('2024-spring', 'Nicolas', 'Carlone', 'Equities Strategist - Lead', 'investment', 'equities'),
  ('2024-spring', 'Giovanni', 'Porporino', 'Fixed Income Strategist - Lead', 'investment', 'fixed-income'),
  ('2024-spring', 'Massimo', 'Biavardi', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-spring', 'Lorenzo', 'De Felice', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-spring', 'Giovanni', 'Francescato', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-spring', 'Giacomo', 'Gregori', 'Member (role not stated)', 'investment', NULL),
  ('2024-spring', 'Giorgio', 'Gusella', 'Member (role not stated)', 'investment', NULL),
  ('2024-spring', 'Lukas', 'Louhiluoto', 'Equities Strategist', 'investment', 'equities'),
  ('2024-spring', 'Elia', 'Marenco', 'Equities Strategist', 'investment', 'equities'),
  ('2024-spring', 'Alessandro', 'Palasciano', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-spring', 'Giuseppe', 'Provenzano', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-spring', 'Maddalena', 'Salterini', 'Member (role not stated)', 'investment', NULL),
  ('2024-spring', 'Francesco', 'Santoro', 'Member (role not stated)', 'investment', NULL),
  ('2024-spring', 'Bartu', 'Sen', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-spring', 'Pengcheng', 'Zhang', 'Equities Strategist', 'investment', 'equities'),
  ('2024-spring', 'Polina', 'Mednikova', 'Head of Macro Research', 'macro', NULL),
  ('2024-spring', 'Giovanni', 'Biasiucci', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Matias', 'Bonfanti', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Eloi', 'Corman', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Giovanni', 'Di Lecce', 'On semester break', 'macro', NULL),
  ('2024-spring', 'Ada', 'Egilmez', 'On semester break', 'macro', NULL),
  ('2024-spring', 'Giulia', 'Faro', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Basar Gokberk', 'Inan', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Domenico', 'Mancuso', 'Member (role not stated)', 'macro', NULL),
  ('2024-spring', 'Riccardo', 'Mirarchi', 'On semester break', 'macro', NULL),
  ('2024-spring', 'Alessandro', 'Pagan', 'On semester break', 'macro', NULL),
  ('2024-spring', 'Niccolò', 'Rotondi', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Jack', 'Thompson', 'Macro Research Analyst', 'macro', NULL),
  ('2024-spring', 'Michele', 'Tremolada', 'On semester break', 'macro', NULL),
  ('2024-spring', 'Marina', 'Zhilina', 'Member (role not stated)', 'macro', NULL),
  ('2024-fall', 'Anna', 'Maruccio', 'President', 'board', NULL),
  ('2024-fall', 'Luigi', 'Savarese', 'Vice President', 'board', NULL),
  ('2024-fall', 'Giuseppe', 'Palermo', 'Head of Asset Management', 'asset_management', NULL),
  ('2024-fall', 'Lodovico Attilio', 'Del Re', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2024-fall', 'Raman', 'Antanovich', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2024-fall', 'Luca', 'Delorenzi', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Michele', 'Rinaldi', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2024-fall', 'Francesco', 'Anastasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Carl Christian Wilhelm', 'Bengelsdorff', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Daniele', 'Biondi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Giovanni', 'Carboniero', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Alberto', 'Cifrodelli', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Riccardo', 'Colombo', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Pietro', 'Cordero', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Michele', 'D''Andrilli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Matteo', 'De Guidi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Antonino', 'Di Blasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Elisabetta', 'Fabris', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Filippo', 'Forzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Vittorio', 'Garavelli', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Aleksandar', 'Georgiev', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Federico', 'Indrieri', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Luca', 'Moretto', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Boris', 'Penev', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Luca', 'Riolo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2024-fall', 'Giacomo', 'Sada', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2024-fall', 'Federico', 'Tita', 'Member (referred an applicant)', 'portfolio', NULL),
  ('2024-fall', 'Pietro', 'Tracanzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Tiago', 'Viamonte', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2024-fall', 'Federico', 'Lazzarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2024-fall', 'Filip', 'Borzecki', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Michele', 'Fanelli', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Filippo', 'Gombac', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Giani', 'Ranzetti', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Enrico', 'Sammarco', 'Member (referred an applicant)', 'quant', NULL),
  ('2024-fall', 'Ianina', 'Tarca', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Erik', 'Vik', 'Member (referred an applicant)', 'quant', NULL),
  ('2024-fall', 'Anyi', 'Xie', 'Quantitative Research Analyst', 'quant', NULL),
  ('2024-fall', 'Rezan', 'Bağcıoğlu', 'Co-Head of Equity Research', 'equity', NULL),
  ('2024-fall', 'Giacomo', 'Pietrosanti', 'Co-Head of Equity Research', 'equity', NULL),
  ('2024-fall', 'Diego', 'Baroni', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Marzio', 'Bonizzi', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Alessandro', 'Bosco', 'Member (referred an applicant)', 'equity', NULL),
  ('2024-fall', 'Giovanni', 'Cianci', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Stelian', 'Cujba', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Alex', 'Cuker', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Vincent', 'de Naurois', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Marco', 'Di Marco', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Salma', 'El Hamdi', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Vincenzo', 'Esposito', 'On semester break', 'equity', NULL),
  ('2024-fall', 'Lorenzo', 'Favaretto', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Cosimo Jacopo', 'Guadalupi', 'On semester break', 'equity', NULL),
  ('2024-fall', 'Elia', 'Marenco', 'Member (role not stated)', 'equity', NULL),
  ('2024-fall', 'Bruno', 'Matys', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Andrea', 'Pierini', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Savvina', 'Salvaridou', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Emanuele', 'Scarpa', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Filippo', 'Torsa', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Anh Tho', 'Vu', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Samuel', 'Zanchetta', 'Equity Research Analyst', 'equity', NULL),
  ('2024-fall', 'Marco', 'Neri', 'Head of Investment Research', 'investment', NULL),
  ('2024-fall', 'Giorgio', 'Gusella', 'Co-Head of Investment Research', 'investment', NULL),
  ('2024-fall', 'Marco', 'Caccia', 'FX & Commodities Strategist - Lead', 'investment', 'fx-commodities'),
  ('2024-fall', 'Lukas', 'Louhiluoto', 'Equities Strategist - Lead', 'investment', 'equities'),
  ('2024-fall', 'Giuseppe', 'Provenzano', 'Fixed Income Strategist - Lead', 'investment', 'fixed-income'),
  ('2024-fall', 'Elias', 'Bouzamondo', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-fall', 'Paul', 'Chatin', 'Equities Strategist', 'investment', 'equities'),
  ('2024-fall', 'Giovanni', 'Francescato', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-fall', 'Paride', 'Lauretti', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-fall', 'Lorenzo', 'Monteduro', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-fall', 'Mylan', 'Monteil', 'Equities Strategist', 'investment', 'equities'),
  ('2024-fall', 'Alessandro', 'Palasciano', 'Equities Strategist', 'investment', 'equities'),
  ('2024-fall', 'Volodymyr', 'Pavliv', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2024-fall', 'Tom', 'Petit', 'Equities Strategist', 'investment', 'equities'),
  ('2024-fall', 'Bartu', 'Sen', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2024-fall', 'Giovanni', 'Biasiucci', 'Head of Macro Research', 'macro', NULL),
  ('2024-fall', 'Ralph', 'Antonius Hermans', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Matias', 'Bonfanti', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Marco', 'Catoni', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Eloi', 'Corman', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Sophia C.', 'Froehlich', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Diego', 'La Fontaine', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Maria', 'Liova', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Cao-Khai', 'Mai', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Polina', 'Mednikova', 'Member (referred an applicant)', 'macro', NULL),
  ('2024-fall', 'Riccardo', 'Mirarchi', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Siddanth', 'Narayana Achanta', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Alessandro', 'Pagan', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Simone Vittorio', 'Percoco', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Niccolò', 'Rotondi', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Rishabh', 'Rupani', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Pramit Priyam', 'Saha', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Giuseppe', 'Spina', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Jack', 'Thompson', 'Macro Research Analyst', 'macro', NULL),
  ('2024-fall', 'Matthew Robert', 'Walzer', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Luigi', 'Savarese', 'President', 'board', NULL),
  ('2025-spring', 'Anna', 'Maruccio', 'President (outgoing)', 'board', NULL),
  ('2025-spring', 'Marco', 'Neri', 'Vice President', 'board', NULL),
  ('2025-spring', 'Lodovico Attilio', 'Del Re', 'Head of Asset Management', 'asset_management', NULL),
  ('2025-spring', 'Michele', 'Rinaldi', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2025-spring', 'Raman', 'Antanovich', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2025-spring', 'Daniele', 'Biondi', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2025-spring', 'Vittorio', 'Garavelli', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Francesco', 'Anastasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Carl Christian Wilhelm', 'Bengelsdorff', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Francesco', 'Catalanotti', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Andrea', 'Cavenago', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Riccardo', 'Colombo', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Michele', 'D''Andrilli', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Matteo', 'De Guidi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Luca', 'Delorenzi', 'Member (referred an applicant)', 'portfolio', NULL),
  ('2025-spring', 'Antonino', 'Di Blasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Elisabetta', 'Fabris', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Filippo', 'Forzan', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Aleksandar', 'Georgiev', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Federico', 'Indrieri', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Luca', 'Moretto', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Johannes', 'Nachtigal', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Giuseppe', 'Palermo', 'Member (role not stated)', 'portfolio', NULL),
  ('2025-spring', 'Boris', 'Penev', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Giacomo', 'Sada', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-spring', 'Guillermo', 'Shaw', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Pietro', 'Tracanzan', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Tiago', 'Viamonte', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-spring', 'Ivan', 'Yepifanov', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-spring', 'Federico', 'Lazzarini', 'Head of Quantitative Research', 'quant', NULL),
  ('2025-spring', 'Filip', 'Borzecki', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-spring', 'Michele', 'Fanelli', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-spring', 'Alessandro', 'Gallo', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-spring', 'Filippo', 'Gombac', 'Member (referred an applicant)', 'quant', NULL),
  ('2025-spring', 'Rolf', 'Minardi', 'On semester break', 'quant', NULL),
  ('2025-spring', 'Pablo', 'Panizza', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-spring', 'Ianina', 'Tarca', 'On semester break', 'quant', NULL),
  ('2025-spring', 'Anyi', 'Xie', 'On semester break', 'quant', NULL),
  ('2025-spring', 'Rezan', 'Bağcıoğlu', 'Co-Head of Equity Research', 'equity', NULL),
  ('2025-spring', 'Giacomo', 'Pietrosanti', 'Co-Head of Equity Research', 'equity', NULL),
  ('2025-spring', 'Diego', 'Baroni', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Andrea', 'Barra', 'Member (referred an applicant)', 'equity', NULL),
  ('2025-spring', 'Marzio', 'Bonizzi', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Alessandro', 'Bosco', 'Member (referred an applicant)', 'equity', NULL),
  ('2025-spring', 'Giovanni', 'Cianci', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Pierpaolo', 'Cuglietta', 'Member (role not stated)', 'equity', NULL),
  ('2025-spring', 'Stelian', 'Cujba', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Alex', 'Cuker', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Sara', 'De Padova', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Marco', 'Di Marco', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Vincenzo', 'Esposito', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Giorgia', 'Giustizieri', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Cosimo Jacopo', 'Guadalupi', 'Member (referred an applicant)', 'equity', NULL),
  ('2025-spring', 'Bruno', 'Matys', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Andrea', 'Pierini', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Anna', 'Proturo', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Francesca', 'Rombolà', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Savvina', 'Salvaridou', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Nikolaus', 'Schmidt-Chiari', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Filippo', 'Torsa', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Anh Tho', 'Vu', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Samuel', 'Zanchetta', 'Equity Research Analyst', 'equity', NULL),
  ('2025-spring', 'Lukas', 'Louhiluoto', 'Head of Investment Research', 'investment', NULL),
  ('2025-spring', 'Giorgio', 'Gusella', 'Co-Head of Investment Research', 'investment', NULL),
  ('2025-spring', 'Lorenzo', 'Monteduro', 'FX & Commodities Strategist - Lead', 'investment', 'fx-commodities'),
  ('2025-spring', 'Alessandro', 'Palasciano', 'Equities Strategist - Lead', 'investment', 'equities'),
  ('2025-spring', 'Giuseppe', 'Provenzano', 'Fixed Income Strategist - Lead', 'investment', 'fixed-income'),
  ('2025-spring', 'Elias', 'Bouzamondo', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-spring', 'Alexander', 'Brune', 'Equities Strategist', 'investment', 'equities'),
  ('2025-spring', 'Paul', 'Chatin', 'Equities Strategist', 'investment', 'equities'),
  ('2025-spring', 'Francesco', 'D''Angela', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2025-spring', 'Giovanni', 'Francescato', 'Member (referred an applicant)', 'investment', NULL),
  ('2025-spring', 'Felix', 'Lehtonen', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-spring', 'Mylan', 'Monteil', 'Equities Strategist', 'investment', 'equities'),
  ('2025-spring', 'Volodymyr', 'Pavliv', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-spring', 'Tom', 'Petit', 'Equities Strategist', 'investment', 'equities'),
  ('2025-spring', 'Irene', 'Vaccaro', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2025-spring', 'Giovanni', 'Biasiucci', 'Head of Macro Research', 'macro', NULL),
  ('2025-spring', 'Niccolò', 'Rotondi', 'Co-Head of Macro Research', 'macro', NULL),
  ('2025-spring', 'Simone Vittorio', 'Percoco', 'Macro Research Group Leader', 'macro', NULL),
  ('2025-spring', 'Merve', 'Abaci', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Ralph', 'Antonius Hermans', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Juliette', 'Bourgeois', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Francesco', 'Casapenta', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Marco', 'Catoni', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Sophia C.', 'Froehlich', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Diego', 'La Fontaine', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Maria', 'Liova', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Cao-Khai', 'Mai', 'Member (referred an applicant)', 'macro', NULL),
  ('2025-spring', 'Riccardo', 'Mirarchi', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Ludovico', 'Monacelli', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Jovana', 'Mrdalj', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Siddanth', 'Narayana Achanta', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Pramit Priyam', 'Saha', 'Macro Research Analyst', 'macro', NULL),
  ('2025-spring', 'Jack', 'Thompson', 'Member (role not stated)', 'macro', NULL),
  ('2025-spring', 'Matthew Robert', 'Walzer', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Luigi', 'Savarese', 'President', 'board', NULL),
  ('2025-fall', 'Marco', 'Neri', 'Vice President', 'board', NULL),
  ('2025-fall', 'Daniele', 'Biondi', 'Head of Asset Management', 'asset_management', NULL),
  ('2025-fall', 'Michele', 'Rinaldi', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2025-fall', 'Riccardo', 'Colombo', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Filippo', 'Forzan', 'Portfolio Manager', 'portfolio', 'dps'),
  ('2025-fall', 'Aleksandar', 'Georgiev', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2025-fall', 'Federico', 'Indrieri', 'Senior Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Francesco', 'Anastasi', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Raman', 'Antanovich', 'Member (role not stated)', 'portfolio', NULL),
  ('2025-fall', 'Carl Christian Wilhelm', 'Bengelsdorff', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Gian Nicola', 'Buda', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-fall', 'Francesco', 'Catalanotti', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Edgar', 'Coates', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Michele', 'D''Andrilli', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-fall', 'Matteo', 'De Guidi', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-fall', 'Sofia Maria Veneranda', 'De Palma', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Marco', 'Di Marco', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Polina', 'Drofa', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Elisabetta', 'Fabris', 'Portfolio Analyst', 'portfolio', NULL),
  ('2025-fall', 'Giorgio', 'Gagliardo', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Pietro', 'Lupi', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Anton', 'Michels', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-fall', 'Adriana', 'Ovcharova', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Boris', 'Penev', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Matteo Luigi', 'Persico', 'Portfolio Analyst', 'portfolio', 'multi-asset'),
  ('2025-fall', 'Luca', 'Riolo', 'Member (referred an applicant)', 'portfolio', NULL),
  ('2025-fall', 'Annadele', 'Tortora', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Gabriele', 'Traina', 'Portfolio Analyst', 'portfolio', 'dps'),
  ('2025-fall', 'Aigerim', 'Turuspekova', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Ivan', 'Yepifanov', 'Portfolio Analyst', 'portfolio', 'long-short'),
  ('2025-fall', 'Ianina', 'Tarca', 'Co-Head of Quantitative Research', 'quant', NULL),
  ('2025-fall', 'Filip', 'Borzecki', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-fall', 'Elena Sofia', 'Broggini', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-fall', 'Pablo', 'Panizza', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-fall', 'Sebastian', 'Skjensvold', 'Member (role not stated)', 'quant', NULL),
  ('2025-fall', 'Afonso', 'Tavares', 'Quantitative Research Analyst', 'quant', NULL),
  ('2025-fall', 'Rezan', 'Bağcıoğlu', 'Co-Head of Equity Research', 'equity', NULL),
  ('2025-fall', 'Giacomo', 'Pietrosanti', 'Co-Head of Equity Research', 'equity', NULL),
  ('2025-fall', 'Diego', 'Baroni', 'Member (role not stated)', 'equity', NULL),
  ('2025-fall', 'Giovanni', 'Cianci', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Rosita', 'Cirillo', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Alex', 'Cuker', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Giorgia', 'Giustizieri', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Cosimo Jacopo', 'Guadalupi', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Kristers Davis', 'Krauklis', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Giuseppe', 'Marcarelli', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Jill', 'Pascual', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Andrea', 'Pierini', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Anna', 'Proturo', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Aniello', 'Renzullo', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Francesca', 'Rombolà', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Savvina', 'Salvaridou', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Filippo', 'Torsa', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Anh Tho', 'Vu', 'Member (referred an applicant)', 'equity', NULL),
  ('2025-fall', 'Samuel', 'Zanchetta', 'Equity Research Analyst', 'equity', NULL),
  ('2025-fall', 'Volodymyr', 'Pavliv', 'Head of Investment Research', 'investment', NULL),
  ('2025-fall', 'Lukas', 'Louhiluoto', 'Co-Head of Investment Research', 'investment', NULL),
  ('2025-fall', 'Elias', 'Bouzamondo', 'Fixed Income Strategist - Lead', 'investment', 'fixed-income'),
  ('2025-fall', 'Francesco', 'D''Angela', 'FX & Commodities Strategist - Lead', 'investment', 'fx-commodities'),
  ('2025-fall', 'Tom', 'Petit', 'Equities Strategist - Lead', 'investment', 'equities'),
  ('2025-fall', 'Emanuele', 'Bozzo', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-fall', 'Alexander', 'Brune', 'Equities Strategist', 'investment', 'equities'),
  ('2025-fall', 'Paul', 'Chatin', 'Equities Strategist', 'investment', 'equities'),
  ('2025-fall', 'Seungjae', 'Kim', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2025-fall', 'Felix', 'Lehtonen', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-fall', 'Mylan', 'Monteil', 'Equities Strategist', 'investment', 'equities'),
  ('2025-fall', 'Guillermo', 'Shaw', 'Fixed Income Strategist', 'investment', 'fixed-income'),
  ('2025-fall', 'Irene', 'Vaccaro', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2025-fall', 'Karim', 'Vallaro', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2025-fall', 'Niccolò', 'Rotondi', 'Head of Macro Research', 'macro', NULL),
  ('2025-fall', 'Simone Vittorio', 'Percoco', 'Co-Head of Macro Research', 'macro', NULL),
  ('2025-fall', 'Sophia C.', 'Froehlich', 'Macro Research Group Leader', 'macro', NULL),
  ('2025-fall', 'Cao-Khai', 'Mai', 'Macro Research Group Leader', 'macro', NULL),
  ('2025-fall', 'Alessandro', 'Pagan', 'Macro Research Group Leader', 'macro', NULL),
  ('2025-fall', 'Merve', 'Abaci', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Ralph', 'Antonius Hermans', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Juliette', 'Bourgeois', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Marco', 'Catoni', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Giovanni', 'Francescato', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Diego', 'La Fontaine', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Giovanni', 'Lacoppola', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Maria', 'Liova', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Adam', 'Lugossy', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Ludovico', 'Monacelli', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Jovana', 'Mrdalj', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Siddanth', 'Narayana Achanta', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Simona', 'Necula', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Pramit Priyam', 'Saha', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Giuseppe', 'Spina', 'Member (referred an applicant)', 'macro', NULL),
  ('2025-fall', 'Matthew Robert', 'Walzer', 'Macro Research Analyst', 'macro', NULL),
  ('2025-fall', 'Sophia', 'Wu Xinjie', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Niccolò', 'Rotondi', 'President', 'board', NULL),
  ('2026-spring', 'Michele', 'Rinaldi', 'Vice President', 'board', NULL),
  ('2026-spring', 'Riccardo', 'Colombo', 'Head of Asset Management', 'asset_management', NULL),
  ('2026-spring', 'Aleksandar', 'Georgiev', 'Head of Portfolio Management', 'portfolio', NULL),
  ('2026-spring', 'Edgar', 'Coates', 'Portfolio Manager', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Federico', 'Indrieri', 'Portfolio Manager', 'portfolio', 'long-short'),
  ('2026-spring', 'Francesco', 'Anastasi', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Carl Christian Wilhelm', 'Bengelsdorff', 'Portfolio Management Analyst', 'portfolio', NULL),
  ('2026-spring', 'Francesco', 'Catalanotti', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Michele', 'D''Andrilli', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Sofia Maria Veneranda', 'De Palma', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Polina', 'Drofa', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Elisabetta', 'Fabris', 'Portfolio Management Analyst', 'portfolio', NULL),
  ('2026-spring', 'Giorgio', 'Gagliardo', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Lorenzo', 'Larosa', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Anton', 'Michels', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Adriana', 'Ovcharova', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Boris', 'Penev', 'Portfolio Management Analyst', 'portfolio', NULL),
  ('2026-spring', 'Matteo Luigi', 'Persico', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Hristo', 'Petrov', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Annadele', 'Tortora', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Gabriele', 'Traina', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Aigerim', 'Turuspekova', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Raffaele Maria', 'Valensise', 'Portfolio Management Analyst', 'portfolio', 'multi-asset'),
  ('2026-spring', 'Szofi', 'Varga', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Kim Lan', 'Vo', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Ivan', 'Yepifanov', 'Portfolio Management Analyst', 'portfolio', 'long-short'),
  ('2026-spring', 'Ianina', 'Tarca', 'Head of Quantitative Research', 'quant', NULL),
  ('2026-spring', 'Filip', 'Borzecki', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Elena Sofia', 'Broggini', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Luca', 'Busetti', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Emilio', 'De Col', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Michael', 'Ladaa', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Pablo', 'Panizza', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Oscar', 'Poirier', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Sebastian', 'Skjensvold', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Afonso', 'Tavares', 'Quantitative Research Analyst', 'quant', NULL),
  ('2026-spring', 'Anna', 'Proturo', 'Head of Equity Research', 'equity', NULL),
  ('2026-spring', 'Anh Tho', 'Vu', 'Head of Equity Research', 'equity', NULL),
  ('2026-spring', 'Rosita', 'Cirillo', 'Equity Research Team Leader', 'equity', NULL),
  ('2026-spring', 'Cosimo Jacopo', 'Guadalupi', 'Equity Research Team Leader', 'equity', NULL),
  ('2026-spring', 'Nikolaus', 'Schmidt-Chiari', 'Equity Research Team Leader', 'equity', NULL),
  ('2026-spring', 'Filippo', 'Torsa', 'Equity Research Team Leader', 'equity', NULL),
  ('2026-spring', 'Gian Nicola', 'Buda', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Alex', 'Cuker', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Kristers Davis', 'Krauklis', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Hans Gabriel', 'Lin', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Giuseppe', 'Marcarelli', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Jill', 'Pascual', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Aniello', 'Renzullo', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Lisa', 'Riva', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Francesca', 'Rombolà', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Savvina', 'Salvaridou', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Samuel', 'Zanchetta', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Luca', 'Zhuo', 'Equity Research Analyst', 'equity', NULL),
  ('2026-spring', 'Volodymyr', 'Pavliv', 'Head of Investment Research', 'investment', NULL),
  ('2026-spring', 'Tom', 'Petit', 'Head of Investment Research', 'investment', NULL),
  ('2026-spring', 'Elias', 'Bouzamondo', 'Investment Research Team Leader', 'investment', 'fixed-income'),
  ('2026-spring', 'Seungjae', 'Kim', 'Investment Research Team Leader', 'investment', 'fx-commodities'),
  ('2026-spring', 'Mylan', 'Monteil', 'Investment Research Team Leader', 'investment', 'equities'),
  ('2026-spring', 'Elliot', 'Blanckaert', 'FX & Commodities Strategist', 'investment', 'fx-commodities'),
  ('2026-spring', 'Oscar', 'Bowyer', 'Equities Strategist', 'investment', 'equities'),
  ('2026-spring', 'Emanuele', 'Bozzo', 'Investment Research Analyst', 'investment', 'fixed-income'),
  ('2026-spring', 'Alexander', 'Brune', 'Investment Research Analyst', 'investment', 'equities'),
  ('2026-spring', 'Paul', 'Chatin', 'Investment Research Analyst', 'investment', 'equities'),
  ('2026-spring', 'Pierre-Philippe', 'Derckx', 'Investment Research Analyst', 'investment', 'fixed-income'),
  ('2026-spring', 'Tommaso', 'Domenis', 'Investment Research Analyst', 'investment', 'fx-commodities'),
  ('2026-spring', 'Guillermo', 'Shaw', 'Investment Research Analyst', 'investment', 'fixed-income'),
  ('2026-spring', 'Irene', 'Vaccaro', 'Investment Research Analyst', 'investment', 'fx-commodities'),
  ('2026-spring', 'Karim', 'Vallaro', 'Investment Research Analyst', 'investment', 'fx-commodities'),
  ('2026-spring', 'Alessandro', 'Pagan', 'Head of Macro Research', 'macro', NULL),
  ('2026-spring', 'Giovanni', 'Francescato', 'Macro Research Team Leader', 'macro', NULL),
  ('2026-spring', 'Sophia C.', 'Froehlich', 'Macro Research Team Leader', 'macro', NULL),
  ('2026-spring', 'Jovana', 'Mrdalj', 'Macro Research Team Leader', 'macro', NULL),
  ('2026-spring', 'Giuseppe', 'Spina', 'Macro Research Team Leader', 'macro', NULL),
  ('2026-spring', 'Ralph', 'Antonius Hermans', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Vittorio', 'Cravanzola', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Diego', 'La Fontaine', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Adriano', 'La Ragione', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Giovanni', 'Lacoppola', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Maria', 'Liova', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Adam', 'Lugossy', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Cao-Khai', 'Mai', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Ludovico', 'Monacelli', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Siddanth', 'Narayana Achanta', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Simona', 'Necula', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Pramit Priyam', 'Saha', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Matteo Dalla', 'Val', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Giandomenico', 'Vumbaca', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Matthew Robert', 'Walzer', 'Macro Research Analyst', 'macro', NULL),
  ('2026-spring', 'Sophia', 'Wu Xinjie', 'Macro Research Analyst', 'macro', NULL);
    FOR r IN SELECT DISTINCT ON (public.person_name_key(first_name, surname)) first_name, surname
             FROM _seed ORDER BY public.person_name_key(first_name, surname), semester_key DESC LOOP
      SELECT id INTO v_person FROM public.people WHERE name_key = public.person_name_key(r.first_name, r.surname) LIMIT 1;
      IF v_person IS NULL THEN PERFORM public.person_create(r.first_name, r.surname); END IF;
    END LOOP;
    INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
    SELECT p.id, s.semester_key, s.role_label, s.division_key, public.roster_team_key(s.division_key, s.team), 'history'
    FROM _seed s
    JOIN LATERAL (SELECT id FROM public.people WHERE name_key = public.person_name_key(s.first_name, s.surname) LIMIT 1) p ON true
    ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
  END IF;

  -- 7c. Every member gets their person.
  FOR r IN SELECT m.id FROM public.members m
           WHERE NOT EXISTS (SELECT 1 FROM public.person_records pr WHERE pr.record_type = 'member' AND pr.record_id = m.id) LOOP
    PERFORM public.person_for_member(r.id);
  END LOOP;

  -- 7d. Every alumnus: first those the workbook matched to a roster name
  --     under another spelling, then everybody else by name.
  CREATE TEMP TABLE _links (first_name text, surname text, roster_name text) ON COMMIT DROP;
  INSERT INTO _links VALUES
  ('Giovanni', 'Cianci', 'Giovanni Cianci'),
  ('Pietro', 'Cordero', 'Pietro Cordero'),
  ('Marco', 'Di Marco', 'Marco Di Marco'),
  ('Giorgio', 'Gagliardo', 'Giorgio Gagliardo'),
  ('Seungjae', 'Kim', 'Seungjae Kim'),
  ('Alessandro', 'Pagan', 'Alessandro Pagan'),
  ('Matteo Luigi', 'Persico', 'Matteo Luigi Persico'),
  ('Andrea', 'Pierini', 'Andrea Pierini'),
  ('Giacomo', 'Pietrosanti', 'Giacomo Pietrosanti'),
  ('Luca', 'Riolo', 'Luca Riolo'),
  ('Nikolaus', 'Schmidt-Chiari', 'Nikolaus Schmidt-Chiari'),
  ('Merve', 'Abaci', 'Merve Abaci'),
  ('Francesco', 'Anastasi', 'Francesco Anastasi'),
  ('Rezan', 'Bagcioglu', 'Rezan Bağcıoğlu'),
  ('Diego', 'Baroni', 'Diego Baroni'),
  ('Edoardo', 'Bini', 'Edoardo Bini'),
  ('Daniele', 'Biondi', 'Daniele Biondi'),
  ('Alessandro', 'Bontempi', 'Alessandro Bontempi'),
  ('Filip', 'Borzecki', 'Filip Borzecki'),
  ('Alessandro', 'Bosco', 'Alessandro Bosco'),
  ('Juliette', 'Bourgeois', 'Juliette Bourgeois'),
  ('Elena', 'Broggini', 'Elena Sofia Broggini'),
  ('Edoardo', 'Calleri di Sala', 'Edoardo Calleri di Sala'),
  ('Marco', 'Catoni', 'Marco Catoni'),
  ('Alberto', 'Cifrodelli', 'Alberto Cifrodelli'),
  ('Rosita', 'Cirillo', 'Rosita Cirillo'),
  ('Vincenzo Esposito', 'Comas', 'Vincenzo Esposito'),
  ('Stelian', 'Cujba', 'Stelian Cujba'),
  ('Francesco', 'D''Angela', 'Francesco D''Angela'),
  ('Emilio', 'De Col', 'Emilio De Col'),
  ('Matteo', 'De Guidi', 'Matteo De Guidi'),
  ('Antonino', 'Di Blasi', 'Antonino Di Blasi'),
  ('Polina', 'Drofa', 'Polina Drofa'),
  ('Michele', 'Fanelli', 'Michele Fanelli'),
  ('Filippo', 'Forzan', 'Filippo Forzan'),
  ('Giovanni', 'Francescato', 'Giovanni Francescato'),
  ('Sophia C.', 'Froehlich', 'Sophia C. Froehlich'),
  ('Vittorio', 'Garavelli', 'Vittorio Garavelli'),
  ('Giorgia', 'Giustizieri', 'Giorgia Giustizieri'),
  ('Cao', 'Khai Mai', 'Cao-Khai Mai'),
  ('Michael', 'Ladaa', 'Michael Ladaa'),
  ('Diego', 'Lafontaine', 'Diego La Fontaine'),
  ('Lukas', 'Louhiluoto', 'Lukas Louhiluoto'),
  ('Pietro', 'Lupi', 'Pietro Lupi'),
  ('Elia', 'Marenco', 'Elia Marenco'),
  ('Riccardo', 'Mirarchi', 'Riccardo Mirarchi'),
  ('Lorenzo', 'Monteduro', 'Lorenzo Monteduro'),
  ('Luca', 'Moretto', 'Luca Moretto'),
  ('Jovana', 'Mrdalj', 'Jovana Mrdalj'),
  ('Johannes', 'Nachtigal', 'Johannes Nachtigal'),
  ('Luca', 'Natalucci', 'Luca Natalucci'),
  ('Marco', 'Neri', 'Marco Neri'),
  ('Alessandro', 'Palasciano', 'Alessandro Palasciano'),
  ('Alberto', 'Pavanello', 'Alberto Pavanello'),
  ('Volodymyr', 'Pavliv', 'Volodymyr Pavliv'),
  ('Simone Vittorio', 'Percoco', 'Simone Vittorio Percoco'),
  ('Angelo', 'Perri', 'Angelo Perri'),
  ('Oscar', 'Poirier-Sourgens', 'Oscar Poirier'),
  ('Anna', 'Proturo', 'Anna Proturo'),
  ('Michele', 'Rinaldi', 'Michele Rinaldi'),
  ('Lisa', 'Riva', 'Lisa Riva'),
  ('Francesca', 'Rombola', 'Francesca Rombolà'),
  ('Niccolò', 'Rotondi', 'Niccolò Rotondi'),
  ('Rishabh', 'Rupani', 'Rishabh Rupani'),
  ('Savvina', 'Salvaridou', 'Savvina Salvaridou'),
  ('Luigi', 'Savarese', 'Luigi Savarese'),
  ('Federico', 'Schizzi', 'Federico Schizzi'),
  ('Guillermo', 'Shaw', 'Guillermo Shaw'),
  ('Sebastian', 'Skjensvold', 'Sebastian Skjensvold'),
  ('Giuseppe', 'Spina', 'Giuseppe Spina'),
  ('Afonso', 'Tavares', 'Afonso Tavares'),
  ('Anh', 'Tho Vu', 'Anh Tho Vu'),
  ('Federico', 'Tita', 'Federico Tita'),
  ('Filippo', 'Torsa', 'Filippo Torsa'),
  ('Michele', 'Tremolada', 'Michele Tremolada'),
  ('Aigerim', 'Turuspekova', 'Aigerim Turuspekova'),
  ('Karim', 'Vallaro', 'Karim Vallaro'),
  ('Tiago', 'Viamonte', 'Tiago Viamonte'),
  ('Ivan', 'Yepifanov', 'Ivan Yepifanov'),
  ('Ismail', 'Abbassi', 'Ismail Abbassi'),
  ('Raman', 'Antanovich', 'Raman Antanovich'),
  ('Andrea', 'Barra', 'Andrea Barra'),
  ('Giovanni', 'Biasiucci', 'Giovanni Biasiucci'),
  ('Margherita', 'Bonelli', 'Margherita Bonelli'),
  ('Matias', 'Bonfanti', 'Matias Bonfanti'),
  ('Marzio', 'Bonizzi', 'Marzio Bonizzi'),
  ('Marco', 'Caccia', 'Marco Caccia'),
  ('Giovanni', 'Carboniero', 'Giovanni Carboniero'),
  ('Francesco', 'Casapenta', 'Francesco Casapenta'),
  ('Eloi', 'Corman', 'Eloi Corman'),
  ('Pierpaolo', 'Cuglietta', 'Pierpaolo Cuglietta'),
  ('Lorenzo', 'De Felice', 'Lorenzo De Felice'),
  ('Sara', 'De Padova', 'Sara De Padova'),
  ('Lodovico Attilio', 'Del Re', 'Lodovico Attilio Del Re'),
  ('Luca', 'DeLorenzi', 'Luca Delorenzi'),
  ('Giovanni', 'Di Lecce', 'Giovanni Di Lecce'),
  ('Salma', 'El Hambi', 'Salma El Hamdi'),
  ('Giulia', 'Faro', 'Giulia Faro'),
  ('Federico', 'Lazzarini', 'Federico Lazzarini'),
  ('Anna', 'Maruccio', 'Anna Maruccio'),
  ('Giuseppe', 'Provenzano', 'Giuseppe Provenzano'),
  ('Giani', 'Ranzetti', 'Giani Ranzetti'),
  ('Giacomo', 'Sada', 'Giacomo Sada'),
  ('Maddalena', 'Salterini', 'Maddalena Salterini'),
  ('Dario', 'Scordamaglia', 'Dario Scordamaglia'),
  ('Bartu', 'Sen', 'Bartu Sen'),
  ('Michele', 'Zanirato', 'Michele Zanirato'),
  ('Alessandro', 'Archetti', 'Alessandro Archetti'),
  ('Umberto', 'Barbieri', 'Umberto Barbieri'),
  ('Andreas', 'Bengtsson', 'Andreas Bengtsson'),
  ('Andrea', 'Beretta', 'Andrea Beretta'),
  ('Gianluca', 'Caffi', 'Gianluca Caffi'),
  ('Nicolas', 'Carlone', 'Nicolas Carlone'),
  ('Matteo', 'Consalvo', 'Matteo Consalvo'),
  ('Dan Arthur', 'Coseru', 'Dan-Arthur Coseru'),
  ('Riccardo', 'D''agata', 'Riccardo D''Agata'),
  ('Saumya', 'Das', 'Saumya Das'),
  ('Giacomo', 'De Michieli', 'Giacomo de Michieli'),
  ('Rodrigo', 'Duarte Silva', 'Rodrigo Duarte Silva'),
  ('Riccardo', 'Frangi', 'Riccardo Frangi'),
  ('Giacomo', 'Gregori', 'Giacomo Gregori'),
  ('Giorgio', 'Gusella', 'Giorgio Gusella'),
  ('Luca', 'Introna', 'Luca Nicola Introna'),
  ('Emanuele', 'Licari', 'Emanuele Licari'),
  ('Lorenzo Maria', 'Lucicesare', 'Lorenzo Lucicesare'),
  ('Polina', 'Mednikova', 'Polina Mednikova'),
  ('Francesco', 'Nardinocchi', 'Francesco Nardinocchi'),
  ('Tommaso', 'Nocchi', 'Tommaso Nocchi'),
  ('David', 'Overbeck', 'David Overbeck'),
  ('Giuseppe', 'Palermo', 'Giuseppe Palermo'),
  ('Edoardo', 'Pelli', 'Edoardo Pelli'),
  ('David', 'Permutti', 'David Permutti'),
  ('Antonio', 'Petrai', 'Antonio Petrai'),
  ('Giovanni', 'Porporino', 'Giovanni Porporino'),
  ('Jacopo', 'Prevedello', 'Jacopo Prevedello'),
  ('Enrico', 'Sammarco', 'Enrico Sammarco'),
  ('Francesco', 'Sorbone', 'Francesco Sorbone'),
  ('Vasileios', 'Stavropoulos', 'Vasileios Stavropoulos'),
  ('Daniele', 'Stoia', 'Daniele Stoia'),
  ('Matteo', 'Tozzini', 'Matteo Tozzini'),
  ('Angelo', 'Truono', 'Angelo Truono'),
  ('Andrei', 'Tudoroiu', 'Andrei Tudoroiu'),
  ('Erik', 'Vik', 'Erik Vik'),
  ('Matilde', 'Zampa', 'Matilde Zampa'),
  ('Deniz', 'Aktas', 'Deniz Aktas'),
  ('Cisem', 'Almali', 'Cisem Almali'),
  ('Dionysia', 'Balafa', 'Dionysia Balafa'),
  ('Kashish', 'Bhatia', 'Kashish Bhatia'),
  ('Tobia', 'Boselli', 'Tobia Boselli'),
  ('Niccolo', 'Bragaglia', 'Niccolò Bragaglia'),
  ('Andrea', 'Brangi', 'Andrea Brangi'),
  ('Stephan', 'Cabarkapa', 'Stefan Cabarkapa'),
  ('Emanuele', 'Chiarini', 'Emanuele Chiarini'),
  ('Nastassia', 'Chyzheuskaya', 'Anastasia Chyzheuskaya'),
  ('Amadis', 'Cleva', 'Amadis Cleva'),
  ('Enrico', 'Conforto', 'Enrico Conforto'),
  ('Pietro', 'Cuccinotta', 'Pietro Cucinotta'),
  ('Daniele', 'Cutini', 'Daniele Cutini'),
  ('Maria', 'D''Amato', 'Maria D''Amato'),
  ('Daniel', 'De Brujin', 'Daniel de Bruijn'),
  ('Riccardo', 'De Giovanni', 'Riccardo De Giovanni'),
  ('Maurizio', 'De Nisi', 'Maurizio De Nisi'),
  ('Thomas', 'Ferradini', 'Thomas Ferradini'),
  ('Marco', 'Folonaro', 'Marco Folonaro'),
  ('Julia', 'Garcia-Pelayo', 'Julia Garcia Pelayo'),
  ('Davide', 'Giuliano', 'Davide Giuliano'),
  ('Marco', 'Gortan', 'Marco Gortan'),
  ('Fabio', 'Iacobucci', 'Fabio Iacobucci'),
  ('Heeseong', 'Jeong', 'Heeseong Jeong'),
  ('Brunon', 'Magolewski', 'Brunon Magolewski'),
  ('Antonio', 'Messina', 'Antonio Messina'),
  ('Lorenzo', 'Mirone', 'Lorenzo Mirone'),
  ('Matteo', 'Negrini', 'Matteo Negrini'),
  ('Matteo', 'Pellandino', 'Matteo Pellandino'),
  ('Martina', 'Perrone', 'Martina Perrone'),
  ('Gabriele', 'Pujatti', 'Gabriele Pujatti'),
  ('Maria Vittoria', 'Scino', 'Maria Vittoria Scino'),
  ('Akshit', 'Seth', 'Akshit Seth'),
  ('Jacopo', 'Signorelli', 'Jacopo Signorelli'),
  ('Erika (Huiying)', 'Song', 'Erika Song'),
  ('Lorenzo', 'Spada', 'Lorenzo Spada'),
  ('Maksim', 'Stamenkovic', 'Maksim Stamenkovic'),
  ('Luigi', 'Tamburini', 'Luigi Tamburini'),
  ('Matteo', 'Turri', 'Matteo Turri'),
  ('Luciano', 'Valerio', 'Luciano Valerio'),
  ('Luca', 'Vezzani', 'Luca Vezzani'),
  ('Lorenzo', 'Vitileia', 'Lorenzo Vitileia'),
  ('Maho', 'Yoneda', 'Maho Yoneda'),
  ('Francesco', 'Zanettin', 'Francesco Zanettin'),
  ('Mohammad', 'Akhatar', 'Mohamed Akhatar'),
  ('Tommaso', 'Beverina', 'Tommaso Beverina'),
  ('Pietro', 'Bologna', 'Pietro Bologna'),
  ('Ilaria', 'Caponi', 'Ilaria Caponi'),
  ('Giuseppe', 'Casapenta', 'Giuseppe Casapenta'),
  ('Diego', 'Castoldi', 'Diego Castoldi'),
  ('Remogiulio', 'Cavuto', 'Remogiulio Cavuto'),
  ('Antonia', 'Cicala', 'Antonia Cicala'),
  ('Mattia', 'Cosimo', 'Mattia Cosimo'),
  ('Raffaele', 'De Cicco', 'Raffaele De Cicco'),
  ('Victoria', 'Di Vito', 'Victoria Di Vito'),
  ('Riccardo', 'Ghirlandi', 'Riccardo Ghirlandi'),
  ('Luca', 'Giorgianni', 'Luca Giorgianni'),
  ('Bianca', 'Giovetti', 'Bianca Giovetti'),
  ('Pavels', 'Karcevs', 'Pāvels Karcevs'),
  ('Giacomo', 'Mander', 'Giacomo Mander'),
  ('Manuel', 'Marini', 'Manuel Marini'),
  ('Federico', 'Nada', 'Federico Nada'),
  ('Giorgio', 'Profeta', 'Giorgio Profeta'),
  ('Roberto', 'Rainone', 'Roberto Rainone'),
  ('Edoardo', 'Toneatti', 'Edoardo Toneatti'),
  ('Carmine', 'Troilo', 'Carmine Troilo'),
  ('Adnane', 'Zehnine', 'Adnane Zehnine'),
  ('Emilio', 'Alberini', 'Emilio Alberini'),
  ('Francesco', 'Baiano', 'Francesco Baiano'),
  ('Icaro', 'Baraglia', 'Icaro Baraglia'),
  ('Gianmaria', 'Bartoccioni', 'Gianmaria Bartoccioni'),
  ('Mirko', 'Battini', 'Mirko Battini'),
  ('Federico', 'Beccari', 'Federico Beccari'),
  ('Damiano', 'Campini', 'Damiano Campini'),
  ('Vicente', 'Capoulas', 'Vicente Capoulas'),
  ('Maria Carla', 'Cartone', 'Maria Carla Cartone'),
  ('Gabriele', 'Cecchi', 'Gabriele Cecchi'),
  ('Edoardo', 'Cordero', 'Edoardo Cordero'),
  ('Mariachiara', 'De Bellis', 'Mariachiara De Bellis'),
  ('Eleonora', 'Di Veroli', 'Eleonora Di Veroli'),
  ('Andrea', 'Drago', 'Andrea Drago'),
  ('Edoardo', 'Ferri', 'Edoardo Ferri'),
  ('Andrea', 'Maccarrone', 'Andrea Maccarrone'),
  ('Giovanni', 'Marcato', 'Giovanni Marcato'),
  ('Marco', 'Margiotta', 'Marco Manzo Margiotta'),
  ('Vincenzo', 'Montilli', 'Vincenzo Montilli'),
  ('Claudio', 'Napoli', 'Claudio Napoli'),
  ('Thinh', 'Nguyen', 'Thinh Nguyen'),
  ('Gabriele', 'Presti', 'Gabriele Presti'),
  ('Lorenzo', 'Spiga', 'Lorenzo Spiga'),
  ('Andrea Alessio', 'Taglietti', 'Andrea Taglietti'),
  ('Daniele', 'Tana', 'Daniele Tana'),
  ('Raffaele', 'Zhu', 'Raffaele Zhu'),
  ('Vito', 'Amatulli', 'Vito Antonio Amatulli'),
  ('Silvia', 'Capuano', 'Silvia Capuano'),
  ('Lucrezia', 'Cimiotti', 'Lucrezia Cimiotti'),
  ('Chiel', 'Dupont', 'Chiel Dupont'),
  ('Miquel', 'Lluesma', 'Miquel Lluesma'),
  ('Gabriele', 'Maggio', 'Gabriele Maggio'),
  ('Alessandro', 'Patrizi', 'Alessandro Patrizi'),
  ('Andrea', 'Sala', 'Andrea Sala'),
  ('Arturo', 'Schembri', 'Arturo Schembri'),
  ('Gianluca Luigi', 'Segreto', 'Gianluca Luigi Segreto'),
  ('Marco', 'Uggeri', 'Marco Uggeri'),
  ('Jeh', 'Patel', 'Jeh Patel');
  FOR r IN SELECT a.id, l.roster_name FROM public.alumni a
           JOIN _links l ON public.person_name_key(a.name, a.surname) = public.person_name_key(l.first_name, l.surname)
           WHERE NOT EXISTS (SELECT 1 FROM public.person_records pr WHERE pr.record_type = 'alumni' AND pr.record_id = a.id) LOOP
    SELECT CASE WHEN count(*) = 1 THEN (array_agg(p.id))[1] END INTO v_person
    FROM public.people p
    WHERE p.name_key = public.person_name_key(r.roster_name, '')
      AND NOT EXISTS (SELECT 1 FROM public.person_records x WHERE x.person_id = p.id AND x.record_type = 'alumni');
    IF v_person IS NOT NULL THEN
      INSERT INTO public.person_records (person_id, record_type, record_id) VALUES (v_person, 'alumni', r.id)
      ON CONFLICT (record_type, record_id) DO NOTHING;
    END IF;
  END LOOP;
  FOR r IN SELECT a.id FROM public.alumni a
           WHERE NOT EXISTS (SELECT 1 FROM public.person_records pr WHERE pr.record_type = 'alumni' AND pr.record_id = a.id) LOOP
    PERFORM public.person_for_alumni(r.id);
  END LOOP;

  -- 7e. Spelling corrections from the alumni workbook (reports and the
  --     LinkedIn address agree). The person's name follows.
  CREATE TEMP TABLE _fixes (old_first text, old_surname text, new_first text, new_surname text) ON COMMIT DROP;
  INSERT INTO _fixes VALUES
  ('Salma', 'El Hambi', 'Salma', 'El Hamdi'),
  ('Pietro', 'Cuccinotta', 'Pietro', 'Cucinotta'),
  ('Daniel', 'De Brujin', 'Daniel', 'de Bruijn'),
  ('Stephan', 'Cabarkapa', 'Stefan', 'Cabarkapa'),
  ('Mohammad', 'Akhatar', 'Mohamed', 'Akhatar'),
  ('Cao', 'Khai Mai', 'Cao-Khai', 'Mai'),
  ('Anh', 'Tho Vu', 'Anh Tho', 'Vu'),
  ('Vincenzo Esposito', 'Comas', 'Vincenzo', 'Esposito Comas'),
  ('Luca', 'DeLorenzi', 'Luca', 'Delorenzi');
  FOR r IN SELECT a.id, f.new_first, f.new_surname FROM public.alumni a
           JOIN _fixes f ON a.name = f.old_first AND a.surname = f.old_surname LOOP
    UPDATE public.alumni SET name = r.new_first, surname = r.new_surname WHERE id = r.id;
    UPDATE public.people p SET first_name = r.new_first, surname = r.new_surname
    FROM public.person_records pr
    WHERE pr.record_type = 'alumni' AND pr.record_id = r.id AND p.id = pr.person_id
      AND p.name_key <> public.person_name_key(r.new_first, r.new_surname)
      AND NOT EXISTS (SELECT 1 FROM public.roster_entries e WHERE e.person_id = p.id);
  END LOOP;

  -- 7f. Former members with a role who are not in the directory yet. Never
  --     anybody expelled, and never anybody already in the directory.
  CREATE TEMP TABLE _pending (first_name text, surname text, last_semester_key text, last_role text, career text) ON COMMIT DROP;
  INSERT INTO _pending VALUES
  ('Giovanni', 'Lacoppola', '2026-spring', 'Macro Research Analyst', 'Fall 2025 – Spring 2026: Macro Research Analyst'),
  ('Ludovico', 'Monacelli', '2026-spring', 'Macro Research Analyst', 'Spring 2025 – Spring 2026: Macro Research Analyst'),
  ('Simona', 'Necula', '2026-spring', 'Macro Research Analyst', 'Fall 2025 – Spring 2026: Macro Research Analyst'),
  ('Pablo', 'Panizza', '2026-spring', 'Quantitative Research Analyst', 'Spring 2025 – Spring 2026: Quantitative Research Analyst'),
  ('Pramit Priyam', 'Saha', '2026-spring', 'Macro Research Analyst', 'Fall 2024 – Spring 2026: Macro Research Analyst'),
  ('Felix', 'Lehtonen', '2025-fall', 'Fixed Income Strategist', 'Spring 2025 – Fall 2025: Fixed Income Strategist'),
  ('Alessandro', 'Gallo', '2025-spring', 'Quantitative Research Analyst', 'Spring 2025: Quantitative Research Analyst'),
  ('Rolf', 'Minardi', '2025-spring', 'On semester break', 'Spring 2024: Quantitative Research Analyst → [no record: Fall 2024] → Spring 2025: On semester break'),
  ('Jack', 'Thompson', '2025-spring', 'Member (role not stated)', 'Spring 2024 – Fall 2024: Macro Research Analyst → Spring 2025: Member (role not stated)'),
  ('Pietro', 'Tracanzan', '2025-spring', 'Portfolio Analyst', 'Fall 2023 – Spring 2025: Portfolio Management Analyst (DPS)'),
  ('Anyi', 'Xie', '2025-spring', 'On semester break', 'Fall 2024: Quantitative Research Analyst → Spring 2025: On semester break'),
  ('Vincent', 'de Naurois', '2024-fall', 'Equity Research Analyst', 'Fall 2022 – Fall 2024: Equity Research Analyst'),
  ('Lorenzo', 'Favaretto', '2024-fall', 'Equity Research Analyst', 'Fall 2024: Equity Research Analyst'),
  ('Paride', 'Lauretti', '2024-fall', 'FX & Commodities Strategist', 'Fall 2024: FX & Commodities Strategist'),
  ('Caterina', 'Beorchia', '2024-spring', 'Member (role not stated)', 'Spring 2023: Portfolio Management Analyst (MAGO) → Fall 2023: Portfolio Manager (PIR) → Spring 2024: Member (role not stated)'),
  ('Erik', 'Bergqvist', '2024-spring', 'Member (role not stated)', 'Fall 2023: Quantitative Research Analyst → Spring 2024: Member (role not stated)'),
  ('Francesco', 'Braicovich', '2024-spring', 'Member (role not stated)', 'Fall 2023: Quantitative Research Analyst → Spring 2024: Member (role not stated)'),
  ('Ada', 'Egilmez', '2024-spring', 'On semester break', 'Fall 2021 – Fall 2023: Macro Research Analyst → Spring 2024: On semester break'),
  ('Basar Gokberk', 'Inan', '2024-spring', 'Macro Research Analyst', 'Fall 2022 – Spring 2024: Macro Research Analyst'),
  ('Ruslana', 'Karaman', '2024-spring', 'Member (role not stated)', 'Spring 2023 – Fall 2023: Equity Research Analyst → Spring 2024: Member (role not stated)'),
  ('Domenico', 'Mancuso', '2024-spring', 'Member (role not stated)', 'Spring 2023: Macro Research Analyst → Fall 2023 – Spring 2024: Member (role not stated)'),
  ('Luca', 'Paris', '2024-spring', 'Member (role not stated)', 'Spring 2022: Equity Research Analyst → Fall 2022: Member (internal-event sign-up only) → Spring 2023: Senior Equity Research Analyst → Fall 2023: Equity Research Analyst → Spring 2024: Member (role not stated)'),
  ('Francesco', 'Santoro', '2024-spring', 'Member (role not stated)', 'Fall 2023: FX & Commodities Strategist → Spring 2024: Member (role not stated)'),
  ('Nathan', 'Van Es', '2024-spring', 'Quantitative Research Analyst', 'Fall 2023 – Spring 2024: Quantitative Research Analyst'),
  ('Pengcheng', 'Zhang', '2024-spring', 'Equities Strategist', 'Fall 2023 – Spring 2024: Equities Strategist'),
  ('Marina', 'Zhilina', '2024-spring', 'Member (role not stated)', 'Fall 2023: Macro Research Analyst → Spring 2024: Member (role not stated)'),
  ('Nadia', 'Guidoccio', '2023-spring', 'Head of Media & Communication', 'Fall 2022: Media & Communication member → Spring 2023: Head of Media & Communication'),
  ('Marta', 'Leva', '2022-fall', 'External Relations', 'Spring 2021: Macro Research Analyst → Fall 2021: External Relations → Spring 2022: Vice President → Fall 2022: External Relations'),
  ('Matteo', 'Ticli', '2022-fall', 'Quantitative Research Analyst', 'Spring 2022 – Fall 2022: Quantitative Research Analyst'),
  ('Xuan', 'Liu', '2022-spring', 'Macro Research Analyst', 'Fall 2021 – Spring 2022: Macro Research Analyst'),
  ('Lara', 'Deniz', '2021-fall', 'Macro Research Analyst', 'Fall 2020 – Fall 2021: Macro Research Analyst'),
  ('Anna', 'Vlastova', '2021-fall', 'Quantitative Research Analyst', 'Fall 2021: Quantitative Research Analyst'),
  ('Mohammad', 'Pourmohammadi', '2021-spring', 'Risk Analyst', 'Fall 2020 – Spring 2021: Risk Analyst');
  INSERT INTO public.alumni_pending (person_id, last_semester_key, last_role, career)
  SELECT p.id, s.last_semester_key, s.last_role, s.career
  FROM _pending s
  JOIN LATERAL (SELECT id FROM public.people WHERE name_key = public.person_name_key(s.first_name, s.surname) LIMIT 1) p ON true
  WHERE NOT EXISTS (SELECT 1 FROM public.person_records x WHERE x.person_id = p.id AND x.record_type = 'alumni')
    AND NOT EXISTS (SELECT 1 FROM public.alumni a WHERE public.person_name_key(a.name, a.surname) = public.person_name_key(s.first_name, s.surname))
    AND NOT EXISTS (SELECT 1 FROM public.members m
                    WHERE public.person_name_key(m.first_name, m.surname) = public.person_name_key(s.first_name, s.surname)
                      AND m.membership_status = 'expelled')
  ON CONFLICT (person_id) DO NOTHING;

  -- 7g. Registers already frozen in the workspace, for semesters the
  --     history does not cover.
  FOR r IN SELECT sm.* FROM public.semester_members sm
           WHERE sm.member_id IS NOT NULL AND coalesce(sm.role, '') <> ''
             AND sm.semester_key ~ '^[0-9]{4}-(fall|spring)$'
             AND NOT EXISTS (SELECT 1 FROM public.roster_entries e WHERE e.semester_key = sm.semester_key AND e.source = 'history') LOOP
    BEGIN
      v_person := public.person_for_member(r.member_id);
      CONTINUE WHEN v_person IS NULL;
      INSERT INTO public.roster_entries (person_id, semester_key, role_label, division_key, team, source)
      SELECT v_person, r.semester_key,
             public.roster_role_label(r.role::public.app_role, coalesce(NULLIF(r.division, ''), 'none')::public.org_division),
             public.roster_division_key(r.role::public.app_role, coalesce(NULLIF(r.division, ''), 'none')::public.org_division),
             NULL, 'register'
      ON CONFLICT (person_id, semester_key, role_label, division_key) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Register row % not added to the roster: %', r.id, SQLERRM;
    END;
  END LOOP;

  SELECT count(*) INTO v_n FROM public.people;
  RAISE NOTICE 'Step 94: % people, % roster entries, % alumni to complete.',
    v_n, (SELECT count(*) FROM public.roster_entries), (SELECT count(*) FROM public.alumni_pending WHERE status = 'open');
END
$seed$;


-- ---------------------------------------------------------------------
-- 8. The semester's last day: 21:00 UTC on 31 January and 31 August
--    (22:00 or 23:00 in Milan), while the semester is still current.
-- ---------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('roster_close_semester') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'roster_close_semester');
    PERFORM cron.schedule('roster_close_semester', '0 21 31 1,8 *', $job$SELECT public.roster_close_semester()$job$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'roster_close_semester schedule not created: %', SQLERRM;
END
$cron$;


-- ---------------------------------------------------------------------
-- 9. The offer email's subject. Every subject already ends "| Minerva
--    IMS" (email-subjects.ts), so this one stops naming the Society a
--    second time. The source is transactional-emails.ts; the stored copy
--    the send path reads follows it, unless somebody rewrote it.
-- ---------------------------------------------------------------------
UPDATE public.auto_email_templates
   SET subject = 'Your offer of membership | Minerva IMS'
 WHERE key = 'offer_to_join'
   AND subject IN ('Your offer to join Minerva IMS | Minerva IMS', 'Your offer to join Minerva IMS', 'An offer to join Minerva IMS');
