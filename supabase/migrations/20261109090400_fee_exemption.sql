-- =====================================================================
-- THE PRESIDENT'S EXEMPTION FROM A FEE COLLECTION (Step 105).
-- ---------------------------------------------------------------------
-- In Operations > Membership Fees the President (and the association's
-- account) can exempt one person from the open collection: they owe
-- nothing, receive no reminder, see no fee deadline on the Calendar, and
-- when the collection closes they are NOT written into that semester's
-- member register. It is undone the same way while the collection is
-- open. The admin-fees function checks who may do it; this migration
-- only stores it and keeps the reminders away from it.
--
-- It is not `members.fee_status = 'exempt'`, which says a member does not
-- pay and still belongs to the semester's register. This is about one
-- collection, and keeps the person out of that semester.
--
-- 1. Four columns on membership_fees: exempt (false by default, so every
--    existing row is unchanged), who exempted, when, and a short note.
--    An exempt row is never a paid one (a check, which every existing row
--    satisfies because none is exempt).
-- 2. A guard that fires before Lovable's membership_fee_email_transition
--    (triggers of one table fire in the order of their names), which is
--    left exactly as it is: an exempt row has no next reminder, so
--    process_fee_reminders never selects it, and a reminder stamp put on
--    it by anything else is undone, so no reminder email is queued. Lifting
--    the exemption gives the row its next reminder four working days on,
--    as un-ticking a payment does.
--
-- Nothing existing is changed or deleted. Safe to run twice.
-- =====================================================================

ALTER TABLE public.membership_fees
  ADD COLUMN IF NOT EXISTS exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exempted_by uuid,
  ADD COLUMN IF NOT EXISTS exempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS exempt_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_fees_exempt_unpaid') THEN
    ALTER TABLE public.membership_fees
      ADD CONSTRAINT membership_fees_exempt_unpaid CHECK (NOT (exempt AND paid));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_fees_exempt_note_length') THEN
    ALTER TABLE public.membership_fees
      ADD CONSTRAINT membership_fees_exempt_note_length CHECK (exempt_note IS NULL OR char_length(exempt_note) <= 300);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.membership_fee_exempt_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
  IF NEW.exempt THEN
    NEW.next_reminder_on := NULL;
    IF TG_OP = 'UPDATE' THEN
      NEW.reminder_sent_at := OLD.reminder_sent_at;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.exempt AND NOT NEW.paid THEN
    NEW.next_reminder_on := public.fee_working_day_after(today, 4);
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.membership_fee_exempt_guard() FROM PUBLIC, anon, authenticated;

-- "membership_fee_a..." sorts before "membership_fee_email_transition".
DROP TRIGGER IF EXISTS membership_fee_a_exempt_guard ON public.membership_fees;
CREATE TRIGGER membership_fee_a_exempt_guard
  BEFORE INSERT OR UPDATE ON public.membership_fees
  FOR EACH ROW EXECUTE FUNCTION public.membership_fee_exempt_guard();
