-- 1. ACCOUNT REDEEM
CREATE OR REPLACE FUNCTION public.link_member_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email     text;
  v_confirmed timestamptz;
  v_member    public.members%ROWTYPE;
  v_claimed   public.members%ROWTYPE;
  v_role      public.app_role;
  v_div       public.org_division;
  v_ur_role   public.app_role;
BEGIN
  SELECT email, email_confirmed_at INTO v_email, v_confirmed
  FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('status', 'no_user');
  END IF;
  IF v_confirmed IS NULL THEN
    RETURN jsonb_build_object('status', 'email_unconfirmed');
  END IF;

  SELECT * INTO v_member FROM public.members WHERE user_id = p_user_id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'already_linked', 'member_id', v_member.id);
  END IF;

  SELECT * INTO v_member FROM public.members
  WHERE user_id IS NULL AND email IS NOT NULL AND lower(email) = lower(v_email)
  ORDER BY created_at ASC
  LIMIT 1;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.members WHERE lower(email) = lower(v_email) AND user_id IS NOT NULL) THEN
      RETURN jsonb_build_object('status', 'email_in_use');
    END IF;
    RETURN jsonb_build_object('status', 'no_match');
  END IF;

  UPDATE public.members
     SET user_id = p_user_id, account_status = 'approved'
   WHERE id = v_member.id AND user_id IS NULL
   RETURNING * INTO v_claimed;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'email_in_use');
  END IF;

  v_role := v_claimed.role;
  v_div  := v_claimed.division;
  IF v_role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant') THEN
    v_div  := replace(v_role::text, 'head_of_', '')::public.org_division;
    v_role := 'head_of_division';
  END IF;
  IF v_role = 'portfolio_manager'                THEN v_div := 'portfolio';  END IF;
  IF v_role IN ('head_of_media','media_analyst') THEN v_div := 'media';      END IF;
  IF v_role = 'head_of_operations'               THEN v_div := 'operations'; END IF;
  IF v_div IN ('board','none')                   THEN v_div := NULL;         END IF;

  IF v_role NOT IN ('member','pending','candidate','admin') THEN
    SELECT role INTO v_ur_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
    IF v_ur_role IS NULL THEN
      INSERT INTO public.user_roles (user_id, role, division, assigned_at)
      VALUES (p_user_id, v_role, v_div, now());
    ELSIF v_ur_role IN ('member','pending') THEN
      UPDATE public.user_roles
         SET role = v_role, division = v_div, assigned_at = now()
       WHERE user_id = p_user_id;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.activity_logs
      (user_id, user_email, user_role, action, entity_type, entity_id, entity_name, section, subsection, details)
    VALUES
      (p_user_id, v_email, v_role::text, 'update', 'member', v_claimed.id,
       v_claimed.first_name || ' ' || v_claimed.surname, 'People', 'Members',
       jsonb_build_object('event', 'account_redeemed', 'role', v_role, 'division', v_div));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('status', 'linked', 'member_id', v_claimed.id, 'role', v_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_member_account(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_member_account(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_member_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('status', 'no_user');
  END IF;
  RETURN public.link_member_account(auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_member_account() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_member_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    BEGIN
      PERFORM public.link_member_account(NEW.id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_email_confirmed() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();

DROP TRIGGER IF EXISTS on_auth_user_created_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_created_confirmed
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();


-- 2. ACTIVITY LOG
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;

DROP POLICY IF EXISTS activity_logs_staff_read ON public.activity_logs;
CREATE POLICY activity_logs_staff_read ON public.activity_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS activity_logs_self_insert ON public.activity_logs;
CREATE POLICY activity_logs_self_insert ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action      text,
  p_entity_type text,
  p_entity_name text DEFAULT NULL,
  p_section     text DEFAULT NULL,
  p_subsection  text DEFAULT NULL,
  p_entity_id   text DEFAULT NULL,
  p_details     jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_role  text;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT role::text INTO v_role
    FROM public.user_roles
   WHERE user_id = v_uid
   ORDER BY public.member_rank(role, COALESCE(division, 'none')) ASC
   LIMIT 1;
  INSERT INTO public.activity_logs
    (user_id, user_email, user_role, action, entity_type, entity_id, entity_name, section, subsection, details)
  VALUES
    (v_uid, COALESCE(v_email, ''), COALESCE(v_role, 'member'),
     COALESCE(NULLIF(trim(p_action), ''), 'update'),
     COALESCE(NULLIF(trim(p_entity_type), ''), 'item'),
     CASE WHEN p_entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN p_entity_id::uuid ELSE NULL END,
     p_entity_name, p_section, p_subsection, p_details);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, text, text, text, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.trim_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row_count INTEGER;
  rows_to_delete INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.activity_logs;
  IF row_count > 5000 THEN
    rows_to_delete := row_count - 5000;
    DELETE FROM public.activity_logs
    WHERE id IN (
      SELECT id FROM public.activity_logs
      ORDER BY created_at ASC
      LIMIT rows_to_delete
    );
  END IF;
  RETURN NEW;
END;
$$;


-- 3. PUBLIC PROJECTION
CREATE OR REPLACE FUNCTION public.role_to_team_position(_role public.app_role, _division public.org_division)
RETURNS public.team_position
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _role = 'president'                THEN 'President'
    WHEN _role = 'vice_president'           THEN 'Vice President'
    WHEN _role = 'head_of_asset_management' THEN 'Head of Asset Management'
    WHEN _role = 'head_of_division' AND _division = 'equity'     THEN 'Head of Equity Research'
    WHEN _role = 'head_of_division' AND _division = 'investment' THEN 'Head of Investment Research'
    WHEN _role = 'head_of_division' AND _division = 'macro'      THEN 'Head of Macro Research'
    WHEN _role = 'head_of_division' AND _division = 'portfolio'  THEN 'Head of Portfolio Management'
    WHEN _role = 'head_of_division' AND _division = 'quant'      THEN 'Head of Quantitative Research'
    WHEN _role = 'portfolio_manager'        THEN 'Portfolio Manager'
    WHEN _role = 'team_leader'              THEN 'Senior Analyst'
    WHEN _role = 'senior_analyst'           THEN 'Senior Analyst'
    WHEN _role = 'head_of_operations'       THEN 'Head of Operations'
    WHEN _role = 'head_of_media'            THEN 'Head of Media'
    WHEN _role = 'media_analyst'            THEN 'Media'
    WHEN _role = 'advisor'                  THEN 'Advisor'
    ELSE 'Analyst'
  END::public.team_position
$$;

CREATE OR REPLACE FUNCTION public.member_rank(_role public.app_role, _division public.org_division)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _role = 'president'                THEN 1
    WHEN _role = 'vice_president'           THEN 2
    WHEN _role = 'head_of_asset_management' THEN 3
    WHEN _role = 'head_of_division'         THEN 4
    WHEN _role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant') THEN 4
    WHEN _role = 'head_of_media'            THEN 5
    WHEN _role = 'head_of_operations'       THEN 6
    WHEN _role = 'portfolio_manager'        THEN 7
    WHEN _role = 'team_leader'              THEN 8
    WHEN _role = 'senior_analyst'           THEN 9
    WHEN _role = 'analyst'                  THEN 10
    WHEN _role = 'media_analyst'            THEN 11
    WHEN _role = 'advisor'                  THEN 12
    ELSE 99
  END
$$;

UPDATE public.members SET updated_at = now()
WHERE role IN ('advisor', 'senior_analyst');


-- 4. CALENDAR
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_sessions_range_check CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_sessions_staff_read ON public.exam_sessions;
CREATE POLICY exam_sessions_staff_read ON public.exam_sessions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS exam_sessions_manager_insert ON public.exam_sessions;
CREATE POLICY exam_sessions_manager_insert ON public.exam_sessions
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_calendar(auth.uid()));

DROP POLICY IF EXISTS exam_sessions_manager_update ON public.exam_sessions;
CREATE POLICY exam_sessions_manager_update ON public.exam_sessions
  FOR UPDATE TO authenticated
  USING (public.can_manage_calendar(auth.uid()))
  WITH CHECK (public.can_manage_calendar(auth.uid()));

DROP POLICY IF EXISTS exam_sessions_manager_delete ON public.exam_sessions;
CREATE POLICY exam_sessions_manager_delete ON public.exam_sessions
  FOR DELETE TO authenticated USING (public.can_manage_calendar(auth.uid()));

CREATE OR REPLACE FUNCTION public.exam_break_on(_d date)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT label FROM public.exam_sessions
  WHERE _d BETWEEN start_date AND end_date
  ORDER BY start_date LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.exam_break_on(date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.exam_break_on(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.block_exam_break()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date  date;
  v_label text;
BEGIN
  v_date := CASE TG_TABLE_NAME
    WHEN 'events'           THEN COALESCE(NEW.start_at::date, NEW.date::date)
    WHEN 'interview_slots'  THEN NEW.slot_date::date
    WHEN 'aod_days'         THEN NEW.event_date::date
    WHEN 'alumni_calls'     THEN NEW.planned_date::date
    WHEN 'calendar_entries' THEN CASE WHEN NEW.entry_type IN ('meeting','social') THEN NEW.entry_date::date ELSE NULL END
    ELSE NULL
  END;
  IF v_date IS NULL THEN RETURN NEW; END IF;
  v_label := public.exam_break_on(v_date);
  IF v_label IS NOT NULL THEN
    RAISE EXCEPTION 'This date falls inside the exam session break "%". The calendar does not accept events during exam breaks, so the community can focus on exams and attend when events resume.', v_label
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_exam_break_trg ON public.events;
CREATE TRIGGER block_exam_break_trg
  BEFORE INSERT OR UPDATE OF start_at, date ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

DROP TRIGGER IF EXISTS block_exam_break_trg ON public.interview_slots;
CREATE TRIGGER block_exam_break_trg
  BEFORE INSERT OR UPDATE OF slot_date ON public.interview_slots
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

DROP TRIGGER IF EXISTS block_exam_break_trg ON public.aod_days;
CREATE TRIGGER block_exam_break_trg
  BEFORE INSERT OR UPDATE OF event_date ON public.aod_days
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

DROP TRIGGER IF EXISTS block_exam_break_trg ON public.alumni_calls;
CREATE TRIGGER block_exam_break_trg
  BEFORE INSERT OR UPDATE OF planned_date ON public.alumni_calls
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

DROP TRIGGER IF EXISTS block_exam_break_trg ON public.calendar_entries;
CREATE TRIGGER block_exam_break_trg
  BEFORE INSERT OR UPDATE OF entry_date, entry_type ON public.calendar_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

ALTER TABLE public.calendar_entries DROP CONSTRAINT IF EXISTS calendar_entries_entry_type_check;
ALTER TABLE public.calendar_entries
  ADD CONSTRAINT calendar_entries_entry_type_check
  CHECK (entry_type IN ('meeting','deadline','reminder','social','other','casa_committee'));

CREATE OR REPLACE FUNCTION public.is_board_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (SELECT email FROM auth.users WHERE id = _user_id) = 'as.minerva@unibocconi.it'
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','president','vice_president','head_of_asset_management',
                   'head_of_division','head_of_media','head_of_operations',
                   'head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_board_member(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_board_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "calendar entries readable by staff" ON public.calendar_entries;
CREATE POLICY "calendar entries readable by staff" ON public.calendar_entries
  FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    AND (entry_type <> 'casa_committee' OR public.is_board_member(auth.uid()))
  );


-- 5. ALUMNI: company optional
ALTER TABLE public.alumni ALTER COLUMN company DROP NOT NULL;