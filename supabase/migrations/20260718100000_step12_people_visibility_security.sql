-- ═════════════════════════════════════════════════════════════════════
-- STEP 12 — People visibility + single-role security hardening
-- ---------------------------------------------------------------------
-- 1. Public alumni directory limited to the first 100 entries; the full
--    list becomes a workspace privilege (any role except member/candidate
--    /pending). Filter options and match counts still span the whole base.
-- 2. Members register: division-scoped reading for junior roles at the
--    database level (portfolio managers, team leaders, senior analysts,
--    analysts see their own division only).
-- 3. Count helpers so public key figures and the workspace dashboard keep
--    working under the tightened policies.
-- 4. One-shot reconciliation: user_roles is re-mirrored from the roster
--    and orphan staff accounts get a roster row, so People > Members and
--    Settings > Users can never show different roles again.
-- ═════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. PUBLIC ALUMNI DIRECTORY
-- ─────────────────────────────────────────────────────────────────────

-- The alumni table is no longer publicly readable in full.
DROP POLICY IF EXISTS "Alumni are publicly readable" ON public.alumni;

-- Workspace accounts with any role other than member/candidate/pending
-- (is_staff covers exactly that, including the 'alumni' role itself and
-- advisors) read the full directory.
DROP POLICY IF EXISTS "alumni readable by workspace" ON public.alumni;
CREATE POLICY "alumni readable by workspace"
  ON public.alumni FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Public page data source: the first 100 alumni in the directory's usual
-- order, plus the filter option lists built over the ENTIRE base.
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

-- How many alumni of the ENTIRE base match a filter selection. The public
-- page uses this to say "N found, full access restricted to members and
-- alumni" when matches fall outside the visible 100. With no arguments it
-- returns the total directory size (used by the public key figures).
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

-- ─────────────────────────────────────────────────────────────────────
-- 2. MEMBERS REGISTER: division-scoped reading for junior roles
-- ─────────────────────────────────────────────────────────────────────
-- Full register: leadership, heads, operations/media heads and advisors.
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

-- Own-division reading for the junior research/media roles.
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
-- ("members readable by self" remains: everyone always reads their own row.)

-- ─────────────────────────────────────────────────────────────────────
-- 3. COUNT HELPERS (keep dashboards/key figures correct under RLS)
-- ─────────────────────────────────────────────────────────────────────
-- Total roster size for the workspace dashboard, independent of the
-- caller's division scope. Staff only; others get 0.
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

-- ─────────────────────────────────────────────────────────────────────
-- 4. MEDIA & COMMUNICATION: new "MIMS Graphics" subsection
-- ─────────────────────────────────────────────────────────────────────
-- The logos item moves from Other Resources into the new MIMS Graphics
-- repository (same layout and functionality as Instagram / LinkedIn).
UPDATE public.workspace_resources
SET category = 'smm_graphics'
WHERE category = 'smm_other'
  AND title ILIKE '%MIMS Logos%';

-- ─────────────────────────────────────────────────────────────────────
-- 5. ONE-SHOT RECONCILIATION: one email, one role, everywhere
-- ─────────────────────────────────────────────────────────────────────
-- (a) Re-fire the sync trigger for every linked, non-expelled roster row:
--     user_roles is re-mirrored from the roster, repairing any drift
--     accumulated before or around the single-role migration.
UPDATE public.members SET updated_at = now()
WHERE user_id IS NOT NULL AND membership_status <> 'expelled';

-- (b) Accounts that hold a staff role in user_roles but have NO roster row
--     (assigned before the single-role system) get a roster row created
--     from their profile. From then on the roster is their one record and
--     the sync trigger keeps user_roles aligned automatically.
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
