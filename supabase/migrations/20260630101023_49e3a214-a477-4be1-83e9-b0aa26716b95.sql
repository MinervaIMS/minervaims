ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS division public.org_division;

UPDATE public.user_roles SET division = CASE
    WHEN role = 'head_of_equity'           THEN 'equity'
    WHEN role = 'head_of_investment'       THEN 'investment'
    WHEN role = 'head_of_macro'            THEN 'macro'
    WHEN role = 'head_of_portfolio'        THEN 'portfolio'
    WHEN role = 'head_of_quant'            THEN 'quant'
    WHEN role = 'portfolio_manager'        THEN 'portfolio'
    WHEN role = 'head_of_media'            THEN 'media'
    WHEN role = 'head_of_operations'       THEN 'operations'
    WHEN role IN ('president','vice_president','admin','head_of_asset_management')
                                           THEN 'board'
    ELSE 'none'
  END::public.org_division
WHERE division IS NULL;

DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.ctid > b.ctid
  AND a.role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant')
  AND b.role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant');

UPDATE public.user_roles
SET role = 'head_of_division'
WHERE role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant');


CREATE TABLE IF NOT EXISTS public.members (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name         text NOT NULL,
  surname            text NOT NULL,
  email              text,
  phone              text,
  photo_url          text,
  linkedin_url       text,
  division           public.org_division NOT NULL DEFAULT 'none',
  role               public.app_role NOT NULL DEFAULT 'member',
  membership_status  text NOT NULL DEFAULT 'active'
                       CHECK (membership_status IN ('active','temporary_leave','alumni','expelled','silent_advisor')),
  account_status     text NOT NULL DEFAULT 'to_redeem'
                       CHECK (account_status IN ('approved','pending','to_redeem')),
  is_public          boolean NOT NULL DEFAULT true,
  display_order      integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_user_id_idx   ON public.members(user_id);
CREATE INDEX IF NOT EXISTS members_division_idx   ON public.members(division);
CREATE INDEX IF NOT EXISTS members_is_public_idx  ON public.members(is_public);

DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS member_id uuid UNIQUE REFERENCES public.members(id) ON DELETE CASCADE;


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
    WHEN _role = 'head_of_operations'       THEN 'Head of Operations'
    WHEN _role = 'head_of_media'            THEN 'Head of Media'
    WHEN _role = 'media_analyst'            THEN 'Media'
    WHEN _role = 'advisor'                  THEN 'Advisor'
    ELSE 'Analyst'
  END::public.team_position
$$;

CREATE OR REPLACE FUNCTION public.division_to_team_division(_division public.org_division)
RETURNS public.team_division
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _division IN ('equity','investment','macro','portfolio','quant','operations')
      THEN _division::text::public.team_division
    ELSE NULL
  END
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
    WHEN _role = 'head_of_media'            THEN 5
    WHEN _role = 'head_of_operations'       THEN 6
    WHEN _role = 'portfolio_manager'        THEN 7
    WHEN _role = 'team_leader'              THEN 8
    WHEN _role = 'analyst'                  THEN 9
    WHEN _role = 'media_analyst'            THEN 10
    WHEN _role = 'advisor'                  THEN 11
    ELSE 99
  END
$$;


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
    AND NEW.membership_status IN ('active','silent_advisor')
    AND NEW.account_status IN ('approved','to_redeem')
    AND NEW.role NOT IN ('admin','candidate','pending','member','alumni','silent_advisor');

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

DROP TRIGGER IF EXISTS project_member_to_team_trg ON public.members;
CREATE TRIGGER project_member_to_team_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.project_member_to_team();


ALTER TABLE public.members DISABLE TRIGGER project_member_to_team_trg;

DO $$
DECLARE
  r       record;
  new_id  uuid;
BEGIN
  FOR r IN SELECT * FROM public.team_members WHERE member_id IS NULL LOOP
    INSERT INTO public.members
      (first_name, surname, photo_url, linkedin_url, division, role,
       is_public, account_status, membership_status, display_order)
    VALUES (
      r.name,
      r.surname,
      r.photo_url,
      r.linkedin_url,
      (CASE r.position
        WHEN 'Head of Equity Research'       THEN 'equity'
        WHEN 'Head of Investment Research'   THEN 'investment'
        WHEN 'Head of Macro Research'        THEN 'macro'
        WHEN 'Head of Portfolio Management'  THEN 'portfolio'
        WHEN 'Head of Quantitative Research' THEN 'quant'
        WHEN 'Portfolio Manager'             THEN 'portfolio'
        WHEN 'Head of Media'                 THEN 'media'
        WHEN 'Media'                         THEN 'media'
        WHEN 'Head of Operations'            THEN 'operations'
        WHEN 'Operations'                    THEN 'operations'
        WHEN 'President'                     THEN 'board'
        WHEN 'Vice President'                THEN 'board'
        WHEN 'Head of Asset Management'      THEN 'board'
        WHEN 'Advisor'                       THEN 'none'
        ELSE COALESCE(r.division::text, 'none')
      END)::public.org_division,
      (CASE r.position
        WHEN 'President'                     THEN 'president'
        WHEN 'Vice President'                THEN 'vice_president'
        WHEN 'Head of Asset Management'      THEN 'head_of_asset_management'
        WHEN 'Head of Equity Research'       THEN 'head_of_division'
        WHEN 'Head of Investment Research'   THEN 'head_of_division'
        WHEN 'Head of Macro Research'        THEN 'head_of_division'
        WHEN 'Head of Portfolio Management'  THEN 'head_of_division'
        WHEN 'Head of Quantitative Research' THEN 'head_of_division'
        WHEN 'Portfolio Manager'             THEN 'portfolio_manager'
        WHEN 'Senior Analyst'                THEN 'team_leader'
        WHEN 'Head of Operations'            THEN 'head_of_operations'
        WHEN 'Head of Media'                 THEN 'head_of_media'
        WHEN 'Media'                         THEN 'media_analyst'
        WHEN 'Operations'                    THEN 'head_of_operations'
        WHEN 'Advisor'                       THEN 'advisor'
        ELSE 'analyst'
      END)::public.app_role,
      true,
      'to_redeem',
      'active',
      COALESCE(r.display_order, 0)
    )
    RETURNING id INTO new_id;

    UPDATE public.team_members SET member_id = new_id WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.members ENABLE TRIGGER project_member_to_team_trg;


CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role NOT IN ('member','pending','candidate')
  )
$$;

DROP POLICY IF EXISTS "members readable by self" ON public.members;
CREATE POLICY "members readable by self"
  ON public.members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "members readable by staff" ON public.members;
CREATE POLICY "members readable by staff"
  ON public.members FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));