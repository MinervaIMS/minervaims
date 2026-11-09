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

DROP TRIGGER IF EXISTS membership_fee_a_exempt_guard ON public.membership_fees;
CREATE TRIGGER membership_fee_a_exempt_guard
  BEFORE INSERT OR UPDATE ON public.membership_fees
  FOR EACH ROW EXECUTE FUNCTION public.membership_fee_exempt_guard();