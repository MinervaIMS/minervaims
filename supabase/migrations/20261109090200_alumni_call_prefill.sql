-- =====================================================================
-- AN ALUMNUS ON AN ALUMNI CALL, FILLED IN FROM THE RECORDS (Step 105).
-- ---------------------------------------------------------------------
-- Picking an alumnus from the directory in Events > Create (type Alumni
-- call), or in the call's window in the Event Archive, now fills in what
-- the records know: the company on file, and the role and division they
-- held at Minerva, read from the roster history of People > Time Machine.
-- Every field stays editable, and what the organisers type is what the
-- call keeps: nothing here writes anywhere.
--
-- The role chosen is the highest office the person held (President, Vice
-- President, Head of a division, and so on, in the order of
-- roster_office_rank); without an office, the role of their last
-- semester. Placeholder lines ("Member (role not stated)", "On semester
-- break", "Member (referred an applicant)") are never chosen.
--
-- It answers only the people who plan alumni calls: the roles the access
-- matrix lets open Events > Create Event, or manage Alumni Calls
-- (src/lib/access/matrix.ts, mirrored in supabase/functions/_shared/
-- access.ts), and the association's account. scripts/alumni-call-
-- prefill.test.mjs fails if the list and the matrix ever disagree. It is
-- one of the People functions (AGENTS.md): it reads the roster history
-- for one purpose and returns one role and one division per alumnus, at
-- most ten at a time, never the person code.
-- Safe to run twice.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.plans_alumni_calls(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT uid IS NOT NULL AND (
    lower(coalesce((SELECT email FROM auth.users WHERE id = uid), '')) = 'as.minerva@unibocconi.it'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = uid
         AND ur.role::text IN (
           -- Events > Create Event at any level, or Alumni Calls to manage.
           'admin', 'president', 'vice_president',
           'head_of_asset_management', 'head_of_division',
           'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant',
           'head_of_operations',
           'advisor', 'silent_advisor'
         )
    )
  );
$fn$;

REVOKE EXECUTE ON FUNCTION public.plans_alumni_calls(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.plans_alumni_calls(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.plans_alumni_calls(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.alumni_call_prefill(p_alumni_ids uuid[])
RETURNS TABLE (alumni_id uuid, company text, job_area text, role_label text, division_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT a.id, a.company, a.job_area, best.role_label, best.division_key
    FROM public.alumni a
    LEFT JOIN LATERAL (
      SELECT e.role_label, e.division_key
        FROM public.person_records pr
        JOIN public.roster_entries e ON e.person_id = pr.person_id
       WHERE pr.record_type = 'alumni' AND pr.record_id = a.id
         AND e.role_label !~* '^(member \(|on semester break)'
       ORDER BY public.roster_office_rank(e.role_label) NULLS LAST,
                public.semester_ordinal(e.semester_key) DESC
       LIMIT 1
    ) best ON true
   WHERE a.id = ANY (coalesce(p_alumni_ids, ARRAY[]::uuid[]))
     AND cardinality(coalesce(p_alumni_ids, ARRAY[]::uuid[])) <= 10
     AND public.plans_alumni_calls(auth.uid());
$fn$;

REVOKE EXECUTE ON FUNCTION public.alumni_call_prefill(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.alumni_call_prefill(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.alumni_call_prefill(uuid[]) TO authenticated, service_role;
