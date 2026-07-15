-- ─────────────────────────────────────────────────────────────────────
-- 1. SILENT ADVISOR removal (data first, then constraints and functions)
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.members
   SET role = 'advisor',
       membership_status = 'active',
       division = 'none',
       is_public = false
 WHERE role = 'silent_advisor' OR membership_status = 'silent_advisor';

UPDATE public.user_roles SET role = 'advisor', division = NULL WHERE role = 'silent_advisor';

ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_membership_status_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_membership_status_check
  CHECK (membership_status IN ('active','on_exchange','one_semester_pause','alumni','expelled'));

CREATE OR REPLACE FUNCTION public.project_member_to_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_publishable boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.team_members WHERE member_id = OLD.id;
    RETURN OLD;
  END IF;

  _is_publishable := NEW.is_public
    AND NEW.membership_status IN ('active','on_exchange','one_semester_pause')
    AND NEW.role NOT IN ('admin','candidate','pending','member','alumni');

  IF NOT _is_publishable THEN
    DELETE FROM public.team_members WHERE member_id = NEW.id;
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE member_id = NEW.id) THEN
    UPDATE public.team_members SET
      name          = NEW.first_name,
      surname       = NEW.surname,
      position      = public.role_to_team_position(NEW.role, NEW.division),
      division      = public.division_to_team_division(NEW.division),
      photo_url     = NEW.photo_url,
      linkedin_url  = NEW.linkedin_url,
      is_board      = (public.member_rank(NEW.role, NEW.division) <= 6),
      display_order = public.member_rank(NEW.role, NEW.division)
    WHERE member_id = NEW.id;
  ELSE
    INSERT INTO public.team_members
      (member_id, name, surname, position, division, photo_url, linkedin_url, is_board, display_order)
    VALUES
      (NEW.id, NEW.first_name, NEW.surname,
       public.role_to_team_position(NEW.role, NEW.division),
       public.division_to_team_division(NEW.division),
       NEW.photo_url, NEW.linkedin_url,
       (public.member_rank(NEW.role, NEW.division) <= 6),
       public.member_rank(NEW.role, NEW.division));
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.members SET updated_at = now() WHERE role = 'advisor';


-- ─────────────────────────────────────────────────────────────────────
-- 2. SINGLE SOURCE OF TRUTH: user_roles mirrors the member profile
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.roster_access_pair(
  p_role public.app_role,
  p_division public.org_division,
  OUT o_role public.app_role,
  OUT o_division public.org_division
)
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  o_role := p_role;
  o_division := p_division;
  IF o_role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant') THEN
    o_division := replace(o_role::text, 'head_of_', '')::public.org_division;
    o_role := 'head_of_division';
  END IF;
  IF o_role = 'silent_advisor' THEN o_role := 'advisor'; END IF;
  IF o_role = 'portfolio_manager'                THEN o_division := 'portfolio';  END IF;
  IF o_role IN ('head_of_media','media_analyst') THEN o_division := 'media';      END IF;
  IF o_role = 'head_of_operations'               THEN o_division := 'operations'; END IF;
  IF o_role IN ('president','vice_president','head_of_asset_management','advisor','alumni','member') THEN
    o_division := NULL;
  END IF;
  IF o_division IN ('board','none') THEN o_division := NULL; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.roster_access_pair(public.app_role, public.org_division) FROM anon, PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_member_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid     uuid;
  v_role    public.app_role;
  v_div     public.org_division;
  v_current public.app_role;
  v_keep_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_uid := OLD.user_id;
    IF v_uid IS NULL THEN RETURN OLD; END IF;
    SELECT role INTO v_current FROM public.user_roles WHERE user_id = v_uid LIMIT 1;
    IF v_current IS NULL OR v_current IN ('admin','candidate') THEN RETURN OLD; END IF;
    UPDATE public.user_roles SET role = 'alumni', division = NULL, assigned_at = now()
     WHERE user_id = v_uid;
    RETURN OLD;
  END IF;

  v_uid := NEW.user_id;
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  SELECT role INTO v_current FROM public.user_roles WHERE user_id = v_uid LIMIT 1;
  IF v_current IN ('admin','candidate') THEN RETURN NEW; END IF;

  IF NEW.membership_status = 'expelled' THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    RETURN NEW;
  END IF;

  IF NEW.role IN ('admin','candidate','pending') THEN RETURN NEW; END IF;

  SELECT o_role, o_division INTO v_role, v_div FROM public.roster_access_pair(NEW.role, NEW.division);

  SELECT id INTO v_keep_id FROM public.user_roles WHERE user_id = v_uid ORDER BY assigned_at LIMIT 1;
  IF v_keep_id IS NULL THEN
    INSERT INTO public.user_roles (user_id, role, division, assigned_at)
    VALUES (v_uid, v_role, v_div, now());
  ELSE
    UPDATE public.user_roles SET role = v_role, division = v_div, assigned_at = now()
     WHERE id = v_keep_id AND (role IS DISTINCT FROM v_role OR division IS DISTINCT FROM v_div);
    DELETE FROM public.user_roles WHERE user_id = v_uid AND id <> v_keep_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_member_access() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS sync_member_access_trg ON public.members;
CREATE TRIGGER sync_member_access_trg
  AFTER INSERT OR UPDATE OF role, division, user_id, membership_status OR DELETE
  ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_access();

UPDATE public.members SET updated_at = now()
 WHERE user_id IS NOT NULL AND membership_status <> 'expelled';

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

  SELECT o_role, o_division INTO v_role, v_div FROM public.roster_access_pair(v_claimed.role, v_claimed.division);

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