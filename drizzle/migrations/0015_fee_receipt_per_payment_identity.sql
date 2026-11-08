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
 PERFORM public.enqueue_staff_email('ws_fee_payment_received',recipient,jsonb_build_object('first_name',first_name,'semester_label',p.semester_label,'fee_amount',concat('EUR ',trim(to_char(coalesce(NEW.amount,p.fee_amount),'FM999999.00')))), 'fee:' || NEW.id::text || ':' || NEW.receipt_due_at::text);
 NEW.receipt_queued_at := now();
 END IF;
 IF TG_OP='UPDATE' AND eligible IS TRUE AND NOT NEW.paid AND NOT p.closed AND NEW.reminder_sent_at IS DISTINCT FROM OLD.reminder_sent_at THEN
 PERFORM public.enqueue_app_email('ws_membership_reminder',recipient,public.fee_email_vars(NEW.id));
 END IF;
 RETURN NEW;
END;
$$;