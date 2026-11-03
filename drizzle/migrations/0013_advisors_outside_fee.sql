CREATE OR REPLACE FUNCTION public.fee_exempt_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_role IN ('advisor', 'silent_advisor'), false)
$$;

CREATE OR REPLACE FUNCTION public.members_fee_status_follows_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.fee_exempt_role(NEW.role::text) THEN
    NEW.fee_status := 'exempt';
  ELSIF TG_OP = 'UPDATE'
    AND public.fee_exempt_role(OLD.role::text)
    AND NEW.fee_status IS NOT DISTINCT FROM 'exempt' THEN
    NEW.fee_status := 'unpaid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_fee_status_follows_role ON public.members;
CREATE TRIGGER members_fee_status_follows_role
  BEFORE INSERT OR UPDATE OF role, fee_status ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_fee_status_follows_role();

CREATE OR REPLACE FUNCTION public.members_leave_open_fee_when_exempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fee_exempt_role(NEW.role::text) AND NOT public.fee_exempt_role(OLD.role::text) THEN
    DELETE FROM public.membership_fees mf
     USING public.fee_periods fp
     WHERE mf.member_id = NEW.id
       AND mf.period_id = fp.id
       AND fp.closed = false
       AND mf.paid = false;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS members_leave_open_fee_when_exempt ON public.members;
CREATE TRIGGER members_leave_open_fee_when_exempt
  AFTER UPDATE OF role ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_leave_open_fee_when_exempt();

CREATE OR REPLACE FUNCTION public.membership_fees_skip_exempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT coalesce(NEW.paid, false) AND EXISTS (
    SELECT 1 FROM public.members m
     WHERE m.id = NEW.member_id AND public.fee_exempt_role(m.role::text)
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS membership_fees_skip_exempt ON public.membership_fees;
CREATE TRIGGER membership_fees_skip_exempt
  BEFORE INSERT ON public.membership_fees
  FOR EACH ROW EXECUTE FUNCTION public.membership_fees_skip_exempt();

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
                      AND m.membership_status = 'active'
                      AND m.role::text NOT IN ('candidate', 'pending', 'admin', 'alumni')
                      AND NOT public.fee_exempt_role(m.role::text))
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

REVOKE ALL ON FUNCTION public.process_fee_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fee_reminders() TO service_role;
REVOKE ALL ON FUNCTION public.members_leave_open_fee_when_exempt() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.membership_fees_skip_exempt() FROM PUBLIC, anon, authenticated;