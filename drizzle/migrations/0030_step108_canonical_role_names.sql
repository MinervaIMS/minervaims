-- =====================================================================
-- STEP 108: ONE NAME FOR EACH ROLE, IN EVERY SEMESTER.
-- ---------------------------------------------------------------------
-- The roster history was transcribed from each semester's own list, and
-- the lists did not name the same role the same way: Elisabetta Fabris
-- reads "Portfolio Analyst" in one semester and "Portfolio Management
-- Analyst" in the next, for the same role in the same division. The
-- register has always written the division's full name first ("Equity
-- Research Senior Analyst", "Macro Research Team Leader"), and the
-- President chose that form for the whole history:
--
--   Portfolio Analyst                 -> Portfolio Management Analyst
--   Senior Portfolio Analyst          -> Portfolio Management Senior Analyst
--   Senior <Division> Analyst         -> <Division> Senior Analyst
--   <Division> Group Leader           -> <Division> Team Leader
--
-- for the five research divisions (Equity Research, Investment Research,
-- Macro Research, Quantitative Research, Portfolio Management). Every
-- other role keeps its name: a desk's strategist, a Board office, a
-- division that no longer exists, "Member (...)" and "On semester
-- break". Report bylines are not touched: a report keeps the words
-- printed on its cover.
--
-- The same rule now holds from here on: roster_canonical_role() names the
-- role, and the trigger roster_entries_canonical_role applies it to every
-- row written (the register, the close of a semester and the corrections
-- of People > Time Machine), so the old forms cannot come back.
--
-- A semester that holds a person twice for one role once both names are
-- the same (one row in each form) keeps one row: the team of the other
-- is kept when the remaining row has none.
--
-- BACKUP FIRST. Every row that changes, and every row kept in place of a
-- twin, is copied whole into public.data_backup (reason
-- 'step108_role_names') before the change, in the same transaction. To
-- see them:
--   SELECT row_data FROM public.data_backup WHERE reason = 'step108_role_names';
--
-- SAFE TO RUN TWICE: the second run finds no old name and changes
-- nothing. No email, no other table.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.data_backup (
  source   text        NOT NULL,
  row_id   text        NOT NULL,
  reason   text        NOT NULL,
  row_data jsonb       NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, row_id, reason)
);
ALTER TABLE public.data_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.data_backup TO service_role;

-- The one name of a role. Its twin is canonicalRoleLabel() in
-- src/lib/rosters.ts (and the edge copy), checked value for value by
-- scripts/role-names.test.mjs.
CREATE OR REPLACE FUNCTION public.roster_canonical_role(p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $fn$
  SELECT CASE
    WHEN x.v = 'Portfolio Analyst' THEN 'Portfolio Management Analyst'
    WHEN x.v = 'Senior Portfolio Analyst' THEN 'Portfolio Management Senior Analyst'
    WHEN x.v ~ '^Senior (Equity Research|Investment Research|Macro Research|Quantitative Research|Portfolio Management) Analyst$'
      THEN regexp_replace(x.v, '^Senior (.+) Analyst$', '\1 Senior Analyst')
    WHEN x.v ~ '^(Equity Research|Investment Research|Macro Research|Quantitative Research|Portfolio Management) Group Leader$'
      THEN regexp_replace(x.v, ' Group Leader$', ' Team Leader')
    ELSE p_label
  END
  FROM (SELECT regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g') AS v) x;
$fn$;

REVOKE ALL ON FUNCTION public.roster_canonical_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roster_canonical_role(text) TO authenticated, service_role;

DO $step108_roles$
DECLARE v_changed integer; v_merged integer;
BEGIN
  -- 1. Backups: every row whose name changes, and every row that will
  --    absorb a twin's team.
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'roster_entries', e.id::text, 'step108_role_names', to_jsonb(e)
    FROM public.roster_entries e
   WHERE public.roster_canonical_role(e.role_label) <> e.role_label
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'roster_entries', t.id::text, 'step108_role_names', to_jsonb(t)
    FROM public.roster_entries s
    JOIN public.roster_entries t
      ON t.person_id = s.person_id AND t.semester_key = s.semester_key AND t.division_key = s.division_key
     AND t.role_label = public.roster_canonical_role(s.role_label)
   WHERE public.roster_canonical_role(s.role_label) <> s.role_label
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  -- 2. Twins: the row already in the new form stays, with the team of
  --    the old one when it had none; the old one goes.
  UPDATE public.roster_entries t
     SET team = s.team, updated_at = now()
    FROM public.roster_entries s
   WHERE public.roster_canonical_role(s.role_label) <> s.role_label
     AND t.person_id = s.person_id AND t.semester_key = s.semester_key AND t.division_key = s.division_key
     AND t.role_label = public.roster_canonical_role(s.role_label)
     AND t.team IS NULL AND s.team IS NOT NULL;

  DELETE FROM public.roster_entries s
    USING public.roster_entries t
   WHERE public.roster_canonical_role(s.role_label) <> s.role_label
     AND t.person_id = s.person_id AND t.semester_key = s.semester_key AND t.division_key = s.division_key
     AND t.role_label = public.roster_canonical_role(s.role_label);
  GET DIAGNOSTICS v_merged = ROW_COUNT;

  -- 3. Every other old name takes the one name.
  UPDATE public.roster_entries
     SET role_label = public.roster_canonical_role(role_label), updated_at = now()
   WHERE public.roster_canonical_role(role_label) <> role_label;
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  RAISE NOTICE 'Step 108: % roster entries renamed, % twins folded into one.', v_changed, v_merged;
END
$step108_roles$;

-- From here on, every row is written with the one name.
CREATE OR REPLACE FUNCTION public.roster_entries_canonical_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  NEW.role_label := public.roster_canonical_role(NEW.role_label);
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.roster_entries_canonical_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS roster_entries_canonical_role ON public.roster_entries;
CREATE TRIGGER roster_entries_canonical_role
  BEFORE INSERT OR UPDATE OF role_label ON public.roster_entries
  FOR EACH ROW EXECUTE FUNCTION public.roster_entries_canonical_role();