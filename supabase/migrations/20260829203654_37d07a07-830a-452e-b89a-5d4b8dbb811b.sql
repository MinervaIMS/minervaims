CREATE OR REPLACE FUNCTION public.enqueue_app_email(p_key text, p_to text, p_vars jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t          RECORD;
  subj       text;
  body_html  text;
  k          text;
  v          text;
  msg_id     uuid := gen_random_uuid();
  norm_email text;
  unsub      text;
  eff_key    text;
BEGIN
  IF p_to IS NULL OR p_to = '' THEN RETURN; END IF;
  norm_email := lower(btrim(p_to));

  -- Legacy trigger keys kept as aliases of the branded templates.
  eff_key := CASE p_key
    WHEN 'rejection_no_interview' THEN 'rejection_pre_interview'
    WHEN 'rejection_after_interview' THEN 'rejection_post_interview'
    WHEN 'offer_accepted_confirmation' THEN 'acceptance_received'
    WHEN 'offer_reminder' THEN 'acceptance_reminder'
    ELSE p_key
  END;

  SELECT subject, body, connected INTO t FROM public.auto_email_templates WHERE key = eff_key;
  IF NOT FOUND OR t.connected IS NOT TRUE THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = norm_email) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, eff_key, p_to, 'suppressed', 'Recipient is on the suppression list');
    RETURN;
  END IF;

  subj := coalesce(t.subject, 'Minerva IMS');
  body_html := coalesce(t.body, '');
  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_vars) LOOP
    subj := replace(subj, '{{' || k || '}}', v);
    body_html := replace(body_html, '{{' || k || '}}', v);
  END LOOP;
  subj := regexp_replace(subj, '\{\{[a-z_]+\}\}', '', 'g');

  SELECT token INTO unsub
    FROM public.email_unsubscribe_tokens
   WHERE email = norm_email AND used_at IS NULL
   LIMIT 1;

  IF unsub IS NULL THEN
    unsub := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.email_unsubscribe_tokens (token, email)
    VALUES (unsub, norm_email)
    ON CONFLICT (email) DO NOTHING;
    SELECT token INTO unsub FROM public.email_unsubscribe_tokens WHERE email = norm_email LIMIT 1;
  END IF;

  body_html := replace(body_html, '{{unsubscribe_url}}',
    'https://minervaims.org/unsubscribe?token=' || unsub);
  body_html := regexp_replace(body_html, '\{\{[a-z_]+\}\}', '', 'g');

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status)
  VALUES (msg_id, eff_key, p_to, 'pending');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', msg_id::text,
    'to', p_to,
    'from', 'minervaims <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', body_html,
    'text', regexp_replace(regexp_replace(body_html, '<(script|style)[^>]*>[\s\S]*?</\1>', '', 'gi'), '<[^>]+>', '', 'g'),
    'purpose', 'transactional',
    'label', eff_key,
    'idempotency_key', eff_key || ':' || msg_id::text,
    'unsubscribe_token', unsub,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    UPDATE public.applications
       SET offer_reminder_sent_at = now()
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_reminder_sent_at IS NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_sent_at + interval '2 days'
       AND now() < offer_deadline
    RETURNING id, first_name, email, offer_deadline, offer_division, interview_division, first_choice
  LOOP
    PERFORM public.enqueue_app_email('acceptance_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', CASE coalesce(r.offer_division, r.interview_division, r.first_choice)
        WHEN 'equity' THEN 'Equity Research'
        WHEN 'investment' THEN 'Investment Research'
        WHEN 'macro' THEN 'Macro Research'
        WHEN 'portfolio' THEN 'Portfolio Management'
        WHEN 'quant' THEN 'Quantitative Research'
        WHEN 'media' THEN 'Media & Communication'
        WHEN 'operations' THEN 'Operations'
        ELSE '' END,
      'acceptance_deadline', to_char(r.offer_deadline, 'DD Mon YYYY'),
      'status_url', 'https://minervaims.org/workspace',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET status = 'offer_declined'
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_deadline
    RETURNING id, first_name, email, offer_deadline, offer_division, interview_division, first_choice
  LOOP
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', CASE coalesce(r.offer_division, r.interview_division, r.first_choice)
        WHEN 'equity' THEN 'Equity Research'
        WHEN 'investment' THEN 'Investment Research'
        WHEN 'macro' THEN 'Macro Research'
        WHEN 'portfolio' THEN 'Portfolio Management'
        WHEN 'quant' THEN 'Quantitative Research'
        WHEN 'media' THEN 'Media & Communication'
        WHEN 'operations' THEN 'Operations'
        ELSE '' END,
      'acceptance_deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;