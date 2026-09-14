-- =====================================================================
-- THE MARKS BECOME STATUSES, AND THE MARK COLUMN GOES.
-- =====================================================================
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND rel.relname = 'applications'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%offer_declined%'
  LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check CHECK (status IN (
    'received','cv_opened','under_review','to_be_contacted',
    'interview_invitation_sent','waiting_interview_confirmation',
    'interview_confirmed','interview_completed',
    'on_hold','plausible_offer','to_be_rejected',
    'accepted','rejected',
    'offer_accepted','offer_declined','joined','withdrawn'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'applications'
       AND column_name = 'screening_mark'
  ) THEN
    INSERT INTO public.application_notes (application_id, author_id, author_name, body, kind)
    SELECT a.id, NULL, 'Minerva Workspace',
           'Screening mark "' ||
           CASE a.screening_mark WHEN 'to_reject' THEN 'To reject' ELSE 'Maybe' END ||
           '" was recorded here before marks were replaced by the internal statuses. '
           || 'The candidacy was not moved: set the status directly if it still applies.',
           'system'
      FROM public.applications a
     WHERE a.screening_mark IN ('to_reject', 'maybe');
  END IF;
END $$;

DROP INDEX IF EXISTS public.applications_screening_mark_idx;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_screening_mark_check;

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS screening_mark;