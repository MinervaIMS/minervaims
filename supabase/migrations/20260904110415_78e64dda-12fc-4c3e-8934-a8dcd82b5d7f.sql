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
UPDATE public.applications
   SET evaluation_division = COALESCE(interview_division, first_choice)
 WHERE evaluation_division IS NULL;


-- ── 3. A new application starts at its first choice ─────────────────
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