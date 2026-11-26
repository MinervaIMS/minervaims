-- =====================================================================
-- STEP 110: Spring 2026 had no Head of Media & Communication.
-- ---------------------------------------------------------------------
-- Elena Michetti was recorded as Head of Media & Communication in Spring
-- 2026; she was a Media & Communication Analyst (the role's one name in
-- the rosters, `roster_role_label('media_analyst')`). The President asked
-- for the correction everywhere the workspace keeps that semester's role:
--
--   roster_entries          the semester's roster: the Time Machine, the
--                           public Past Boards, the person's record, My
--                           Profile > Membership and the certificate path
--   semester_members        the official register the Spring 2026 fee
--                           collection froze (role key `head_of_media`)
--   membership_certificates a certificate issued for Spring 2026 that
--                           printed the wrong role (none is revoked or
--                           reissued: only the role it records is set
--                           right, so a check of its code shows the truth)
--
-- Only rows of that person, that semester and that role are touched. Each
-- is copied, as it was, into `role_fix_backup_step110` before it changes,
-- and the roster row is marked as a correction (`source = 'edit'`), as a
-- correction made in People > Time Machine is. The current semester (the
-- live register, People > Members) is not touched.
--
-- Safe to run twice: a second run finds nothing left to change, and the
-- backup keeps the first copy of each row.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.role_fix_backup_step110 (
  source_table text NOT NULL,
  row_id uuid NOT NULL,
  before jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, row_id)
);
ALTER TABLE public.role_fix_backup_step110 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.role_fix_backup_step110 FROM anon, authenticated;

DO $$
DECLARE v_key text := public.person_name_key('Elena', 'Michetti');
BEGIN
  -- The roster.
  INSERT INTO public.role_fix_backup_step110 (source_table, row_id, before)
  SELECT 'roster_entries', e.id, to_jsonb(e)
  FROM public.roster_entries e JOIN public.people p ON p.id = e.person_id
  WHERE p.name_key = v_key AND e.semester_key = '2026-spring' AND e.role_label = 'Head of Media & Communication'
  ON CONFLICT (source_table, row_id) DO NOTHING;

  UPDATE public.roster_entries e
  SET role_label = 'Media & Communication Analyst', division_key = 'media', source = 'edit', updated_at = now()
  FROM public.people p
  WHERE p.id = e.person_id AND p.name_key = v_key
    AND e.semester_key = '2026-spring' AND e.role_label = 'Head of Media & Communication';

  -- The official register frozen with the Spring 2026 fee collection.
  INSERT INTO public.role_fix_backup_step110 (source_table, row_id, before)
  SELECT 'semester_members', sm.id, to_jsonb(sm)
  FROM public.semester_members sm
  WHERE sm.semester_key = '2026-spring' AND sm.role = 'head_of_media'
    AND public.person_name_key(sm.first_name, sm.surname) = v_key
  ON CONFLICT (source_table, row_id) DO NOTHING;

  UPDATE public.semester_members sm
  SET role = 'media_analyst', division = 'media'
  WHERE sm.semester_key = '2026-spring' AND sm.role = 'head_of_media'
    AND public.person_name_key(sm.first_name, sm.surname) = v_key;

  -- A certificate issued for Spring 2026 with that role.
  INSERT INTO public.role_fix_backup_step110 (source_table, row_id, before)
  SELECT 'membership_certificates', c.id, to_jsonb(c)
  FROM public.membership_certificates c
  WHERE c.semester_key = '2026-spring' AND c.role_label = 'Head of Media & Communication'
    AND public.person_name_key(split_part(c.holder_name, ' ', 1), regexp_replace(c.holder_name, '^\S+\s+', '')) = v_key
  ON CONFLICT (source_table, row_id) DO NOTHING;

  UPDATE public.membership_certificates c
  SET role_label = 'Media & Communication Analyst'
  WHERE c.semester_key = '2026-spring' AND c.role_label = 'Head of Media & Communication'
    AND public.person_name_key(split_part(c.holder_name, ' ', 1), regexp_replace(c.holder_name, '^\S+\s+', '')) = v_key;
END $$;
