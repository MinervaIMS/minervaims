CREATE OR REPLACE FUNCTION public.enqueue_staff_email(
  p_key text,
  p_to text,
  p_vars jsonb DEFAULT '{}'::jsonb,
  p_dedupe text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  t          RECORD;
  subj       text;
  body_html  text;
  k          text;
  v          text;
  msg_id     uuid := gen_random_uuid();
  norm_email text;
  unsub      text;
  dedupe_key text;
  guard      text;
BEGIN
  IF p_to IS NULL OR p_to = '' THEN RETURN; END IF;
  norm_email := lower(btrim(p_to));
  guard := coalesce(nullif(btrim(p_dedupe), ''), 'none');

  SELECT subject, body, connected INTO t FROM public.auto_email_templates WHERE key = p_key;
  IF NOT FOUND OR t.connected IS NOT TRUE THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = norm_email) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, p_key, p_to, 'suppressed', 'Recipient is on the suppression list');
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.email_send_log
     WHERE template_name = p_key
       AND lower(btrim(recipient_email)) = norm_email
       AND status <> 'duplicate'
       AND coalesce(error_message, '') = 'ref:' || guard
       AND created_at > now() - interval '5 minutes'
  ) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, p_key, p_to, 'duplicate', 'Identical staff notice already queued within the last 5 minutes');
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

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
  VALUES (msg_id, p_key, p_to, 'pending', 'ref:' || guard);

  dedupe_key := p_key || ':' || norm_email || ':' || guard || ':' ||
                to_char(to_timestamp(floor(extract(epoch FROM now()) / 300) * 300) AT TIME ZONE 'utc',
                        'YYYYMMDD"T"HH24MI');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', msg_id::text,
    'to', p_to,
    'from', 'minervaims <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', body_html,
    'text', regexp_replace(regexp_replace(body_html, '<(script|style)[^>]*>[\s\S]*?</\1>', '', 'gi'), '<[^>]+>', '', 'g'),
    'purpose', 'transactional',
    'label', p_key,
    'idempotency_key', dedupe_key,
    'unsubscribe_token', unsub,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.enqueue_staff_email(text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_staff_email(text, text, jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.division_label(_division org_division)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $dl$
  SELECT CASE _division
    WHEN 'equity' THEN 'Equity Research'
    WHEN 'investment' THEN 'Investment Research'
    WHEN 'macro' THEN 'Macro Research'
    WHEN 'portfolio' THEN 'Portfolio Management'
    WHEN 'quant' THEN 'Quantitative Research'
    WHEN 'media' THEN 'Media & Communication'
    WHEN 'operations' THEN 'Operations'
    WHEN 'board' THEN 'Board'
    ELSE coalesce(_division::text, '')
  END
$dl$;

CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pod$
DECLARE
  r RECORD;
  s RECORD;
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
    RETURNING id, first_name, email, offer_deadline
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
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
    RETURNING id, first_name, surname, email, offer_deadline, offer_role, offer_division
  LOOP
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object('first_name', r.first_name));

    FOR s IN
      SELECT DISTINCT p.email, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'colleague') AS first_name
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
       WHERE p.email IS NOT NULL
         AND (
           ur.role = 'president'
           OR (ur.role IN ('head_of_division', 'head_of_operations', 'head_of_media')
               AND ur.division = r.offer_division)
         )
    LOOP
      PERFORM public.enqueue_staff_email('staff_offer_expired', s.email, jsonb_build_object(
        'first_name', s.first_name,
        'candidate_name', r.first_name || ' ' || r.surname,
        'division_name', public.division_label(r.offer_division),
        'offer_role', coalesce(replace(r.offer_role::text, '_', ' '), 'the role offered'),
        'offer_deadline', to_char(r.offer_deadline AT TIME ZONE 'Europe/Rome', 'DD Mon YYYY, HH24:MI')
      ), r.id::text || ':offer_expired');
    END LOOP;
  END LOOP;
END;
$pod$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;