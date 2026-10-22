-- =====================================================================
-- STEP 90. One definition of "attended": who each registration is.
-- ---------------------------------------------------------------------
-- The events-attended count (People > Members and its list, Events > My
-- events) recognised a person only by their account or by the address on
-- their record. Somebody ticked under their name alone (a walk-in typed at
-- the door, a Teams report row found by name, a hand-made addition) was
-- recognised on the door list and then missed by the count.
--
-- From now on there is ONE answer to "which member is this registration?",
-- here in the database, and every reader uses it:
--
--   1. a link already stored on the row (made automatically when it was
--      certain, or by a person with "Link to member");
--   2. the account the registration was made with;
--   3. the address, matched against each member's record AND their
--      account address (either can be the one somebody types);
--   4. the name, when exactly one member carries it. Two members with the
--      same name is NO match: the row is flagged "Needs linking" and is not
--      counted for anybody until a person links it.
--
-- Names are compared the way the Teams import and the door list compare
-- them (public.person_name_key, mirrored by normaliseName in
-- supabase/functions/_shared/member-match.ts): trailing tags such as
-- "(Unverified)" or "(Guest)" dropped, accents, case and punctuation
-- ignored, and the words sorted, so "Rossi Mario" is "Mario Rossi".
-- Expelled members are never matched.
--
-- WHAT IS ADDED
--   event_registrations.member_id      the member the row belongs to,
--                                      stored once certain, so the count
--                                      stays put if a name is later edited
--   event_registrations.member_link    how it was linked: account, email,
--                                      name, manual (a person chose), or
--                                      none (a person said: not a member)
--   event_registrations.member_linked_by / member_linked_at
--   public.person_name_key(text)       the name key
--   public.match_member(...)           the answer for one person
--   public.event_registration_members  the answer for every registration
--                                      (service role only)
--   a trigger that links a new row when the answer is certain.
--
-- THE BACKFILL links existing rows only where the answer is certain
-- (account, address, or a name carried by exactly one member), changes
-- nothing else, and reports what it did through a NOTICE.
--
-- Safe to run twice.
-- =====================================================================

