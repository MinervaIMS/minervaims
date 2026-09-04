-- =====================================================================
-- Part two of the Team Leader fix.
-- ---------------------------------------------------------------------
-- Separate from the previous migration on purpose: PostgreSQL refuses to
-- use an enum value that was added by ALTER TYPE in the same
-- transaction, and 'Team Leader' is used below. Running them as two
-- migrations is the sanctioned way round that.
-- =====================================================================


-- ── 1. A Team Leader is published as a Team Leader ──────────────────
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
    -- The legacy division-baked head roles resolve to the same labels.
    -- They were reaching the ELSE branch and being published as
    -- 'Analyst': any row still carrying one of these appeared on the
    -- public site as an analyst rather than as the head of a division.
    WHEN _role = 'head_of_equity'     THEN 'Head of Equity Research'
    WHEN _role = 'head_of_investment' THEN 'Head of Investment Research'
    WHEN _role = 'head_of_macro'      THEN 'Head of Macro Research'
    WHEN _role = 'head_of_portfolio'  THEN 'Head of Portfolio Management'
    WHEN _role = 'head_of_quant'      THEN 'Head of Quantitative Research'
    WHEN _role = 'portfolio_manager'  THEN 'Portfolio Manager'
    -- THE FIX. This said 'Senior Analyst', which is a different rank.
    WHEN _role = 'team_leader'        THEN 'Team Leader'
    WHEN _role = 'senior_analyst'     THEN 'Senior Analyst'
    WHEN _role = 'head_of_operations' THEN 'Head of Operations'
    WHEN _role = 'head_of_media'      THEN 'Head of Media'
    WHEN _role = 'media_analyst'      THEN 'Media'
    WHEN _role = 'advisor'            THEN 'Advisor'
    WHEN _role = 'silent_advisor'     THEN 'Advisor'
    ELSE 'Analyst'
  END::public.team_position
$$;


-- ── 2. The projection carries the sub-unit ──────────────────────────
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
      team          = NEW.team,
      photo_url     = NEW.photo_url,
      linkedin_url  = NEW.linkedin_url,
      is_board      = (public.member_rank(NEW.role, NEW.division) <= 6),
      display_order = public.member_rank(NEW.role, NEW.division)
    WHERE member_id = NEW.id;
  ELSE
    INSERT INTO public.team_members
      (member_id, name, surname, position, division, team, photo_url, linkedin_url, is_board, display_order)
    VALUES
      (NEW.id, NEW.first_name, NEW.surname,
       public.role_to_team_position(NEW.role, NEW.division),
       public.division_to_team_division(NEW.division),
       NEW.team,
       NEW.photo_url, NEW.linkedin_url,
       (public.member_rank(NEW.role, NEW.division) <= 6),
       public.member_rank(NEW.role, NEW.division));
  END IF;

  RETURN NEW;
END;
$$;


-- ── 3. Re-project everybody ─────────────────────────────────────────
-- Touching updated_at fires the trigger, which recomputes the position
-- and carries the (currently empty) team across. This is what corrects
-- the Team Leaders already published as Senior Analysts.
UPDATE public.members SET updated_at = now();


-- ── 4. Alumni calls belong in the event archive ─────────────────────
-- The mirror written in step 48 set in_archive = false, and the Event
-- archive in the workspace lists only events with in_archive, so every
-- published alumni call was missing from the association's own record of
-- its events while appearing on the public site. The edge function now
-- writes true; these are the rows it already wrote.
UPDATE public.events SET in_archive = true
WHERE event_type = 'alumni_call' AND in_archive = false;
