-- =====================================================================
-- "ON HOLD" BECOMES TWO, ONE ON EACH SIDE OF THE INTERVIEW.
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
--    given.
UPDATE public.applications
   SET status = 'on_hold_post_interview'
 WHERE status = 'on_hold';

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check CHECK (status IN (
    'received','cv_opened','under_review',
    'on_hold_pre_interview',
    'to_be_contacted',
    'interview_invitation_sent','waiting_interview_confirmation',
    'interview_confirmed','interview_completed',
    'on_hold_post_interview','plausible_offer','to_be_rejected',
    'accepted','rejected',
    'offer_accepted','offer_declined','joined','withdrawn'));