-- =====================================================================
-- THE MARKS BECOME STATUSES, AND THE MARK COLUMN GOES.
-- ---------------------------------------------------------------------
-- "To reject" and "Maybe" were built as a field of their own, apart from
-- the status, because the status column only ever moves forward and a
-- mark has to be settable in any order. The association has decided the
-- other way: they want them in the status list, with three states rather
-- than two, and they accept what that means.
--
-- WHAT IT MEANS, said plainly, because it is the reason the field existed:
-- the three new statuses sit AFTER "Interview completed" in the workflow
-- order, so a candidate given one of them can no longer be moved back to
-- an earlier stage. They can go on to any later one - including Accepted,
-- so none of the three is a dead end - but "On hold" set before the
-- interview closes the interview stages off. They are post-interview
-- triage, and that is how they are placed.
--
-- NONE OF THE THREE SENDS ANYTHING. No email, no unlocked step, nothing
-- the candidate can see: their own status page reads all three as the
-- interview stage, exactly as it reads "Interview completed".
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. THE THREE NEW STATUSES.
-- ---------------------------------------------------------------------
-- The constraint is found by what it constrains rather than by name,
-- because it has carried the table's default name since it was created
-- and has been replaced twice since.
-- ─────────────────────────────────────────────────────────────────────
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
    -- The three internal ones. Workspace-only: nothing is sent and the
    -- candidate's own page reads them as the interview stage.
    'on_hold','plausible_offer','to_be_rejected',
    'accepted','rejected',
    'offer_accepted','offer_declined','joined','withdrawn'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. THE MARKS THAT WERE ALREADY SET ARE WRITTEN DOWN BEFORE THE COLUMN
--    GOES, AND NOT CONVERTED INTO A STATUS.
-- ---------------------------------------------------------------------
-- Converting would MOVE people. A candidate sitting at "Under review"
-- with a mark of "Maybe" would land on "On hold", which is placed after
-- the interview, and would have been carried past the interview stage by
-- a migration rather than by anybody's decision. Nobody asked for that
-- and it cannot be undone, since the status only moves forward.
--
-- So the judgement is preserved where reviewers already read it - the
-- candidate's notes - and the candidacy itself is left exactly where it
-- stands. Whoever set the mark can now set the status deliberately.
--
-- `kind = 'system'`, so it is drawn as a fact rather than as somebody's
-- opinion, and it names the mark and nothing else.
-- ─────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────
-- 3. THE COLUMN, ITS INDEX AND ITS CONSTRAINT GO.
-- ─────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.applications_screening_mark_idx;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_screening_mark_check;

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS screening_mark;
