-- =====================================================================
-- STEP 108: ONE PERSON, ONE RECORD.
-- ---------------------------------------------------------------------
-- Three people were split in two:
--
--   * Rezan Bağcıoğlu. The roster history spells the name with the
--     Turkish letters; the alumni directory and the report covers write
--     "Rezan Bagcioglu". The name key (person_name_key) folded most
--     accented letters but not "ğ", so the history read "rezan ba cio lu"
--     and the directory "rezan bagcioglu": two people, and the reports,
--     found under both, were linked to neither.
--   * Matteo Luigi Persico, who signs his reports "Matteo Persico": the
--     same person under a shorter name, which only a person can confirm.
--   * Marco Caccia, an alumnus, added to an event's attendance from the
--     Teams report as an unknown guest.
--
-- WHAT THIS FILE DOES
--   1. The name key folds every accented Latin letter the way the report
--      matching already does (person_tokens): what it folded before is
--      folded exactly as before, and a letter it missed ("ğ", "ș", "ț"
--      and the like) now loses its accent instead of splitting the word.
--      The attendance name key (person_name_key(text), mirrored by
--      normaliseName in supabase/functions/_shared/member-match.ts) also
--      folds the letters that have no accent to drop: ı, ł, đ, ø, ß, æ,
--      œ, þ. Every stored key is worked out again.
--   2. people_join(keep, merge): one person absorbs another, with their
--      records, semesters, pending alumni entry and event attendance
--      links. Every row it moves or removes is copied first into
--      public.data_backup, and the join is written to people_merge_log.
--   3. The safe joins, now: two people whose names are the SAME once the
--      letters are folded ("Rezan Bağcıoğlu" and "Rezan Bagcioglu"),
--      when exactly two carry that name and they are not two records of
--      the same kind (two members, or two alumni, are two people).
--   4. Everything else is asked: people_match_proposals() lists the pairs
--      that may be one person (a middle name more or less, or the same
--      words in another order), for the President and the Vice-President
--      to answer in People > Time Machine, "Same person" or "Not the same"
--      (people_match_decisions). Nothing is joined without that answer.
--   5. An event's attendance can name the person a guest is
--      (event_registrations.person_id), so an alumnus who comes to an
--      event is recognised as one; guest_person_candidates(name) is what
--      the attendance page asks when a guest's name is typed or read
--      from a Teams report.
--
-- No email; the internal person code (people.code) is never shown.
-- SAFE TO RUN TWICE: the keys are already worked out, the pairs already
-- joined, and the backups keep their first copy.
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

-- 1. THE NAME KEYS --------------------------------------------------------