-- 1. The name key ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_name_key(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $fn$
DECLARE
  s text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  tag text;
BEGIN
  -- Up to three trailing tags ("(Unverified)", "(External)", "(Guest)"),
  -- unless the tag is the whole name.
  FOR i IN 1..3 LOOP
    tag := substring(s FROM '\s*\([^()]{1,40}\)\s*$');
    EXIT WHEN tag IS NULL OR length(tag) >= length(s);
    s := btrim(left(s, length(s) - length(tag)));
  END LOOP;
  s := lower(regexp_replace(normalize(s, NFKD), '[̀-ͯ]', '', 'g'));
  s := regexp_replace(s, '[^a-z0-9\s]', ' ', 'g');
  RETURN coalesce(
    (SELECT string_agg(w, ' ' ORDER BY w COLLATE "C")
       FROM regexp_split_to_table(s, '\s+') AS w
      WHERE w <> ''),
    '');
END;
$fn$;

-- 2. The link on the row -----------------------------------------------
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_link text,
  ADD COLUMN IF NOT EXISTS member_linked_by uuid,
  ADD COLUMN IF NOT EXISTS member_linked_at timestamptz;

ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_member_link_check;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_member_link_check
  CHECK (member_link IS NULL OR member_link IN ('account', 'email', 'name', 'manual', 'none'));

CREATE INDEX IF NOT EXISTS event_registrations_member_idx
  ON public.event_registrations (member_id) WHERE member_id IS NOT NULL;

-- 3. Who one person is ------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_member(p_user_id uuid, p_email text, p_name text)
RETURNS TABLE (member_id uuid, how text, ambiguous boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_id uuid;
  v_n integer;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_key text;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT m.id INTO v_id FROM public.members m
     WHERE m.user_id = p_user_id AND m.membership_status IS DISTINCT FROM 'expelled'
     ORDER BY m.created_at LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, 'account'::text, false; RETURN;
    END IF;
  END IF;

  IF v_email <> '' THEN
    SELECT count(DISTINCT m.id), min(m.id::text)::uuid INTO v_n, v_id
      FROM public.members m
      LEFT JOIN public.profiles p ON p.id = m.user_id
     WHERE m.membership_status IS DISTINCT FROM 'expelled'
       AND (lower(btrim(m.email)) = v_email OR lower(btrim(p.email)) = v_email);
    IF v_n = 1 THEN
      RETURN QUERY SELECT v_id, 'email'::text, false; RETURN;
    END IF;
  END IF;

  v_key := public.person_name_key(p_name);
  IF v_key <> '' THEN
    SELECT count(*), min(m.id::text)::uuid INTO v_n, v_id
      FROM public.members m
     WHERE m.membership_status IS DISTINCT FROM 'expelled'
       AND public.person_name_key(coalesce(m.first_name, '') || ' ' || coalesce(m.surname, '')) = v_key;
    IF v_n = 1 THEN
      RETURN QUERY SELECT v_id, 'name'::text, false; RETURN;
    ELSIF v_n > 1 THEN
      RETURN QUERY SELECT NULL::uuid, 'none'::text, true; RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT NULL::uuid, 'none'::text, false;
END;
$fn$;

REVOKE ALL ON FUNCTION public.match_member(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_member(uuid, text, text) TO service_role;

-- 4. Who every registration is ----------------------------------------
-- Set-based, so a semester of registrations is answered in one pass. The
-- same rules as match_member, in the same order, after the stored link.
CREATE OR REPLACE VIEW public.event_registration_members AS
WITH m AS (
  SELECT mm.id, mm.user_id,
         lower(btrim(mm.email)) AS email,
         lower(btrim(p.email)) AS account_email,
         public.person_name_key(coalesce(mm.first_name, '') || ' ' || coalesce(mm.surname, '')) AS name_key
    FROM public.members mm
    LEFT JOIN public.profiles p ON p.id = mm.user_id
   WHERE mm.membership_status IS DISTINCT FROM 'expelled'
),
by_name AS (
  SELECT name_key, count(*) AS n, min(id::text)::uuid AS id
    FROM m WHERE name_key <> '' GROUP BY name_key
),
by_email AS (
  SELECT e, count(DISTINCT id) AS n, min(id::text)::uuid AS id
    FROM (SELECT id, email AS e FROM m UNION ALL SELECT id, account_email FROM m) x
   WHERE e IS NOT NULL AND e <> ''
   GROUP BY e
),
resolved AS (
  SELECT r.id AS registration_id, r.event_id, r.attended, r.member_link,
         stored.id AS stored_id,
         (SELECT a.id FROM m a WHERE r.user_id IS NOT NULL AND a.user_id = r.user_id LIMIT 1) AS account_id,
         (SELECT be.id FROM by_email be WHERE be.e = lower(btrim(r.email)) AND be.n = 1) AS email_id,
         bn.n AS name_n, bn.id AS name_id
    FROM public.event_registrations r
    LEFT JOIN m stored ON stored.id = r.member_id
    LEFT JOIN by_name bn ON bn.name_key = public.person_name_key(r.name) AND bn.name_key <> ''
)
SELECT registration_id, event_id, attended,
       CASE
         WHEN member_link = 'none' THEN NULL
         WHEN stored_id IS NOT NULL THEN stored_id
         WHEN account_id IS NOT NULL THEN account_id
         WHEN email_id IS NOT NULL THEN email_id
         WHEN name_n = 1 THEN name_id
       END AS member_id,
       CASE
         WHEN member_link = 'none' THEN 'none'
         WHEN stored_id IS NOT NULL THEN coalesce(nullif(member_link, 'none'), 'manual')
         WHEN account_id IS NOT NULL THEN 'account'
         WHEN email_id IS NOT NULL THEN 'email'
         WHEN name_n = 1 THEN 'name'
         ELSE 'none'
       END AS how,
       (member_link IS DISTINCT FROM 'none' AND stored_id IS NULL AND account_id IS NULL
        AND email_id IS NULL AND coalesce(name_n, 0) > 1) AS ambiguous
  FROM resolved;

REVOKE ALL ON public.event_registration_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.event_registration_members TO service_role;

-- 5. A new row is linked when the answer is certain -------------------
-- A row a person linked ('manual') or marked as not a member ('none') is
-- never relinked. A stored link survives an edit to the row's NAME (so a
-- corrected spelling does not move the attendance); a change of account
-- or address asks the question again.
CREATE OR REPLACE FUNCTION public.event_registration_link_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
BEGIN
  IF NEW.member_link IN ('manual', 'none') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.member_id IS NOT NULL
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND lower(btrim(coalesce(NEW.email, ''))) = lower(btrim(coalesce(OLD.email, ''))) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.member_id IS NOT NULL THEN
    NEW.member_link := coalesce(NEW.member_link, 'manual');
    RETURN NEW;
  END IF;
  SELECT * INTO r FROM public.match_member(NEW.user_id, NEW.email, NEW.name);
  IF r.member_id IS NOT NULL AND NOT r.ambiguous THEN
    NEW.member_id := r.member_id;
    NEW.member_link := r.how;
  ELSE
    NEW.member_id := NULL;
    NEW.member_link := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS event_registrations_link_member ON public.event_registrations;
CREATE TRIGGER event_registrations_link_member
  BEFORE INSERT OR UPDATE OF user_id, email, name ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_registration_link_member();

-- 6. The backfill ------------------------------------------------------
DO $$
DECLARE
  v_account int;
  v_email int;
  v_name int;
  v_ambiguous int;
  v_ambiguous_attended int;
  v_unmatched int;
  v_kept int;
BEGIN
  SELECT count(*) INTO v_kept FROM public.event_registrations WHERE member_id IS NOT NULL OR member_link IS NOT NULL;

  WITH linked AS (
    UPDATE public.event_registrations r
       SET member_id = v.member_id, member_link = v.how
      FROM public.event_registration_members v
     WHERE v.registration_id = r.id
       AND r.member_id IS NULL AND r.member_link IS NULL
       AND v.member_id IS NOT NULL AND v.how IN ('account', 'email', 'name')
    RETURNING v.how
  )
  SELECT count(*) FILTER (WHERE how = 'account'), count(*) FILTER (WHERE how = 'email'), count(*) FILTER (WHERE how = 'name')
    INTO v_account, v_email, v_name
    FROM linked;

  SELECT count(*), count(*) FILTER (WHERE attended) INTO v_ambiguous, v_ambiguous_attended
    FROM public.event_registration_members WHERE ambiguous;
  SELECT count(*) INTO v_unmatched
    FROM public.event_registration_members WHERE member_id IS NULL AND NOT ambiguous;

  RAISE NOTICE 'Attendance links: % rows linked to a member (% by account, % by address, % by a unique name); % rows match more than one member by name and need linking by hand (% of them ticked as present); % rows are guests or match nobody; % rows already carried a link and were left as they were.',
    v_account + v_email + v_name, v_account, v_email, v_name, v_ambiguous, v_ambiguous_attended, v_unmatched, v_kept;
END $$;
