CREATE OR REPLACE FUNCTION public.fee_member_status(p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT coalesce(p_status IN ('active','on_exchange','one_semester_pause'),false)
$$;
REVOKE ALL ON FUNCTION public.fee_member_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fee_member_status(text) TO service_role;

CREATE OR REPLACE FUNCTION public.membership_fee_email_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient text; first_name text; eligible boolean; p public.fee_periods; today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
 SELECT * INTO p FROM public.fee_periods WHERE id=NEW.period_id;
 SELECT m.email,m.first_name, public.fee_member_status(m.membership_status) AND m.role::text NOT IN ('candidate','pending','admin','alumni') AND NOT public.fee_exempt_role(m.role::text) AND lower(m.email)<>'as.minerva@unibocconi.it'
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

CREATE OR REPLACE FUNCTION public.process_fee_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; receipts integer := 0; today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
 UPDATE public.membership_fees f SET receipt_due_at=f.receipt_due_at
 WHERE f.paid AND f.receipt_due_at <= now() AND f.receipt_queued_at IS NULL;
 GET DIAGNOSTICS receipts = ROW_COUNT;
 IF extract(isodow FROM today) > 5 OR public.italian_holiday_on(today) IS NOT NULL THEN RETURN receipts; END IF;
 UPDATE public.membership_fees f SET reminder_sent_at = now(), next_reminder_on = public.fee_working_day_after(today,4)
 WHERE f.paid = false AND NOT f.exempt AND f.next_reminder_on <= today
 AND EXISTS (SELECT 1 FROM public.fee_periods p WHERE p.id=f.period_id AND p.closed=false)
 AND EXISTS (SELECT 1 FROM public.members m WHERE m.id=f.member_id AND m.email IS NOT NULL AND lower(m.email)<>'as.minerva@unibocconi.it'
 AND public.fee_member_status(m.membership_status) AND m.role::text NOT IN ('candidate','pending','admin','alumni') AND NOT public.fee_exempt_role(m.role::text));
 GET DIAGNOSTICS n = ROW_COUNT;
 RETURN n + receipts;
END;
$$;

CREATE OR REPLACE FUNCTION public.members_join_open_fee_collections()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF public.fee_member_status(NEW.membership_status)
 AND NEW.role::text NOT IN ('candidate','pending','admin','alumni')
 AND NOT public.fee_exempt_role(NEW.role::text)
 AND lower(coalesce(NEW.email,'')) <> 'as.minerva@unibocconi.it' THEN
  INSERT INTO public.membership_fees (period_id,member_id,paid)
  SELECT p.id,NEW.id,false FROM public.fee_periods p WHERE NOT p.closed
  ON CONFLICT (period_id,member_id) DO NOTHING;
 END IF;
 RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.members_join_open_fee_collections() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER members_join_open_fee_collections
AFTER INSERT OR UPDATE OF membership_status, role ON public.members
FOR EACH ROW EXECUTE FUNCTION public.members_join_open_fee_collections();