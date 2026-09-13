-- =====================================================================
-- Candidate priority: OFF THE APPLICATION, AND OUT OF THE CANDIDATE'S REACH.
-- ---------------------------------------------------------------------
-- The marker was added as a column on `applications`. Nothing in the
-- interface showed it to the candidate and no email mentioned it, but it
-- was still reachable by the person it is about:
--
--   · `applications` grants SELECT to `authenticated`, and the policy
--     "applicants read own application" scopes that to their OWN ROW.
--     Row-scoped, not column-scoped: every column of that row is
--     readable.
--   · The candidate's profile fetches it with `select('*')`, so the
--     marker travelled to their browser inside a response they can open
--     in developer tools.
--
-- A judgement reviewers make about a candidate should not be sitting in
-- a payload addressed to that candidate. So it moves to a table of its
-- own, which candidates have no grant on at all and no policy for: there
-- is no request they can make that returns it.
--
-- PRESENT MEANS PRIORITY. A row is the flag, so who set it and when come
-- for free, and there is no third state to reason about.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.application_priorities (
  application_id uuid PRIMARY KEY
    REFERENCES public.applications(id) ON DELETE CASCADE,
  set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.application_priorities IS
  'Screening marker: the candidacies flagged to be looked at first. A row means the flag is on; no row means off. Deliberately NOT a column on applications, because candidates can read their own application row in full and this is a reviewers'' judgement about them. Written only by the admin-applications edge function, which allows it for the roles that manage Candidate Screening.';

ALTER TABLE public.application_priorities ENABLE ROW LEVEL SECURITY;

-- Staff read it; the screening register itself goes through the edge
-- function on the service role, so this policy exists for correctness
-- rather than for a query the workspace makes today. Candidates are
-- excluded by `is_staff`, which is false for the candidate role.
DROP POLICY IF EXISTS application_priorities_staff_read ON public.application_priorities;
CREATE POLICY application_priorities_staff_read
  ON public.application_priorities FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- No INSERT, UPDATE or DELETE policy: writing is the edge function's,
-- which holds the service role and checks the caller's role itself.
GRANT SELECT ON public.application_priorities TO authenticated;
REVOKE ALL ON public.application_priorities FROM anon;

-- ── Carry over anything already flagged, then remove the column ──────
-- Guarded so this runs whether or not the earlier migration was applied.
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
