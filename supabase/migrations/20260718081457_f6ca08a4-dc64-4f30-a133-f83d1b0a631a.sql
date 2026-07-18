-- STEP 12b — ROLE SYNC REPAIR
DROP TRIGGER IF EXISTS sync_member_access_trg ON public.members;
CREATE TRIGGER sync_member_access_trg
  AFTER INSERT OR UPDATE OR DELETE
  ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_access();

ALTER TABLE public.members DISABLE TRIGGER sync_member_access_trg;

DO $$
DECLARE
  g record;
  v_keeper uuid;
  v_role   public.app_role;
  v_div    public.org_division;
BEGIN
  FOR g IN
    SELECT user_id FROM public.members
    WHERE user_id IS NOT NULL
    GROUP BY user_id HAVING count(*) > 1
  LOOP
    SELECT id INTO v_keeper FROM public.members
     WHERE user_id = g.user_id ORDER BY created_at ASC LIMIT 1;
    SELECT role, division INTO v_role, v_div FROM public.members
     WHERE user_id = g.user_id ORDER BY updated_at DESC LIMIT 1;
    DELETE FROM public.members WHERE user_id = g.user_id AND id <> v_keeper;
    UPDATE public.members SET role = v_role, division = v_div WHERE id = v_keeper;
  END LOOP;
END $$;

DO $$
DECLARE
  g record;
  v_keeper uuid;
  v_uid    uuid;
  v_role   public.app_role;
  v_div    public.org_division;
BEGIN
  FOR g IN
    SELECT lower(email) AS em FROM public.members
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email) HAVING count(*) > 1
  LOOP
    SELECT id INTO v_keeper FROM public.members
     WHERE lower(email) = g.em
     ORDER BY (user_id IS NULL) ASC, created_at ASC LIMIT 1;
    SELECT user_id INTO v_uid FROM public.members
     WHERE lower(email) = g.em AND user_id IS NOT NULL LIMIT 1;
    SELECT role, division INTO v_role, v_div FROM public.members
     WHERE lower(email) = g.em ORDER BY updated_at DESC LIMIT 1;
    DELETE FROM public.members WHERE lower(email) = g.em AND id <> v_keeper;
    UPDATE public.members
       SET role = v_role, division = v_div,
           user_id = COALESCE(user_id, v_uid)
     WHERE id = v_keeper;
  END LOOP;
END $$;

UPDATE public.members m
   SET user_id = u.id
  FROM auth.users u
 WHERE m.user_id IS NULL
   AND m.email IS NOT NULL AND m.email <> ''
   AND lower(u.email) = lower(m.email)
   AND u.email_confirmed_at IS NOT NULL
   AND lower(m.email) <> 'as.minerva@unibocconi.it'
   AND NOT EXISTS (SELECT 1 FROM public.members m2 WHERE m2.user_id = u.id);

ALTER TABLE public.members ENABLE TRIGGER sync_member_access_trg;

UPDATE public.members SET role = role
 WHERE user_id IS NOT NULL AND membership_status <> 'expelled';

CREATE UNIQUE INDEX IF NOT EXISTS members_one_row_per_account
  ON public.members (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS members_one_row_per_email
  ON public.members (lower(email)) WHERE email IS NOT NULL AND email <> '';