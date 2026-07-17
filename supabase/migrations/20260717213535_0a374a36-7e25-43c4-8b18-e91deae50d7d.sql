-- STEP 12
DROP POLICY IF EXISTS "Alumni are publicly readable" ON public.alumni;
DROP POLICY IF EXISTS "alumni readable by workspace" ON public.alumni;
CREATE POLICY "alumni readable by workspace"
  ON public.alumni FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.public_alumni_directory()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.alumni),
    'rows', COALESCE((
      SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT id, name, surname, graduation_year, company, city, job_area, linkedin_url
        FROM public.alumni
        ORDER BY graduation_year DESC, surname ASC, name ASC
        LIMIT 100
      ) t), '[]'::jsonb),
    'job_areas', COALESCE((SELECT jsonb_agg(DISTINCT job_area) FROM public.alumni WHERE job_area IS NOT NULL AND job_area <> ''), '[]'::jsonb),
    'companies', COALESCE((SELECT jsonb_agg(DISTINCT company)  FROM public.alumni WHERE company  IS NOT NULL AND company  <> ''), '[]'::jsonb),
    'cities',    COALESCE((SELECT jsonb_agg(DISTINCT city)     FROM public.alumni WHERE city     IS NOT NULL AND city     <> ''), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.public_alumni_directory() FROM public;
GRANT EXECUTE ON FUNCTION public.public_alumni_directory() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_alumni_filter_count(
  p_job_area text DEFAULT NULL,
  p_company  text DEFAULT NULL,
  p_city     text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.alumni
  WHERE (p_job_area IS NULL OR job_area = p_job_area)
    AND (p_company  IS NULL OR company  = p_company)
    AND (p_city     IS NULL OR city     = p_city);
$$;
REVOKE ALL ON FUNCTION public.public_alumni_filter_count(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_alumni_filter_count(text, text, text) TO anon, authenticated;

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
                   'advisor','silent_advisor')
  )
$$;

CREATE OR REPLACE FUNCTION public.member_division_read(_user_id uuid, _division public.org_division)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('portfolio_manager','team_leader','senior_analyst','analyst','media_analyst')
      AND division = _division
  )
$$;

DROP POLICY IF EXISTS "members readable by staff" ON public.members;
CREATE POLICY "members readable by staff"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    public.members_full_read(auth.uid())
    OR public.member_division_read(auth.uid(), division)
  );

CREATE OR REPLACE FUNCTION public.workspace_member_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_staff(auth.uid())
    THEN (SELECT count(*)::integer FROM public.members)
    ELSE 0 END;
$$;
REVOKE ALL ON FUNCTION public.workspace_member_count() FROM public;
GRANT EXECUTE ON FUNCTION public.workspace_member_count() TO authenticated;

UPDATE public.workspace_resources
SET category = 'smm_graphics'
WHERE category = 'smm_other'
  AND title ILIKE '%MIMS Logos%';

UPDATE public.members SET updated_at = now()
WHERE user_id IS NOT NULL AND membership_status <> 'expelled';

DO $$
DECLARE
  r record;
  v_parts text[];
  v_first text;
  v_sur   text;
BEGIN
  FOR r IN
    SELECT ur.user_id, ur.role, ur.division, p.full_name, p.email
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role NOT IN ('member','pending','candidate','alumni','admin')
      AND COALESCE(p.email, '') <> 'as.minerva@unibocconi.it'
      AND NOT EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = ur.user_id)
  LOOP
    v_parts := regexp_split_to_array(
      COALESCE(NULLIF(trim(r.full_name), ''), split_part(COALESCE(r.email, 'member'), '@', 1)),
      '\s+');
    v_first := COALESCE(v_parts[1], 'Member');
    v_sur   := COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), '');
    INSERT INTO public.members
      (user_id, first_name, surname, email, role, division,
       account_status, membership_status, fee_status, is_public)
    VALUES
      (r.user_id, v_first, v_sur, r.email, r.role, COALESCE(r.division, 'none'),
       'approved', 'active', 'unpaid', false);
  END LOOP;
END $$;