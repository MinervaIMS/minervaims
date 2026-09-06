-- 1. Payment details on the fee collection.
ALTER TABLE public.fee_periods
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_account_holder text,
  ADD COLUMN IF NOT EXISTS payment_iban text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS opening_email_sent_at timestamptz;

-- 2. One-shot tracking.
ALTER TABLE public.membership_fees
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_email_sent_at timestamptz;

-- 3. Human-readable payment block used inside the fee emails.
CREATE OR REPLACE FUNCTION public.fee_payment_block(p_period_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT concat_ws('<br />',
      nullif(p.payment_method, ''),
      CASE WHEN nullif(p.payment_account_holder, '') IS NOT NULL THEN 'Account holder: ' || p.payment_account_holder END,
      CASE WHEN nullif(p.payment_iban, '') IS NOT NULL THEN 'IBAN: ' || p.payment_iban END,
      CASE WHEN nullif(p.payment_reference, '') IS NOT NULL THEN 'Reference: ' || p.payment_reference END,
      nullif(p.payment_notes, ''))
  FROM public.fee_periods p WHERE p.id = p_period_id
$$;

-- 4. Weekly "complete your profile" reminder: active members missing a phone
--    number or a profile photo, at most one email per member per week. The
--    timestamp is claimed atomically so a retried run cannot double-send.
CREATE OR REPLACE FUNCTION public.process_profile_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    UPDATE public.members m
       SET profile_email_sent_at = now()
     WHERE m.membership_status = 'active'
       AND m.account_status = 'approved'
       AND m.email IS NOT NULL
       AND m.role NOT IN ('candidate', 'pending', 'alumni', 'advisor', 'silent_advisor')
       AND (coalesce(m.phone, '') = '' OR coalesce(m.photo_url, '') = '')
       AND (m.profile_email_sent_at IS NULL OR m.profile_email_sent_at < now() - interval '6 days')
     RETURNING m.email, m.first_name
  LOOP
    PERFORM public.enqueue_app_email('ws_complete_profile', r.email,
      jsonb_build_object('first_name', r.first_name,
                         'status_url', 'https://minervaims.org/workspace/my-profile'));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- 5. Fee reminder after the first deadline: unpaid members of the open
--    collection, once per collection each.
CREATE OR REPLACE FUNCTION public.process_fee_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p record; r record; n integer := 0; pay text;
BEGIN
  SELECT * INTO p FROM public.fee_periods
   WHERE closed = false AND first_deadline IS NOT NULL AND first_deadline < current_date
   ORDER BY created_at DESC LIMIT 1;
  IF p.id IS NULL THEN RETURN 0; END IF;
  pay := public.fee_payment_block(p.id);

  FOR r IN
    UPDATE public.membership_fees f
       SET reminder_sent_at = now()
     WHERE f.period_id = p.id
       AND f.paid = false
       AND f.reminder_sent_at IS NULL
       AND EXISTS (SELECT 1 FROM public.members m
                    WHERE m.id = f.member_id AND m.email IS NOT NULL
                      AND m.membership_status = 'active')
     RETURNING f.member_id
  LOOP
    PERFORM public.enqueue_app_email('ws_membership_reminder',
      (SELECT email FROM public.members WHERE id = r.member_id),
      jsonb_build_object(
        'first_name', (SELECT first_name FROM public.members WHERE id = r.member_id),
        'semester_label', p.semester_label,
        'fee_amount', concat('EUR ', trim(to_char(p.fee_amount, 'FM999999.00'))),
        'fee_deadline', to_char(coalesce(p.second_deadline, p.first_deadline), 'DD Mon YYYY'),
        'payment_method', coalesce(pay, 'See the Workspace for payment details.'),
        'status_url', 'https://minervaims.org/workspace/dashboard'));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- 6. Schedules. Weekly for the profile reminder (Monday 09:00 Rome = 07:00
--    UTC in summer), daily for the fee reminder; both return immediately when
--    there is nothing to send.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process_profile_reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_profile_reminders');
    PERFORM cron.unschedule('process_fee_reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_fee_reminders');
    PERFORM cron.schedule('process_profile_reminders', '0 7 * * 1', $cron$SELECT public.process_profile_reminders()$cron$);
    PERFORM cron.schedule('process_fee_reminders', '0 8 * * *', $cron$SELECT public.process_fee_reminders()$cron$);
  END IF;
END $$;