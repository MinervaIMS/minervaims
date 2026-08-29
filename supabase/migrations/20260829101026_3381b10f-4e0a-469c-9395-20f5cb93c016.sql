-- 1. Fix app-email enqueue: no fabricated run_id, add idempotency key,
--    unsubscribe token and suppression check.
CREATE OR REPLACE FUNCTION public.enqueue_app_email(p_key text, p_to text, p_vars jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t          RECORD;
  subj       text;
  inner_body text;
  k          text;
  v          text;
  html       text;
  msg_id     uuid := gen_random_uuid();
  norm_email text;
  unsub      text;
BEGIN
  IF p_to IS NULL OR p_to = '' THEN RETURN; END IF;
  norm_email := lower(btrim(p_to));

  SELECT subject, body, connected INTO t FROM public.auto_email_templates WHERE key = p_key;
  IF NOT FOUND OR t.connected IS NOT TRUE THEN RETURN; END IF;

  -- Never send to a suppressed address (bounce, complaint or unsubscribe).
  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = norm_email) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, p_key, p_to, 'suppressed', 'Recipient is on the suppression list');
    RETURN;
  END IF;

  subj := coalesce(t.subject, 'Minerva IMS');
  inner_body := coalesce(t.body, '');
  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_vars) LOOP
    subj := replace(subj, '{{' || k || '}}', v);
    inner_body := replace(inner_body, '{{' || k || '}}', v);
  END LOOP;
  subj := regexp_replace(subj, '\{\{[a-z_]+\}\}', '', 'g');
  inner_body := regexp_replace(inner_body, '\{\{[a-z_]+\}\}', '', 'g');

  -- One unsubscribe token per address; reuse an unused one.
  SELECT token INTO unsub
    FROM public.email_unsubscribe_tokens
   WHERE email = norm_email AND used_at IS NULL
   LIMIT 1;

  IF unsub IS NULL THEN
    unsub := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.email_unsubscribe_tokens (token, email)
    VALUES (unsub, norm_email)
    ON CONFLICT (email) DO NOTHING;
    SELECT token INTO unsub FROM public.email_unsubscribe_tokens WHERE email = norm_email LIMIT 1;
  END IF;

  inner_body := replace(inner_body, '{{unsubscribe_url}}',
    'https://minervaims.org/unsubscribe?token=' || unsub);

  html :=
    '<div style="background:#f4f4f5;padding:24px 0;font-family:Georgia,''Times New Roman'',serif;color:#18181b;">'
    || '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">'
    || '<div style="background:#28185a;color:#ffffff;padding:18px 28px;font-size:18px;letter-spacing:.3px;">Minerva Investment Management Society</div>'
    || '<div style="padding:28px;font-size:15px;line-height:1.6;">' || inner_body || '</div>'
    || '<div style="padding:16px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">'
    || 'Minerva Investment Management Society · Bocconi University · <a href="https://minervaims.org" style="color:#28185a;">minervaims.org</a></div>'
    || '</div></div>';
  html := replace(html, 'class="btn"',
    'style="display:inline-block;background:#28185a;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:14px;"');

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status)
  VALUES (msg_id, p_key, p_to, 'pending');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', msg_id::text,
    'to', p_to,
    'from', 'minervaims <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', html,
    'text', regexp_replace(inner_body, '<[^>]+>', '', 'g'),
    'purpose', 'transactional',
    'label', p_key,
    'idempotency_key', p_key || ':' || msg_id::text,
    'unsubscribe_token', unsub,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) TO service_role;

-- 2. Offer deadline job: claim each row atomically, so an accepted offer can
--    never receive a reminder or an expiry notice, and overlapping runs cannot
--    double-send.
CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Reminder: only for offers still outstanding ('accepted' means the offer is
  -- live and unanswered). The claiming UPDATE is the guard: if the candidate
  -- accepted (status 'joined') or declined in the meantime, no row is returned
  -- and no email is enqueued.
  FOR r IN
    UPDATE public.applications
       SET offer_reminder_sent_at = now()
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_reminder_sent_at IS NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_sent_at + interval '2 days'
       AND now() < offer_deadline
    RETURNING id, first_name, email, offer_deadline
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
  END LOOP;

  -- Expiry: the status flip itself is the claim. Only rows this statement moved
  -- from 'accepted' to 'offer_declined' get the notice.
  FOR r IN
    UPDATE public.applications
       SET status = 'offer_declined'
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_deadline
    RETURNING id, first_name, email
  LOOP
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object('first_name', r.first_name));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;