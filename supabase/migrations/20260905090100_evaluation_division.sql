-- =====================================================================
-- The division a candidate is BEING EVALUATED FOR, kept apart from the
-- divisions they asked for.
-- ---------------------------------------------------------------------
-- An application carries two preferences, and the register printed both.
-- What it could not print is the question a reviewer actually acts on:
-- which division is assessing this person right now. Until the interview
-- invitation was sent there was no answer stored anywhere, and after it
-- the answer lived in `interview_division`, a field whose name promises
-- something narrower than it was being used for.
--
-- The two are now separate, and each says one thing:
--
--   · evaluation_division - who is assessing this candidate. Always set,
--     defaulting to the first choice, editable from the first day of
--     screening, and the value every communication with the candidate
--     refers to.
--
--   · interview_division  - who invited them to interview. Still NULL
--     until an invitation is actually sent, which is what the applicant's
--     own workspace reads to decide whether the Interview section exists.
--     Once set it always equals the evaluation division.
--
-- UP TO TWO PROCESSES, NEVER THREE. A candidate may be moved to a
-- division they never named, and may be moved back, and that is the whole
-- of it: `evaluation_division_previous` remembers where they came from,
-- and the only move ever offered is between those two. It holds the
-- division the evaluation was moved AWAY FROM on the last change, so
-- after A -> C it is A, and after C -> A it is C. Either way the pair is
-- the same two divisions, and a third can never enter.
-- =====================================================================


-- ── 1. The columns ──────────────────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS evaluation_division public.org_division;
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS evaluation_division_previous public.org_division;

COMMENT ON COLUMN public.applications.evaluation_division IS
  'The division currently assessing this candidate. Defaults to first_choice; may be changed by a role that can move candidacies, to any of the five research divisions or to Media or Operations. Every email the candidate receives names this division.';
COMMENT ON COLUMN public.applications.evaluation_division_previous IS
  'The division the evaluation was moved away from on the last change, or NULL if it has never been changed. Together with evaluation_division it names the only two divisions this candidacy may ever be evaluated by.';


-- ── 2. Backfill ─────────────────────────────────────────────────────
-- An application already invited to interview is being evaluated by the
-- division that invited it; one that is not is being evaluated by its
-- first choice, which is where screening starts.
UPDATE public.applications
   SET evaluation_division = COALESCE(interview_division, first_choice)
 WHERE evaluation_division IS NULL;


-- ── 3. A new application starts at its first choice ─────────────────
-- Done in a trigger rather than a column DEFAULT because the value comes
-- from another column of the same row, which a DEFAULT cannot read.
CREATE OR REPLACE FUNCTION public.applications_default_evaluation_division()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.evaluation_division IS NULL THEN
    NEW.evaluation_division := NEW.first_choice;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_default_evaluation_division ON public.applications;
CREATE TRIGGER applications_default_evaluation_division
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_default_evaluation_division();


-- ── 4. A candidate sees the slots of the division assessing them ────
-- The policy this replaces allowed the slots of BOTH preferences at once,
-- so a candidate invited for their first choice could still read the
-- second choice's interview times. With an evaluation division there is
-- one right answer, and it is also what the booking endpoint has always
-- enforced, so the two now agree instead of the policy being the looser
-- of the pair. A slot they have already booked stays readable regardless,
-- which is what keeps a transferred candidate's own booking visible.
DROP POLICY IF EXISTS "candidates read own division interview slots" ON public.interview_slots;
CREATE POLICY "candidates read own division interview slots"
ON public.interview_slots FOR SELECT TO authenticated
USING (
  is_active = true
  AND (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.user_id = auth.uid()
        AND COALESCE(a.evaluation_division, a.interview_division, a.first_choice)::text
            = interview_slots.division::text
    )
    OR EXISTS (
      SELECT 1 FROM public.interview_bookings b
      WHERE b.slot_id = interview_slots.id
        AND b.candidate_user_id = auth.uid()
    )
  )
);
