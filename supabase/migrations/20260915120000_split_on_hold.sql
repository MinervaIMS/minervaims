-- =====================================================================
-- "ON HOLD" BECOMES TWO, ONE ON EACH SIDE OF THE INTERVIEW.
-- ---------------------------------------------------------------------
-- The previous migration added a single `on_hold`, placed after
-- "Interview completed" with the other two internal statuses. That put
-- the whole of the triage on one side of the process, and left the
-- commonest pause with nowhere to go: a candidate whose CV has been read
-- and who is neither an obvious invitation nor an obvious refusal is
-- being held BEFORE the interview, not after it, and marking them with a
-- post-interview hold would have carried them past the interview stage
-- for good, since a status only ever moves forward.
--
-- So there are two, and where each sits is the whole point:
--
--   on_hold_pre_interview   between "Under review" and "To be invited".
--                           "To be invited" and everything after it are
--                           still ahead of it, so parking somebody here
--                           keeps the interview open. This is the state
--                           that could not exist before.
--
--   on_hold_post_interview  after "Interview completed", beside
--                           "Plausible offer" and "To be rejected",
--                           which is where the old `on_hold` stood.
--
-- NEITHER SENDS ANYTHING, exactly as before: no email, no confirmation,
-- nothing unlocked, and the candidate's own page reads both as the stage
-- they were already at.
--
-- WRITTEN AS A SECOND MIGRATION rather than by editing the first, so it
-- is correct whether or not the first has already run: if it has, the
-- remap below moves the rows; if it has not, the two run in order and
-- the remap finds nothing to do.
-- =====================================================================

-- 1. The constraint, with both holds and without the old single one.
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

-- 2. Anybody already sitting on the old value keeps the meaning they were
--    given. `on_hold` stood after the interview, so it becomes the
--    post-interview hold; nobody moves anywhere they were not already.
--    Done BEFORE the new constraint goes on, or the rows would fail it.
UPDATE public.applications
   SET status = 'on_hold_post_interview'
 WHERE status = 'on_hold';

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check CHECK (status IN (
    'received','cv_opened','under_review',
    -- Before the invitation: holding somebody here leaves every later
    -- stage, including the interview, still ahead of them.
    'on_hold_pre_interview',
    'to_be_contacted',
    'interview_invitation_sent','waiting_interview_confirmation',
    'interview_confirmed','interview_completed',
    -- After it: the three that record a decision not yet acted on.
    'on_hold_post_interview','plausible_offer','to_be_rejected',
    'accepted','rejected',
    'offer_accepted','offer_declined','joined','withdrawn'));
