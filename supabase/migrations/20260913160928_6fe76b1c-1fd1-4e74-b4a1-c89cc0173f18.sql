CREATE TABLE IF NOT EXISTS public.application_priorities (
  application_id uuid PRIMARY KEY
    REFERENCES public.applications(id) ON DELETE CASCADE,
  set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.application_priorities IS
  'Screening marker: the candidacies flagged to be looked at first. A row means the flag is on; no row means off. Deliberately NOT a column on applications, because candidates can read their own application row in full and this is a reviewers'' judgement about them. Written only by the admin-applications edge function, which allows it for the roles that manage Candidate Screening.';

ALTER TABLE public.application_priorities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_priorities_staff_read ON public.application_priorities;
CREATE POLICY application_priorities_staff_read
  ON public.application_priorities FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

GRANT SELECT ON public.application_priorities TO authenticated;
GRANT ALL ON public.application_priorities TO service_role;
REVOKE ALL ON public.application_priorities FROM anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'priority'
  ) THEN
    EXECUTE $mig$
      INSERT INTO public.application_priorities (application_id)
      SELECT id FROM public.applications WHERE priority = true
      ON CONFLICT (application_id) DO NOTHING
    $mig$;
  END IF;
END $$;

DROP INDEX IF EXISTS public.applications_priority_idx;
ALTER TABLE public.applications DROP COLUMN IF EXISTS priority;