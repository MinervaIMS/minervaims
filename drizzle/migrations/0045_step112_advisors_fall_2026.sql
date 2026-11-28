-- =====================================================================
-- STEP 112: Ianina Tarca and Volodymyr Pavliv are advisors in Fall 2026.
-- ---------------------------------------------------------------------
-- They were recorded in this semester's register as heads (of
-- Quantitative Research and of Investment Research). They are advisors:
-- they help with specific activities and are not active members or heads.
-- The President asked for the correction in this semester only:
--
--   members                 the live register (People > Members, the
--                           current semester everywhere): role 'advisor',
--                           no division, as every advisor has; workspace
--                           access follows by the existing trigger
--   semester_members        the register a Fall 2026 fee collection froze,
--                           if there is one, which becomes the semester's
--                           record in the Time Machine
--   membership_certificates a certificate issued for Fall 2026 with a head's
--                           role (none is revoked or reissued: only the
--                           role it records is set right)
--
-- THE FEE STAYS AS TRACKED. An advisor is normally outside the fee: making
-- someone an advisor marks them exempt and removes their unpaid row of an
-- open collection. The President asked to keep both people's fee as it
-- is, so those two triggers are switched off for this one change and on
-- again straight after. Their alumni entries are not touched, and no past
-- semester is.
--
-- Every row is copied, as it was, into `role_fix_backup_step112` before it
-- changes. Safe to run twice: a second run finds nothing left to change
-- (they are advisors already), and the backup keeps the first copy.
-- It sends no email.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.role_fix_backup_step112 (
  source_table text NOT NULL,
  row_id uuid NOT NULL,
  before jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, row_id)
);
ALTER TABLE public.role_fix_backup_step112 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.role_fix_backup_step112 FROM anon, authenticated;

DO $$
DECLARE
  v_keys text[] := ARRAY[
    public.person_name_key('Ianina', 'Tarca'), public.person_name_key('Janina', 'Tarka'),
    public.person_name_key('Volodymyr', 'Pavliv')];
  v_now text := public.current_semester_key();
  v_ids uuid[];
BEGIN
  -- This semester's register: the two, still recorded with another role.
  SELECT coalesce(array_agg(m.id), '{}') INTO v_ids
    FROM public.members m
   WHERE public.person_name_key(m.first_name, m.surname) = ANY (v_keys)
     AND m.role::text NOT IN ('advisor', 'silent_advisor', 'admin', 'candidate', 'pending', 'alumni')
     AND m.membership_status IN ('active', 'on_exchange', 'one_semester_pause');

  IF cardinality(v_ids) > 0 THEN
    INSERT INTO public.role_fix_backup_step112 (source_table, row_id, before)
    SELECT 'members', m.id, to_jsonb(m) FROM public.members m WHERE m.id = ANY (v_ids)
    ON CONFLICT (source_table, row_id) DO NOTHING;

    INSERT INTO public.role_fix_backup_step112 (source_table, row_id, before)
    SELECT 'user_roles', ur.id, to_jsonb(ur)
      FROM public.user_roles ur JOIN public.members m ON m.user_id = ur.user_id
     WHERE m.id = ANY (v_ids)
    ON CONFLICT (source_table, row_id) DO NOTHING;

    -- The fee as tracked: the two fee triggers are off for this change only.
    ALTER TABLE public.members DISABLE TRIGGER members_fee_status_follows_role;
    ALTER TABLE public.members DISABLE TRIGGER members_leave_open_fee_when_exempt;
    UPDATE public.members SET role = 'advisor', division = 'none' WHERE id = ANY (v_ids);
    ALTER TABLE public.members ENABLE TRIGGER members_fee_status_follows_role;
    ALTER TABLE public.members ENABLE TRIGGER members_leave_open_fee_when_exempt;
  END IF;

  -- The register frozen with a Fall 2026 fee collection, if there is one.
  INSERT INTO public.role_fix_backup_step112 (source_table, row_id, before)
  SELECT 'semester_members', sm.id, to_jsonb(sm)
    FROM public.semester_members sm
   WHERE sm.semester_key = v_now
     AND public.person_name_key(sm.first_name, sm.surname) = ANY (v_keys)
     AND coalesce(sm.role, '') NOT IN ('advisor', 'silent_advisor')
  ON CONFLICT (source_table, row_id) DO NOTHING;

  UPDATE public.semester_members sm
     SET role = 'advisor', division = 'none'
   WHERE sm.semester_key = v_now
     AND public.person_name_key(sm.first_name, sm.surname) = ANY (v_keys)
     AND coalesce(sm.role, '') NOT IN ('advisor', 'silent_advisor');

  -- A certificate issued for Fall 2026 with a head's role.
  INSERT INTO public.role_fix_backup_step112 (source_table, row_id, before)
  SELECT 'membership_certificates', c.id, to_jsonb(c)
    FROM public.membership_certificates c
   WHERE c.semester_key = v_now AND c.role_label ILIKE '%Head of%'
     AND public.person_name_key(split_part(c.holder_name, ' ', 1), regexp_replace(c.holder_name, '^\S+\s+', '')) = ANY (v_keys)
  ON CONFLICT (source_table, row_id) DO NOTHING;

  UPDATE public.membership_certificates c
     SET role_label = 'Advisor'
   WHERE c.semester_key = v_now AND c.role_label ILIKE '%Head of%'
     AND public.person_name_key(split_part(c.holder_name, ' ', 1), regexp_replace(c.holder_name, '^\S+\s+', '')) = ANY (v_keys);
END $$;
