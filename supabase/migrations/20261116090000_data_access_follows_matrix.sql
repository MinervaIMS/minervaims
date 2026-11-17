-- =====================================================================
-- Step 106A: WHAT THE DATABASE HANDS OUT FOLLOWS THE ROLE MATRIX.
-- ---------------------------------------------------------------------
-- The workspace decides what a role may open from one table, the access
-- matrix (src/lib/access/matrix.ts), and every edge function asks the
-- same matrix (supabase/functions/_shared/access.ts). The database did
-- not: a good number of tables were readable by "staff", which
-- public.is_staff() defines as any account that is not a candidate. So a
-- page the matrix hides from a role (Treasury, Membership Fees, the
-- Activity Log, Invites, Ads & Spending, Automatic Emails, the Editorial
-- Calendar, External Relations, Statute & Documents) could still be read
-- row by row by that role, or by an alumni account, by asking the data
-- API directly instead of opening the page.
--
-- The workspace reads none of these tables that way for anybody the
-- matrix refuses: the pages go through their edge functions, which use
-- the service role and check the matrix first. So narrowing the read
-- policies changes nothing a member sees. It only closes the side door.
--
--   1. public.ws_view_roles / public.ws_views: the matrix's "can view"
--      answer for the pages named below, as stored role names. The lists
--      are generated from the matrix, and scripts/data-access.test.mjs
--      recomputes them from it, so the two cannot drift.
--   2. The "readable by staff" policies of those tables, replaced by the
--      matrix's answer. Alumni contact details (never shown in the
--      workspace) become readable by the service role only.
--   3. Registrations and waiting lists: your own, or every one for the
--      organisers (public.sees_event_places, Step 105).
--   4. The two restricted libraries (External Relations, Statute &
--      Documents): their rows and their files.
--   5. The activity log: an entry written from the browser always
--      carries the writer's real address and role.
--   6. Signed-out visitors read only the events the website shows, or
--      whose registration is open to non-members.
--   7. The functions that only the database and the edge functions use
--      can no longer be called from outside. One of them queued the
--      association's emails (public.enqueue_staff_email): a visitor who
--      was not signed in could have made it send any stored email to any
--      address. Each function now answers only to who needs it.
--
--   8. public.request_rate_check: a limit per address on the two forms
--      that anybody can send without signing in (registering for an
--      event, applying), so a script cannot use them to send thousands
--      of emails or fill the registers.
--
-- Nothing is deleted and no data is changed: policies, functions, one
-- trigger, one view, one small table and the permissions on functions.
-- Safe to run twice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The matrix's "can view", for the pages the policies below name.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ws_view_roles(p_resource text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_resource
    WHEN 'ops-treasury' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_division', 'advisor', 'silent_advisor']
    WHEN 'ops-fee' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_operations', 'advisor', 'silent_advisor', 'operations_analyst']
    WHEN 'smm-ads' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations', 'head_of_media', 'media_analyst', 'advisor', 'silent_advisor', 'operations_analyst']
    WHEN 'people-invites' THEN ARRAY['admin', 'president', 'vice_president', 'advisor', 'silent_advisor']
    WHEN 'settings-activity' THEN ARRAY['admin', 'president', 'vice_president']
    WHEN 'ops-auto-emails' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_operations', 'advisor', 'silent_advisor']
    WHEN 'smm-editorial' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations', 'head_of_media', 'media_analyst', 'advisor', 'silent_advisor', 'operations_analyst']
    WHEN 'events-on-display' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'portfolio_manager', 'head_of_division', 'team_leader', 'analyst', 'media_analyst', 'advisor', 'silent_advisor', 'senior_analyst', 'operations_analyst']
    WHEN 'applications-screening' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'portfolio_manager', 'head_of_division', 'team_leader', 'advisor', 'silent_advisor']
    WHEN 'applications-interview-calendar' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'portfolio_manager', 'head_of_division', 'team_leader', 'advisor', 'silent_advisor']
    WHEN 'settings-roles' THEN ARRAY['admin', 'president', 'vice_president']
    WHEN 'people-alumni' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'portfolio_manager', 'head_of_division', 'team_leader', 'analyst', 'media_analyst', 'advisor', 'silent_advisor', 'senior_analyst', 'operations_analyst']
    WHEN 'ops-external' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'head_of_division', 'advisor', 'silent_advisor']
    WHEN 'ops-docs' THEN ARRAY['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'head_of_division', 'advisor', 'silent_advisor']
    ELSE ARRAY[]::text[]
  END;
$$;

-- Does this account open that page, at any level? The admin account by
-- its address, as in public.sees_event_places; anybody else by a role
-- the matrix grants the page to. An unknown page answers no.
CREATE OR REPLACE FUNCTION public.ws_views(uid uuid, p_resource text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL AND (
    lower(coalesce((SELECT email FROM auth.users WHERE id = uid), '')) = 'as.minerva@unibocconi.it'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = uid
         AND ur.role::text = ANY (public.ws_view_roles(p_resource))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.ws_view_roles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ws_views(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_view_roles(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ws_views(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2 to 4. The read policies.
-- ---------------------------------------------------------------------
-- Every SELECT policy of these tables that answers with is_staff() goes,
-- whatever it was named, and the matrix's answer takes its place. A
-- table that is not there (an older installation) is skipped.
DO $$
DECLARE
  r record;
  t text;
  page text;
  pairs text[][] := ARRAY[
    ['treasury_entries',         'ops-treasury'],
    ['ads_spending',             'smm-ads'],
    ['account_invites',          'people-invites'],
    ['activity_logs',            'settings-activity'],
    ['auto_email_templates',     'ops-auto-emails'],
    ['editorial_items',          'smm-editorial'],
    ['aod_signups',              'events-on-display'],
    ['application_priorities',   'applications-screening'],
    ['application_email_map',    'applications-screening'],
    ['interview_slots',          'applications-interview-calendar'],
    ['alumni_calls',             'people-alumni'],
    ['alumni_call_participants', 'people-alumni'],
    ['role_permissions',         'settings-roles'],
    ['membership_fees',          'ops-fee'],
    ['semester_members',         'ops-fee']
  ];
  i int;
BEGIN
  -- The old "staff" read policies of every table this step narrows.
  FOR r IN
    SELECT p.tablename, p.policyname
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.cmd = 'SELECT'
       AND p.qual ILIKE '%is_staff(%'
       AND p.policyname NOT LIKE 'step106 %'
       AND p.tablename = ANY (ARRAY[
         'treasury_entries', 'ads_spending', 'account_invites', 'activity_logs', 'auto_email_templates',
         'editorial_items', 'aod_signups', 'application_priorities', 'application_email_map',
         'interview_slots', 'alumni_calls', 'alumni_call_participants', 'role_permissions',
         'membership_fees', 'semester_members', 'alumni_contacts',
         'event_registrations', 'event_waitlist', 'workspace_resources'])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- One page, one table: readable by the roles the matrix lets open it.
  FOR i IN 1 .. array_length(pairs, 1) LOOP
    t := pairs[i][1]; page := pairs[i][2];
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'step106 read follows the matrix', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.ws_views(auth.uid(), %L)))',
      'step106 read follows the matrix', t, page);
  END LOOP;

  -- Alumni contact details are shown nowhere in the workspace: the
  -- service role reads them (certificates, moving a member to alumni) and
  -- nobody else. No policy, with row level security on, is exactly that.
  IF to_regclass('public.alumni_contacts') IS NOT NULL THEN
    ALTER TABLE public.alumni_contacts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Registrations and waiting lists: your own, or every one for the
  -- organisers (the roles Step 105 lets see an event's places).
  FOREACH t IN ARRAY ARRAY['event_registrations', 'event_waitlist'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'step106 own or organisers', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT public.sees_event_places(auth.uid())))',
      'step106 own or organisers', t);
  END LOOP;

  -- The libraries: as before for every library, except the two the
  -- matrix keeps to fewer roles (External Relations, Statute & Documents).
  IF to_regclass('public.workspace_resources') IS NOT NULL THEN
    DROP POLICY IF EXISTS "step106 libraries follow the matrix" ON public.workspace_resources;
    CREATE POLICY "step106 libraries follow the matrix" ON public.workspace_resources
      FOR SELECT TO authenticated
      USING (
        (SELECT public.is_staff(auth.uid()))
        AND CASE category
              WHEN 'external_relations' THEN (SELECT public.ws_views(auth.uid(), 'ops-external'))
              WHEN 'operations_statuto' THEN (SELECT public.ws_views(auth.uid(), 'ops-docs'))
              ELSE true
            END
      );
  END IF;
END $$;

-- A file of the two restricted libraries opens for the roles that open
-- its library. Every other file of the bucket opens as before.
CREATE OR REPLACE FUNCTION public.ws_resource_file_open(uid uuid, p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM public.workspace_resources r
     WHERE r.category IN ('external_relations', 'operations_statuto')
       AND coalesce(p_path, '') <> ''
       AND (r.file_url = p_path
            OR right(r.file_url, length(p_path) + 1) = '/' || p_path
            OR position(p_path IN coalesce(r.sources::text, '')) > 0)
       AND NOT public.ws_views(uid, CASE r.category WHEN 'external_relations' THEN 'ops-external' ELSE 'ops-docs' END)
  );
$$;
REVOKE ALL ON FUNCTION public.ws_resource_file_open(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_resource_file_open(uuid, text) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "workspace resources readable by staff" ON storage.objects;
    DROP POLICY IF EXISTS "step106 workspace resources follow the matrix" ON storage.objects;
    CREATE POLICY "step106 workspace resources follow the matrix" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'workspace-resources'
        AND (SELECT public.is_staff(auth.uid()))
        AND public.ws_resource_file_open(auth.uid(), name)
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. The activity log cannot be written in somebody else's name.
-- ---------------------------------------------------------------------
-- The browser records its own actions through public.log_activity, and
-- falls back to a plain insert if that call fails. The insert policy
-- checked the account's id and nothing else, so the address and the role
-- written beside it were whatever the browser sent. They are now always
-- the account's own, and an entry from the browser is kept to a sensible
-- size. Entries written by the edge functions (service role) are not
-- touched.
CREATE OR REPLACE FUNCTION public.activity_logs_stamp_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_role  text;
BEGIN
  IF v_uid IS NULL OR coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT role::text INTO v_role
    FROM public.user_roles
   WHERE user_id = v_uid
   ORDER BY public.member_rank(role, COALESCE(division, 'none')) ASC
   LIMIT 1;
  NEW.user_id     := v_uid;
  NEW.user_email  := COALESCE(v_email, '');
  NEW.user_role   := COALESCE(v_role, 'member');
  NEW.action      := left(NEW.action, 80);
  NEW.entity_type := left(NEW.entity_type, 100);
  NEW.entity_name := left(NEW.entity_name, 300);
  NEW.section     := left(NEW.section, 120);
  NEW.subsection  := left(NEW.subsection, 120);
  IF NEW.details IS NOT NULL AND pg_column_size(NEW.details) > 16384 THEN
    NEW.details := jsonb_build_object('note', 'Details left out: too long to keep.');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.activity_logs_stamp_identity() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS activity_logs_stamp_identity ON public.activity_logs;
    CREATE TRIGGER activity_logs_stamp_identity
      BEFORE INSERT ON public.activity_logs
      FOR EACH ROW EXECUTE FUNCTION public.activity_logs_stamp_identity();
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. Signed-out visitors and the events the website does not show.
-- ---------------------------------------------------------------------
-- A visitor who is not signed in could list every event, including the
-- internal ones the Events page never shows. They now read an event only
-- if the website shows it, or if its registration is open to people who
-- are not members (a form reached by its link). Anybody signed in reads
-- what they read before. An alumni call stays out of the table for
-- visitors, as before; the view hands out its public fields.
DO $$
DECLARE r record;
BEGIN
  IF to_regclass('public.events') IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'events' AND cmd = 'SELECT'
       AND roles = ARRAY['anon']::name[]
       AND policyname NOT LIKE 'step106 %'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.events', r.policyname);
  END LOOP;
  DROP POLICY IF EXISTS "step106 visitors read public events" ON public.events;
  CREATE POLICY "step106 visitors read public events" ON public.events
    FOR SELECT TO anon
    USING (
      event_type <> 'alumni_call'
      AND (show_on_website OR (registration_enabled AND registration_audience <> 'members'))
    );
END $$;

-- The same view, columns unchanged, with the one condition added for a
-- visitor who is not signed in.
CREATE OR REPLACE VIEW public.website_events WITH (security_barrier = true) AS
SELECT
  e.id, e.title,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.date END     AS date,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.start_at END AS start_at,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.end_at END   AS end_at,
  e.place, e.online, e.moderator, e.guest, e.description, e.poster_url,
  e.event_type, e.division, e.registration_enabled, e.registration_audience,
  e.capacity, e.show_on_website, e.in_archive, e.aod_day_id,
  (e.date::timestamp AT TIME ZONE 'UTC') < now() AS is_past,
  row_number() OVER (ORDER BY e.date DESC, e.start_at DESC NULLS LAST, e.id) AS listing_order,
  CASE WHEN e.event_type = 'company_visit' THEN e.interest_closes_at ELSE NULL END AS interest_closes_at
FROM public.events e
WHERE NOT e.date_tbc
  AND (e.event_type <> 'alumni_call'
       OR e.show_on_website
       OR (e.registration_enabled AND e.registration_audience <> 'members'))
  AND (auth.uid() IS NOT NULL
       OR e.show_on_website
       OR (e.registration_enabled AND e.registration_audience <> 'members'));

-- ---------------------------------------------------------------------
-- 8. A limit per address on the forms anybody can send.
-- ---------------------------------------------------------------------
-- The same idea as public.pricing_rate_check, with a table of its own so
-- that one form's window never prunes another's. TRUE: within the limit
-- (and the request is counted). FALSE: the window is full. Only the edge
-- functions call it (section 7 gives it to the service role alone); they
-- let the request through if it cannot be asked.
CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  bucket       text NOT NULL,
  key          text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS request_rate_limits_bucket_key_time_idx
  ON public.request_rate_limits (bucket, key, requested_at DESC);
ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.request_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.request_rate_check(
  p_bucket text, p_key text, p_limit integer, p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.request_rate_limits
   WHERE bucket = p_bucket
     AND requested_at < now() - make_interval(secs => p_window_seconds * 2);

  SELECT count(*) INTO v_count
    FROM public.request_rate_limits
   WHERE bucket = p_bucket AND key = p_key
     AND requested_at > now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.request_rate_limits (bucket, key) VALUES (p_bucket, left(p_key, 80));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.request_rate_check(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_rate_check(text, text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 7. Who may call which function.
-- ---------------------------------------------------------------------
-- A function made in this database can be called by everybody, signed in
-- or not, until that is taken away twice: from PUBLIC and from the anon
-- role. Several migrations took it away once. So:
--
--   * public.enqueue_staff_email (REVOKE ... FROM PUBLIC only) could be
--     called by a visitor who was not signed in: any stored email, to any
--     address, with any values in it;
--   * public.fee_payment_block (REVOKE ... FROM anon, authenticated only)
--     answered a visitor with the payment details of a collection.
--
-- Rather than correct the two and wait for the third, every function
-- that runs with the database's own rights (SECURITY DEFINER) is given
-- exactly the callers it has:
--
--   * a visitor who is not signed in: the functions the public website
--     reads (`for_visitors`), and nothing else;
--   * a signed-in account: those, the functions the workspace calls
--     (`for_accounts`), and any function a row level security policy
--     uses, which the policy needs in order to be evaluated;
--   * the service role (the edge functions): every one, as before.
--
-- The policies are read from the database as it is at that moment, so a
-- policy this file does not know about keeps the function it needs. A
-- function a column default or a constraint uses is left exactly as it
-- is. Trigger functions are called by nobody: a trigger needs no
-- permission to fire. Functions that run with the caller's own rights
-- are not touched: row level security already answers for them.
DO $$
DECLARE
  f record;
  for_visitors text[] := ARRAY[
    'public_alumni_classes', 'public_alumni_directory', 'public_alumni_filter_count',
    'public_fund_track_records', 'public_key_numbers', 'public_past_boards',
    'public_people_index', 'public_people_json', 'public_reports',
    'public_testimonial_companies', 'public_track_record', 'event_places'
  ];
  for_accounts text[] := ARRAY[
    'alumni_call_prefill', 'alumni_pending_list', 'claim_member_account', 'log_activity',
    'my_event_registrations', 'my_onboarding_context', 'my_report_projects', 'my_roster_history',
    'people_overview', 'person_record', 'time_machine', 'workspace_member_count',
    'roster_person', 'roster_semester', 'roster_semesters',
    'ws_views', 'ws_view_roles', 'ws_resource_file_open'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig,
           p.proname::text AS name,
           pg_get_function_result(p.oid) = 'trigger' AS is_trigger,
           -- Used by a policy that a visitor's query can reach.
           EXISTS (
             SELECT 1 FROM pg_policies pol
              WHERE (pol.roles && ARRAY['anon', 'public']::name[])
                AND (position(p.proname || '(' IN coalesce(pol.qual, '')) > 0
                     OR position(p.proname || '(' IN coalesce(pol.with_check, '')) > 0)
           ) AS in_visitor_policy,
           -- Used by any policy at all.
           EXISTS (
             SELECT 1 FROM pg_policies pol
              WHERE position(p.proname || '(' IN coalesce(pol.qual, '')) > 0
                 OR position(p.proname || '(' IN coalesce(pol.with_check, '')) > 0
           ) AS in_policy,
           -- Used by a column default or a check constraint.
           (EXISTS (
              SELECT 1 FROM pg_attrdef d
               WHERE position(p.proname || '(' IN pg_get_expr(d.adbin, d.adrelid)) > 0)
            OR EXISTS (
              SELECT 1 FROM pg_constraint c
               WHERE c.contype = 'c'
                 AND position(p.proname || '(' IN pg_get_constraintdef(c.oid)) > 0)
           ) AS in_default_or_check
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND p.prosecdef
  LOOP
    IF f.in_default_or_check THEN CONTINUE; END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);

    IF f.is_trigger THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f.sig);
      CONTINUE;
    END IF;

    -- A visitor who is not signed in.
    IF f.name = ANY (for_visitors) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig);
    ELSIF NOT f.in_visitor_policy THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
    END IF;

    -- A signed-in account.
    IF f.name = ANY (for_visitors) OR f.name = ANY (for_accounts) OR f.in_policy THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
    END IF;
  END LOOP;
END $$;
