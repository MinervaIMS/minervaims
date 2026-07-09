-- =====================================================================
-- Interview Calendar — division-scoped interview slot booking, integrated
-- into the Applications pipeline.
-- ---------------------------------------------------------------------
-- Model:
--   • Heads of Division (and roles above them) OPEN interview slots for
--     their division; Team Leaders may VIEW who booked but not open.
--   • A candidate is INVITED to interview for exactly one division by a
--     reviewer moving their candidacy to 'interview_invitation_sent'.
--     That division is recorded on the application (interview_division).
--   • The invited candidate books one of the open slots for that division
--     only. Booking is tied to their account/application — no re-entering
--     name/email, no separate privacy page.
--
-- Security (mirrors report 10.3): slot availability carries no PII and is
-- readable by authenticated users so an invited candidate can see it. All
-- booking PII lives in interview_bookings, which candidates can read ONLY
-- for their own row. Every write and every staff read goes through the
-- admin-interviews edge function (service role), scoped by division.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Record the division a candidate was invited to interview for.
-- ---------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_division public.org_division;


-- ---------------------------------------------------------------------
-- 2. Interview slots (opened by examiners; one calendar per division).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interview_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division      public.org_division NOT NULL,
  slot_date     date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  meeting_link  text,
  examiner_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  examiner_name text,
  is_active     boolean NOT NULL DEFAULT true,
  is_booked     boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Two examiners may hold the same time; one examiner cannot double-book it.
  UNIQUE (division, slot_date, start_time, examiner_id)
);

CREATE INDEX IF NOT EXISTS interview_slots_division_date_idx
  ON public.interview_slots (division, slot_date);

DROP TRIGGER IF EXISTS update_interview_slots_updated_at ON public.interview_slots;
CREATE TRIGGER update_interview_slots_updated_at
  BEFORE UPDATE ON public.interview_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- 3. Interview bookings (one per slot, one per application).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interview_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id           uuid NOT NULL REFERENCES public.interview_slots(id) ON DELETE CASCADE,
  application_id    uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate_name    text NOT NULL,
  candidate_email   text NOT NULL,
  division          public.org_division NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id),          -- a slot holds at most one candidate
  UNIQUE (application_id)    -- a candidate holds at most one interview
);


-- ---------------------------------------------------------------------
-- 4. Keep interview_slots.is_booked in sync with bookings.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_interview_slot_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.interview_slots SET is_booked = true WHERE id = NEW.slot_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.interview_slots SET is_booked = false WHERE id = OLD.slot_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS interview_booking_insert ON public.interview_bookings;
CREATE TRIGGER interview_booking_insert
  AFTER INSERT ON public.interview_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_interview_slot_booked();

DROP TRIGGER IF EXISTS interview_booking_delete ON public.interview_bookings;
CREATE TRIGGER interview_booking_delete
  AFTER DELETE ON public.interview_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_interview_slot_booked();


-- ---------------------------------------------------------------------
-- 5. Row-level security.
-- ---------------------------------------------------------------------
ALTER TABLE public.interview_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;

-- Slots carry no personal data; any authenticated user may read active
-- slots so an invited candidate can see availability. (Division scoping of
-- what a candidate is *shown* / may book is enforced in the edge function.)
DROP POLICY IF EXISTS "read active interview slots" ON public.interview_slots;
CREATE POLICY "read active interview slots"
  ON public.interview_slots FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Booking PII: a candidate may read only their own booking (meeting link /
-- confirmation). Staff read bookings exclusively via the edge function.
DROP POLICY IF EXISTS "candidate reads own interview booking" ON public.interview_bookings;
CREATE POLICY "candidate reads own interview booking"
  ON public.interview_bookings FOR SELECT
  TO authenticated
  USING (candidate_user_id = auth.uid());

GRANT SELECT ON public.interview_slots    TO authenticated;
GRANT SELECT ON public.interview_bookings TO authenticated;
GRANT ALL    ON public.interview_slots    TO service_role;
GRANT ALL    ON public.interview_bookings TO service_role;
