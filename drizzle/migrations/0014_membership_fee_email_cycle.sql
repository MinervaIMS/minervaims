ALTER TABLE public.membership_fees ADD COLUMN receipt_due_at timestamptz, ADD COLUMN receipt_queued_at timestamptz, ADD COLUMN next_reminder_on date;
CREATE OR REPLACE FUNCTION public.fee_working_day_after(p_start date, p_days integer DEFAULT 4)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE d date := p_start; n integer := 0;
BEGIN
 IF p_start IS NULL OR p_days < 1 OR p_days > 366 THEN RAISE EXCEPTION 'Invalid working-day interval'; END IF;
 WHILE n < p_days LOOP
 d := d + 1;
 IF extract(isodow FROM d) < 6 AND public.italian_holiday_on(d) IS NULL THEN n := n + 1; END IF;
 END LOOP;
 RETURN d;
END;
$$;
CREATE OR REPLACE FUNCTION public.fee_email_vars(p_fee_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('first_name', m.first_name, 'semester_label', p.semester_label,
 'fee_amount', concat('EUR ', trim(to_char(coalesce(f.amount,p.fee_amount),'FM999999.00'))),
 'fee_deadline', to_char(CASE WHEN p.first_deadline < (now() AT TIME ZONE 'Europe/Rome')::date THEN coalesce(p.second_deadline,p.first_deadline) ELSE p.first_deadline END,'DD Mon YYYY'),
 'payment_method', coalesce(public.fee_payment_block(p.id),'See the Workspace for payment details.'),
 'status_url','https://minervaims.org/workspace/dashboard')
 FROM public.membership_fees f JOIN public.fee_periods p ON p.id=f.period_id JOIN public.members m ON m.id=f.member_id WHERE f.id=p_fee_id
$$;
CREATE OR REPLACE FUNCTION public.membership_fee_email_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient text; first_name text; eligible boolean; p public.fee_periods; today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
 SELECT * INTO p FROM public.fee_periods WHERE id=NEW.period_id;
 SELECT m.email,m.first_name, m.membership_status='active' AND m.role::text NOT IN ('candidate','pending','admin','alumni') AND NOT public.fee_exempt_role(m.role::text) AND lower(m.email)<>'as.minerva@unibocconi.it'
 INTO recipient,first_name,eligible FROM public.members m WHERE m.id=NEW.member_id;
 IF TG_OP='INSERT' THEN
 NEW.next_reminder_on := public.fee_working_day_after((p.created_at AT TIME ZONE 'Europe/Rome')::date,4);
 IF NEW.paid AND NOT p.closed THEN NEW.receipt_due_at := now(); END IF;
 ELSE
 IF NEW.paid AND NOT OLD.paid AND NOT p.closed THEN
 NEW.receipt_due_at := now(); NEW.receipt_queued_at := NULL;
 ELSIF NOT NEW.paid AND OLD.paid THEN
 NEW.receipt_due_at := NULL; NEW.receipt_queued_at := NULL;
 NEW.next_reminder_on := public.fee_working_day_after(today,4);
 END IF;
 END IF;
 IF eligible IS TRUE AND NEW.paid AND NEW.receipt_due_at <= now() AND NEW.receipt_queued_at IS NULL THEN
 IF NOT EXISTS (SELECT 1 FROM public.auto_email_templates WHERE key='ws_fee_payment_received' AND connected) THEN RAISE EXCEPTION 'Payment receipt template unavailable'; END IF;
 PERFORM public.enqueue_app_email('ws_fee_payment_received',recipient,jsonb_build_object('first_name',first_name,'semester_label',p.semester_label,'fee_amount',concat('EUR ',trim(to_char(coalesce(NEW.amount,p.fee_amount),'FM999999.00')))));
 NEW.receipt_queued_at := now();
 END IF;
 IF TG_OP='UPDATE' AND eligible IS TRUE AND NOT NEW.paid AND NOT p.closed AND NEW.reminder_sent_at IS DISTINCT FROM OLD.reminder_sent_at THEN
 PERFORM public.enqueue_app_email('ws_membership_reminder',recipient,public.fee_email_vars(NEW.id));
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER membership_fee_email_transition BEFORE INSERT OR UPDATE ON public.membership_fees FOR EACH ROW EXECUTE FUNCTION public.membership_fee_email_transition();
CREATE OR REPLACE FUNCTION public.process_fee_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; receipts integer := 0; today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
 UPDATE public.membership_fees f SET receipt_due_at=f.receipt_due_at
 WHERE f.paid AND f.receipt_due_at <= now() AND f.receipt_queued_at IS NULL;
 GET DIAGNOSTICS receipts = ROW_COUNT;
 IF extract(isodow FROM today) > 5 OR public.italian_holiday_on(today) IS NOT NULL THEN RETURN receipts; END IF;
 UPDATE public.membership_fees f SET reminder_sent_at = now(), next_reminder_on = public.fee_working_day_after(today,4)
 WHERE f.paid = false AND f.next_reminder_on <= today
 AND EXISTS (SELECT 1 FROM public.fee_periods p WHERE p.id=f.period_id AND p.closed=false)
 AND EXISTS (SELECT 1 FROM public.members m WHERE m.id=f.member_id AND m.email IS NOT NULL AND lower(m.email)<>'as.minerva@unibocconi.it'
 AND m.membership_status='active' AND m.role::text NOT IN ('candidate','pending','admin','alumni') AND NOT public.fee_exempt_role(m.role::text));
 GET DIAGNOSTICS n = ROW_COUNT;
 RETURN n + receipts;
END;
$$;
REVOKE ALL ON FUNCTION public.fee_email_vars(uuid), public.membership_fee_email_transition(), public.process_fee_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fee_email_vars(uuid), public.process_fee_reminders() TO service_role;
REVOKE ALL ON FUNCTION public.fee_working_day_after(date,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fee_working_day_after(date,integer) TO service_role;