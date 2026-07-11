-- =====================================================================
-- Offer → accept loop (report item 18, items 5/6/7/8)
-- ---------------------------------------------------------------------
-- New Joiners now SENDS AN OFFER instead of converting instantly. The
-- offer stores the intended role / division / fee choice and a 3-day
-- deadline. The candidate accepts or declines from their status page;
-- accepting converts them to a member immediately. A deadline job sends a
-- reminder after 2 days and expires the offer after 3.
--
-- Depends on 20260710123000_application_emails.sql (templates + the
-- enqueue_app_email helper + offer_sent_at / offer_reminder_sent_at /
-- offer_deadline columns).
-- =====================================================================

-- What the offer is for (used when the candidate accepts).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_role     text,
  ADD COLUMN IF NOT EXISTS offer_division public.org_division,
  ADD COLUMN IF NOT EXISTS offer_fee_due  boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------
-- Deadline processing: reminder at 2 days, expiry at 3. Runs from pg_cron
-- and enqueues emails directly through enqueue_app_email (no edge fn / HTTP).
-- An open offer is: status 'accepted' AND offer_sent_at IS NOT NULL
-- (an 'accepted' row with no offer_sent_at is an internal decision that the
-- candidate cannot see yet — report item 14).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Reminder: two days in, still open, not yet reminded.
  FOR r IN
    SELECT id, first_name, email, offer_deadline
    FROM public.applications
    WHERE status = 'accepted'
      AND offer_sent_at IS NOT NULL
      AND offer_reminder_sent_at IS NULL
      AND offer_deadline IS NOT NULL
      AND now() >= offer_sent_at + interval '2 days'
      AND now() < offer_deadline
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
    UPDATE public.applications SET offer_reminder_sent_at = now() WHERE id = r.id;
  END LOOP;

  -- Expiry: past the deadline, still not accepted.
  FOR r IN
    SELECT id, first_name, email
    FROM public.applications
    WHERE status = 'accepted'
      AND offer_sent_at IS NOT NULL
      AND offer_deadline IS NOT NULL
      AND now() >= offer_deadline
  LOOP
    UPDATE public.applications SET status = 'offer_declined' WHERE id = r.id;
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object('first_name', r.first_name));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;

-- Schedule hourly (a 2-/3-day window does not need finer granularity).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN PERFORM cron.unschedule('process_offer_deadlines'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule('process_offer_deadlines', '0 * * * *', $cron$SELECT public.process_offer_deadlines()$cron$);
  END IF;
END $$;
