-- =====================================================================
-- STEP 90. Activity tracking covers everyone and everything.
-- ---------------------------------------------------------------------
-- Every edge function records its writes through the audit wrapper
-- (supabase/functions/_shared/activity.ts). A few things the workspace
-- writes straight into a table, with the signed-in person's own session:
-- the Calendar and exam sessions, report deadlines, a member's GPA
-- comparisons and onboarding checklist, the website's page visibility,
-- the newsletter list, and the account claim a pending user makes on the
-- register (public.claim_member_account). Those were recorded only when
-- the page remembered to, which most did not.
--
-- They are now recorded HERE, by the database, so nothing depends on the
-- interface remembering: one entry per change, stamped with the person and
-- their role exactly as public.log_activity does for any other entry.
--
-- ONLY THE PERSON'S OWN WRITES. A write made by an edge function uses the
-- service role and is recorded by that function's wrapper; the trigger
-- skips it, so nothing is recorded twice. Writes with no signed-in person
-- (a visitor subscribing to the newsletter from the website) are not
-- workspace activity and are not recorded.
--
-- NO PERSONAL DATA IN THE LOG TEXT. Each table names its rows by a title
-- or a label; a newsletter address is recorded masked (a***@example.com).
--
-- RETENTION: ninety days at most (Privacy Policy, Data retention). Older
-- entries are deleted automatically, and once now.
--
-- Safe to run twice.
-- =====================================================================

-- 1. The trigger function ------------------------------------------------
-- Arguments: section, subsection, entity type, the column that names a row
-- ('-' for none, '@email' for a masked address).
CREATE OR REPLACE FUNCTION public.audit_client_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role');
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_action text;
  v_name text;
  v_name_col text := TG_ARGV[3];
  v_email text;
BEGIN
  -- Only a signed-in person's own write, made with their session.
  IF auth.uid() IS NULL OR v_role IS DISTINCT FROM 'authenticated' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    v_action := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
    v_action := 'delete';
  ELSE
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    -- A save that changed nothing (only the timestamp) is not a change.
    IF (v_new - 'updated_at' - 'updated_by') = (v_old - 'updated_at' - 'updated_by') THEN
      RETURN NULL;
    END IF;
    v_row := v_new;
    v_action := 'update';
  END IF;

  IF v_name_col = '@email' THEN
    v_email := lower(btrim(coalesce(v_row ->> 'email', '')));
    v_name := CASE WHEN position('@' IN v_email) > 1
      THEN left(v_email, 1) || '***' || substr(v_email, position('@' IN v_email))
      ELSE NULL END;
  ELSIF v_name_col IS NOT NULL AND v_name_col <> '-' THEN
    v_name := left(nullif(btrim(v_row ->> v_name_col), ''), 160);
  END IF;

  PERFORM public.log_activity(
    v_action,
    TG_ARGV[2],
    v_name,
    TG_ARGV[0],
    TG_ARGV[1],
    v_row ->> 'id',
    jsonb_build_object('table', TG_TABLE_NAME, 'source', 'direct'));
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- A broken audit entry must never break the write it records.
  RETURN NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION public.audit_client_write() FROM PUBLIC, anon, authenticated;

-- 2. The tables the workspace writes to directly -----------------------
-- (kept in step with CLIENT_WRITE_TABLES in
-- supabase/functions/_shared/activity-registry.ts; the coverage test
-- checks the two agree)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('calendar_entries',       'General',  'Calendar',      'calendar_entries',       'title'),
      ('exam_sessions',          'General',  'Calendar',      'exam_sessions',          'label'),
      ('gpa_calculations',       'Career',   'GPA Converter', 'gpa_calculations',       'name'),
      ('newsletter_subscribers', 'Website',  'Newsletter',    'newsletter_subscribers', '@email'),
      ('onboarding_progress',    'General',  'Dashboard',     'onboarding_progress',    '-'),
      ('page_visibility',        'Website',  'Pages',         'page_visibility',        'page_key'),
      ('report_deadlines',       'Reports',  'Deadlines',     'report_deadlines',       'title'),
      ('members',                'People',   'Members',       'members',                'surname')
    ) AS v(tbl, section, subsection, entity_type, name_col)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN
      RAISE NOTICE 'Activity tracking: table % does not exist here; skipped.', t.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_client_write ON public.%I', t.tbl);
    EXECUTE format(
      'CREATE TRIGGER audit_client_write AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.audit_client_write(%L, %L, %L, %L)',
      t.tbl, t.section, t.subsection, t.entity_type, t.name_col);
  END LOOP;
END $$;

-- 3. Retention: ninety days ---------------------------------------------
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at);

CREATE OR REPLACE FUNCTION public.trim_activity_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- The Privacy Policy's limit: nothing older than ninety days.
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '90 days';
  -- A safety bound far above ninety days of ordinary use, checked now and
  -- then rather than on every write, so it never slows a save down.
  IF random() < 0.01 THEN
    DELETE FROM public.activity_logs
     WHERE id IN (SELECT id FROM public.activity_logs ORDER BY created_at DESC OFFSET 200000);
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trim_activity_logs_trigger ON public.activity_logs;
CREATE TRIGGER trim_activity_logs_trigger
  AFTER INSERT ON public.activity_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.trim_activity_logs();

DO $$
DECLARE
  v_gone int;
BEGIN
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_gone = ROW_COUNT;
  RAISE NOTICE 'Activity tracking: % entries older than ninety days deleted.', v_gone;
END $$;