-- The register's key: the same translation as before, then any accent it
-- did not list taken off, then everything that is not a letter a space.
CREATE OR REPLACE FUNCTION public.person_name_key(p_first text, p_surname text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $fn$
  SELECT btrim(regexp_replace(
    regexp_replace(
      normalize(lower(translate(
        coalesce(p_first, '') || ' ' || coalesce(p_surname, ''),
        'ÀÁÂÃÄÅĀĂĄàáâãäåāăąÇĆČçćčĎĐďđÈÉÊËĒĖĘĚèéêëēėęěÌÍÎÏĪĮİìíîïīįıŁĹĽłĺľÑŃŇñńňÒÓÔÕÖØŌŐòóôõöøōőŔŘŕřŚŠŞśšşŤŢťţÙÚÛÜŪŮŰŲùúûüūůűųÝŸýÿŹŻŽźżžßÆæŒœ',
        'AAAAAAAAAaaaaaaaaaCCCcccDDddEEEEEEEEeeeeeeeeIIIIIIIiiiiiiiLLLlllNNNnnnOOOOOOOOooooooooRRrrSSSsssTTttUUUUUUUUuuuuuuuuYYyyZZZzzzsAaOo'
      )), NFKD),
      '[' || chr(768) || '-' || chr(879) || ']', '', 'g'),
    '[^a-z]+', ' ', 'g'))
$fn$;

-- The attendance key: as before, and the letters that have no accent to
-- drop are written in plain letters first.
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
  FOR i IN 1..3 LOOP
    tag := substring(s FROM '\s*\([^()]{1,40}\)\s*$');
    EXIT WHEN tag IS NULL OR length(tag) >= length(s);
    s := btrim(left(s, length(s) - length(tag)));
  END LOOP;
  s := lower(regexp_replace(normalize(s, NFKD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g'));
  s := replace(replace(replace(replace(translate(s, 'ıłđøð', 'ildod'), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'þ', 'th');
  s := regexp_replace(s, '[^a-z0-9\s]', ' ', 'g');
  RETURN coalesce(
    (SELECT string_agg(w, ' ' ORDER BY w COLLATE "C")
       FROM regexp_split_to_table(s, '\s+') AS w
      WHERE w <> ''),
    '');
END;
$fn$;

-- Every stored key, worked out again (the guard trigger writes it); the
-- rows whose key changes are copied first.
INSERT INTO public.data_backup (source, row_id, reason, row_data)
SELECT 'people', p.id::text, 'step108_name_keys', to_jsonb(p)
  FROM public.people p
 WHERE p.name_key IS DISTINCT FROM public.person_name_key(p.first_name, p.surname)
ON CONFLICT (source, row_id, reason) DO NOTHING;

UPDATE public.people
   SET name_key = public.person_name_key(first_name, surname)
 WHERE name_key IS DISTINCT FROM public.person_name_key(first_name, surname);

-- 2. AN EVENT'S GUEST CAN BE A PERSON WE KNOW ------------------------------

-- person_link: 'confirmed' (a person said this guest is that person) or
-- 'none' (a person said they are not; not asked again).
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS person_link text,
  ADD COLUMN IF NOT EXISTS person_linked_by uuid,
  ADD COLUMN IF NOT EXISTS person_linked_at timestamptz;
DO $c$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_person_link_check') THEN
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT event_registrations_person_link_check CHECK (person_link IS NULL OR person_link IN ('confirmed', 'none'));
  END IF;
END $c$;
CREATE INDEX IF NOT EXISTS event_registrations_person_idx ON public.event_registrations (person_id) WHERE person_id IS NOT NULL;

-- The answers the President and the Vice-President give.
CREATE TABLE IF NOT EXISTS public.people_match_decisions (
  person_a   uuid        NOT NULL,
  person_b   uuid        NOT NULL,
  decision   text        NOT NULL CHECK (decision IN ('same', 'different')),
  decided_by uuid,
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_a, person_b),
  CHECK (person_a < person_b)
);
ALTER TABLE public.people_match_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.people_match_decisions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.people_match_decisions TO service_role;

-- 3. ONE PERSON ABSORBS ANOTHER ----------------------------------------------

CREATE OR REPLACE FUNCTION public.people_join(p_keep uuid, p_merge uuid, p_reason text, p_first text DEFAULT NULL, p_surname text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  k public.people;
  m public.people;
  v_reason text := left(coalesce(nullif(btrim(p_reason), ''), 'join'), 60);
BEGIN
  IF p_keep IS NULL OR p_merge IS NULL OR p_keep = p_merge THEN RETURN false; END IF;
  SELECT * INTO k FROM public.people WHERE id = p_keep FOR UPDATE;
  SELECT * INTO m FROM public.people WHERE id = p_merge FOR UPDATE;
  IF k.id IS NULL OR m.id IS NULL THEN RETURN false; END IF;

  -- Copies first: the person absorbed, and everything of theirs.
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'people', x.id::text, v_reason, to_jsonb(x) FROM public.people x WHERE x.id IN (p_keep, p_merge)
  ON CONFLICT (source, row_id, reason) DO NOTHING;
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'person_records', r.record_type || ':' || r.record_id, v_reason, to_jsonb(r) FROM public.person_records r WHERE r.person_id = p_merge
  ON CONFLICT (source, row_id, reason) DO NOTHING;
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'roster_entries', e.id::text, v_reason, to_jsonb(e) FROM public.roster_entries e WHERE e.person_id = p_merge
  ON CONFLICT (source, row_id, reason) DO NOTHING;
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'alumni_pending', a.id::text, v_reason, to_jsonb(a) FROM public.alumni_pending a WHERE a.person_id = p_merge
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  INSERT INTO public.people_merge_log (merged_person_id, merged_code, first_name, surname, into_person_id, records)
  VALUES (m.id, m.code, m.first_name, m.surname, k.id,
          coalesce((SELECT jsonb_agg(jsonb_build_object('type', x.record_type, 'id', x.record_id)) FROM public.person_records x WHERE x.person_id = m.id), '[]'::jsonb));

  UPDATE public.person_records SET person_id = k.id WHERE person_id = m.id;

  -- A semester both hold for the same role is one row: the team of the
  -- absorbed one is kept where the other had none.
  UPDATE public.roster_entries t SET team = s.team, updated_at = now()
    FROM public.roster_entries s
   WHERE s.person_id = m.id AND t.person_id = k.id AND t.semester_key = s.semester_key
     AND t.role_label = s.role_label AND t.division_key = s.division_key AND t.team IS NULL AND s.team IS NOT NULL;
  DELETE FROM public.roster_entries s
    USING public.roster_entries t
   WHERE s.person_id = m.id AND t.person_id = k.id AND t.semester_key = s.semester_key
     AND t.role_label = s.role_label AND t.division_key = s.division_key;
  UPDATE public.roster_entries SET person_id = k.id, updated_at = now() WHERE person_id = m.id;

  IF EXISTS (SELECT 1 FROM public.alumni_pending WHERE person_id = k.id) THEN
    DELETE FROM public.alumni_pending WHERE person_id = m.id;
  ELSE
    UPDATE public.alumni_pending SET person_id = k.id WHERE person_id = m.id;
  END IF;

  UPDATE public.event_registrations SET person_id = k.id WHERE person_id = m.id;
  DELETE FROM public.people_match_decisions WHERE person_a = m.id OR person_b = m.id;

  -- Hidden from the website if either was (the reader's choice is kept),
  -- under the name chosen, if one was.
  UPDATE public.people
     SET public_hidden = k.public_hidden OR m.public_hidden,
         first_name = coalesce(nullif(btrim(p_first), ''), first_name),
         surname = coalesce(nullif(btrim(p_surname), ''), surname)
    WHERE id = k.id;

  DELETE FROM public.people WHERE id = m.id;
  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.people_join(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.people_join(uuid, uuid, text, text, text) TO service_role;

-- 4. THE SAFE JOINS, NOW ------------------------------------------------------
-- The same name once folded, exactly two people carrying it, and not two
-- records of the same kind. The one with the roster history stays (else
-- the older); the spelling with its accents is kept.
DO $step108_people$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    WITH info AS (
      SELECT p.id, p.name_key, p.created_at, p.first_name, p.surname,
             coalesce((SELECT array_agg(DISTINCT x.record_type) FROM public.person_records x WHERE x.person_id = p.id), '{}'::text[]) AS types,
             (SELECT count(*) FROM public.roster_entries e WHERE e.person_id = p.id) AS semesters,
             length(p.first_name || p.surname) - length(regexp_replace(p.first_name || p.surname, '[^A-Za-z '' .-]', '', 'g')) AS accents
        FROM public.people p
       WHERE p.name_key ~ ' '
    ), twins AS (
      SELECT name_key FROM info GROUP BY name_key HAVING count(*) = 2
    ), pair AS (
      SELECT a.*, b.id AS b_id, b.created_at AS b_created, b.types AS b_types, b.semesters AS b_semesters,
             b.first_name AS b_first, b.surname AS b_surname, b.accents AS b_accents
        FROM info a JOIN info b ON a.name_key = b.name_key AND a.id < b.id
       WHERE a.name_key IN (SELECT name_key FROM twins) AND NOT (a.types && b.types)
    )
    SELECT CASE WHEN semesters > b_semesters OR (semesters = b_semesters AND created_at <= b_created) THEN id ELSE b_id END AS keep_id,
           CASE WHEN semesters > b_semesters OR (semesters = b_semesters AND created_at <= b_created) THEN b_id ELSE id END AS merge_id,
           CASE WHEN accents >= b_accents THEN first_name ELSE b_first END AS first_name,
           CASE WHEN accents >= b_accents THEN surname ELSE b_surname END AS surname
      FROM pair
  LOOP
    IF public.people_join(r.keep_id, r.merge_id, 'step108_same_name', r.first_name, r.surname) THEN
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Step 108: % people with the same name joined into one.', n;
END
$step108_people$;

-- 5. THE PAIRS THAT ARE ASKED -----------------------------------------------
-- A middle name more or less ("Matteo Persico", "Matteo Luigi Persico"),
-- or the same words in another order; never two records of one kind, and
-- never a pair already answered. With what helps decide: the records,
-- the semesters and the last role of each.
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
         OR (b.tok @> a.tok AND cardinality(a.tok) = cardinality(b.tok) + 1))
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

-- 6. WHO A GUEST MAY BE ---------------------------------------------------------
-- For a name typed at the door or read from a Teams report: the people
-- who are not current members (a member is found on the register) and
-- whose name has the same words, or the same words and a middle name.
-- At most three, the exact ones first.
CREATE OR REPLACE FUNCTION public.guest_person_candidates(p_name text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  -- The trailing tags of a Teams name ("(Guest)", "(Unverified)") are
  -- dropped first, as the attendance key drops them.
  WITH q AS (SELECT public.person_tokens(public.person_name_key(p_name)) AS tok),
  hits AS (
    SELECT p.id, p.first_name || ' ' || p.surname AS name,
           (public.person_tokens(p.first_name || ' ' || p.surname) = q.tok) AS exact,
           (SELECT a.graduation_year FROM public.person_records r JOIN public.alumni a ON a.id = r.record_id
             WHERE r.person_id = p.id AND r.record_type = 'alumni' LIMIT 1) AS class_of,
           EXISTS (SELECT 1 FROM public.person_records r WHERE r.person_id = p.id AND r.record_type = 'alumni') AS alumnus,
           (SELECT e.semester_key FROM public.roster_entries e WHERE e.person_id = p.id ORDER BY public.semester_ordinal(e.semester_key) DESC LIMIT 1) AS last_semester
      FROM public.people p, q
     WHERE cardinality(q.tok) >= 2
       AND (public.person_tokens(p.first_name || ' ' || p.surname) = q.tok
         OR (public.person_tokens(p.first_name || ' ' || p.surname) @> q.tok AND cardinality(public.person_tokens(p.first_name || ' ' || p.surname)) = cardinality(q.tok) + 1)
         OR (q.tok @> public.person_tokens(p.first_name || ' ' || p.surname) AND cardinality(public.person_tokens(p.first_name || ' ' || p.surname)) + 1 = cardinality(q.tok)))
       AND NOT EXISTS (
         SELECT 1 FROM public.person_records r JOIN public.members m ON m.id = r.record_id
           WHERE r.person_id = p.id AND r.record_type = 'member' AND m.membership_status IN ('active', 'on_exchange', 'one_semester_pause'))
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'name', name, 'exact', exact, 'alumnus', alumnus, 'class_of', class_of,
           'last_semester', CASE WHEN last_semester IS NULL THEN NULL ELSE public.semester_label(last_semester) END
         ) ORDER BY exact DESC, name), '[]'::jsonb)
    FROM (SELECT * FROM hits ORDER BY exact DESC, name LIMIT 3) h;
$fn$;

REVOKE ALL ON FUNCTION public.guest_person_candidates(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_person_candidates(text) TO service_role;

-- The guests of one event who may be a person we know: rows that are not
-- a member's, not yet answered, whose name has exactly one candidate
-- with the same words. Read once for the whole list.
CREATE OR REPLACE FUNCTION public.event_guest_person_suggestions(p_event uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  WITH g AS (
    SELECT r.id, r.name
      FROM public.event_registrations r
      LEFT JOIN public.event_registration_members w ON w.registration_id = r.id
     WHERE r.event_id = p_event AND r.person_id IS NULL AND r.person_link IS NULL
       AND coalesce(w.member_id, r.member_id) IS NULL AND coalesce(r.is_member, false) = false
       AND btrim(coalesce(r.name, '')) <> ''
  ), c AS (
    SELECT g.id AS registration_id,
           (SELECT jsonb_agg(x) FROM jsonb_array_elements(public.guest_person_candidates(g.name)) x WHERE (x->>'exact')::boolean) AS exact
      FROM g
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('registration_id', registration_id, 'person', exact->0)), '[]'::jsonb)
    FROM c WHERE jsonb_array_length(coalesce(exact, '[]'::jsonb)) = 1;
$fn$;

REVOKE ALL ON FUNCTION public.event_guest_person_suggestions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_guest_person_suggestions(uuid) TO service_role;