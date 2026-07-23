-- Step 19: security hardening driven by the security scan findings.
DROP POLICY IF EXISTS semester_members_read ON public.semester_members;
CREATE POLICY semester_members_read ON public.semester_members
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS semester_snapshots_read ON public.semester_snapshots;
CREATE POLICY semester_snapshots_read ON public.semester_snapshots
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_email_format;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_email_format
  CHECK (
    char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) NOT VALID;

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_email_format;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_email_format
  CHECK (
    email IS NULL OR (
      char_length(email) BETWEEN 3 AND 255
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ) NOT VALID;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT COALESCE(array_to_string(p.proconfig, ',') LIKE '%search_path=%', false)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f.sig);
  END LOOP;
END $$;

DO $$
DECLARE
  f record;
  keep_anon text[] := ARRAY[
    'public_alumni_directory', 'public_alumni_filter_count'
  ];
  internal text[] := ARRAY[
    'enqueue_email', 'enqueue_app_email', 'read_email_batch', 'move_to_dlq',
    'delete_email', 'process_offer_deadlines', 'cleanup_expelled_members',
    'cleanup_expired_candidates', 'link_member_account'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig,
           p.proname AS name,
           p.prorettype::regtype::text AS ret
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF NOT (f.name = ANY (keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', f.sig);
    END IF;
    IF f.ret = 'trigger' OR f.name = ANY (internal) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
    END IF;
  END LOOP;
END $$;