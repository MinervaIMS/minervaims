-- =====================================================================
-- THE OPERATIONS ANALYST, in the functions that know each role (step 85).
-- ---------------------------------------------------------------------
-- Each function below is its latest definition, unchanged except for the
-- one line that teaches it the new role. Safe to run twice.
-- =====================================================================

-- 1. The public team page lists an Operations Analyst under Operations.
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
    WHEN _role = 'operations_analyst' THEN 'Operations'
    WHEN _role = 'advisor'            THEN 'Advisor'
    WHEN _role = 'silent_advisor'     THEN 'Advisor'
    ELSE 'Analyst'
  END::public.team_position
$$;


-- 2. Ordering: beside the Media & Communication Analyst.
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
    WHEN _role = 'operations_analyst'       THEN 11
    WHEN _role = 'advisor'                  THEN 12
    ELSE 99
  END
$$;


-- 3. The role is pinned to Operations, as Media roles are to Media.
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
  -- Legacy division-baked head roles normalise to (head_of_division, division).
  IF o_role IN ('head_of_equity','head_of_investment','head_of_macro','head_of_portfolio','head_of_quant') THEN
    o_division := replace(o_role::text, 'head_of_', '')::public.org_division;
    o_role := 'head_of_division';
  END IF;
  -- The silent advisor role no longer exists: it is an advisor.
  IF o_role = 'silent_advisor' THEN o_role := 'advisor'; END IF;
  -- Department roles are pinned to their department.
  IF o_role = 'portfolio_manager'                THEN o_division := 'portfolio';  END IF;
  IF o_role IN ('head_of_media','media_analyst') THEN o_division := 'media';      END IF;
  IF o_role IN ('head_of_operations','operations_analyst') THEN o_division := 'operations'; END IF;
  -- Board and advisor roles carry no division (the board is not a division).
  IF o_role IN ('president','vice_president','head_of_asset_management','advisor','alumni','member') THEN
    o_division := NULL;
  END IF;
  IF o_division IN ('board','none') THEN o_division := NULL; END IF;
END;
$$;


-- 4. People > Members: read in full, as the Media & Communication Analyst does.
CREATE OR REPLACE FUNCTION public.members_full_read(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','president','vice_president','head_of_asset_management',
                   'head_of_division','head_of_equity','head_of_investment','head_of_macro',
                   'head_of_portfolio','head_of_quant','head_of_media','head_of_operations',
                   'advisor','silent_advisor','media_analyst','operations_analyst')
  )
$$;


-- 5. Division reading, kept in step with the Media & Communication Analyst.
CREATE OR REPLACE FUNCTION public.member_division_read(_user_id uuid, _division public.org_division)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('portfolio_manager','team_leader','senior_analyst','analyst','media_analyst','operations_analyst')
      AND division = _division
  )
$$;


-- 6. The new-joiner checklist on the Dashboard, with the Head of Operations as their head.
CREATE OR REPLACE FUNCTION public.my_onboarding_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH me AS (
    SELECT m.*
      FROM public.members m
     WHERE auth.uid() IS NOT NULL
       AND m.user_id = auth.uid()
     LIMIT 1
  )
  SELECT coalesce((
    SELECT jsonb_build_object(
      'eligible', me.membership_status = 'active'
                  AND me.role::text IN ('analyst', 'senior_analyst', 'media_analyst', 'operations_analyst', 'team_leader', 'portfolio_manager'),
      'division', me.division::text,
      'has_photo', nullif(btrim(coalesce(me.photo_url, '')), '') IS NOT NULL,
      'has_phone', nullif(btrim(coalesce(me.phone, '')), '') IS NOT NULL,
      'has_linkedin', nullif(btrim(coalesce(me.linkedin_url, '')), '') IS NOT NULL,
      'heads', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'name', btrim(h.first_name || ' ' || h.surname),
                 'email', nullif(btrim(coalesce(h.email, '')), ''),
                 'phone', nullif(btrim(coalesce(h.phone, '')), ''))
               ORDER BY h.surname, h.first_name)
          FROM public.members h
         WHERE h.membership_status = 'active'
           AND h.id <> me.id
           AND lower(coalesce(btrim(h.email), '')) <> 'as.minerva@unibocconi.it'
           AND (
             (h.role::text = 'head_of_division' AND h.division = me.division)
             OR (h.role::text = 'head_of_media' AND me.division::text = 'media')
             OR (h.role::text = 'head_of_operations' AND me.division::text = 'operations')
           )
      ), '[]'::jsonb)
    )
    FROM me
  ), jsonb_build_object('eligible', false));
$fn$;


-- Re-project anybody already holding the role (none yet, normally).
UPDATE public.members SET updated_at = now() WHERE role = 'operations_analyst';
