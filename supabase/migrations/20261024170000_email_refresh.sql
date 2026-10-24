-- =====================================================================
-- STEP 96. Every email in one layout ("less is more").
-- ---------------------------------------------------------------------
--   0. A copy of every stored template as it was, before anything changes
--      (auto_email_templates_step96_backup, made once).
--   1. Unsubscribing from the optional emails only: public.email_optouts
--      and auto_email_templates.optout_topic. The event registration
--      reminders and the thank-you note carry an unsubscribe link that
--      stops that kind of email, never what a member needs.
--   2. public.email_html_to_text: the plain-text part, written from the
--      HTML step for step as supabase/functions/_shared/email-text.ts.
--   3. enqueue_app_email and enqueue_staff_email, re-created as deployed
--      with three changes: the text part from email_html_to_text, the
--      sender name "Minerva IMS", and (app emails) the opt-out check. The
--      duplicate guard, the suppression list, the log and the idempotency
--      key are unchanged.
--   4. The blocks the database writes into emails (calendar, join, entry
--      code, cancel, description, profile, division reading), in the new
--      layout and identical to their code twins.
--   5. event_notice_enqueue, send_event_registration_reminder and
--      company_visit_enqueue, re-created as deployed with one change: the
--      description is written by event_description_block.
--      process_offer_deadlines, re-created as deployed with the division
--      and the deadline its reminder and expiry emails always lacked.
--   6. The 38 templates of transactional-emails.ts, as stored copies; the
--      eleven templates nothing sends are switched off (kept, not deleted).
--
-- Nothing is deleted. Safe to run twice: the backup is made once, the
-- tables and the column are created only if missing, and every function
-- and template is replaced by key.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The backup, once.
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.auto_email_templates_step96_backup') IS NULL THEN
    CREATE TABLE public.auto_email_templates_step96_backup AS
      SELECT t.*, now() AS backed_up_at FROM public.auto_email_templates t;
    ALTER TABLE public.auto_email_templates_step96_backup ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.auto_email_templates_step96_backup FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.auto_email_templates_step96_backup TO service_role;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- 1. Unsubscribing from the optional emails only.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_optouts (
  email      text NOT NULL CHECK (email = lower(email)),
  topic      text NOT NULL CHECK (topic IN ('events')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, topic)
);
ALTER TABLE public.email_optouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_optouts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.email_optouts TO service_role;

ALTER TABLE public.auto_email_templates ADD COLUMN IF NOT EXISTS optout_topic text;

-- ---------------------------------------------------------------------
-- 2. The plain-text part.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.email_html_to_text(p_html text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  s     text := coalesce(p_html, '');
  a_end text := chr(1);
  c_end text := chr(2);
  s_end text := chr(3);
  i     integer;
BEGIN
  i := strpos(s, '<body');
  IF i > 0 THEN
    s := substr(s, i);
    s := substr(s, strpos(s, '>') + 1);
  END IF;
  i := strpos(s, '</body>');
  IF i > 0 THEN s := substr(s, 1, i - 1); END IF;
  s := replace(s, '-->', c_end);
  s := regexp_replace(s, '<!--[^' || c_end || ']*' || c_end, '', 'g');
  s := replace(s, '</style>', s_end);
  s := regexp_replace(s, '<style[^>]*>[^' || s_end || ']*' || s_end, '', 'g');
  s := regexp_replace(s, '<div class="m-pre"[^>]*>[^<]*</div>', '', 'g');
  s := replace(s, '</a>', a_end);
  s := regexp_replace(s, '<a class="m-btn-a" href="([^"]*)"[^>]*>([^' || a_end || ']*)' || a_end, E'\n\\2: \\1\n', 'g');
  s := regexp_replace(s, '<a [^>]*href="mailto:([^"]*)"[^>]*>([^' || a_end || ']*)' || a_end, '\2 (\1)', 'g');
  s := regexp_replace(s, '<a [^>]*href="([^"]*)"[^>]*>([^' || a_end || ']*)' || a_end, '\2 (\1)', 'g');
  s := replace(s, a_end, '');
  s := regexp_replace(s, '([^ ' || chr(9) || chr(10) || '()]+) \(\1\)', '\1', 'g');
  s := regexp_replace(s, '<td class="m-kv-l[^"]*"[^>]*>([^<]*)</td>', '\1: ', 'g');
  s := replace(s, '</td>', ' ');
  s := regexp_replace(s, '<br[^>]*>', chr(10), 'g');
  s := regexp_replace(s, '</(p|h1|h2|h3|tr|li|div|table)>', chr(10), 'g');
  s := regexp_replace(s, '<[^>]+>', '', 'g');
  s := replace(s, '&nbsp;', ' ');
  s := replace(s, '&#8199;', '');
  s := replace(s, '&#65279;', '');
  s := replace(s, '&#847;', '');
  s := replace(s, '&zwnj;', '');
  s := replace(s, '&rsquo;', '''');
  s := replace(s, '&lsquo;', '''');
  s := replace(s, '&#39;', '''');
  s := replace(s, '&ldquo;', '"');
  s := replace(s, '&rdquo;', '"');
  s := replace(s, '&quot;', '"');
  s := replace(s, '&middot;', '·');
  s := replace(s, '&rarr;', '→');
  s := replace(s, '&times;', '×');
  s := replace(s, '&euro;', '€');
  s := replace(s, '&hellip;', '...');
  s := replace(s, '&ndash;', '-');
  s := replace(s, '&mdash;', '-');
  s := replace(s, '&#10003;', '✓');
  s := replace(s, '&copy;', '©');
  s := replace(s, '&lt;', '<');
  s := replace(s, '&gt;', '>');
  s := replace(s, '&amp;', '&');
  s := replace(s, chr(13), '');
  s := regexp_replace(s, '[ ' || chr(9) || chr(160) || ']+', ' ', 'g');
  s := regexp_replace(s, ' *' || chr(10) || ' *', chr(10), 'g');
  s := regexp_replace(s, chr(10) || '{3,}', chr(10) || chr(10), 'g');
  RETURN btrim(s, ' ' || chr(10) || chr(9));
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.email_html_to_text(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_html_to_text(text) TO service_role;

-- ---------------------------------------------------------------------
-- 3. The two queueing functions.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_app_email(p_key text, p_to text, p_vars jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  dedupe_key text;
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

  SELECT subject, body, connected, optout_topic INTO t FROM public.auto_email_templates WHERE key = eff_key;
  IF NOT FOUND OR t.connected IS NOT TRUE THEN RETURN; END IF;

  -- Step 96: an optional email (event reminders, thank-you notes) is not
  -- sent to an address that unsubscribed from that kind of email; the
  -- refusal is logged, as a suppression is.
  IF t.optout_topic IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.email_optouts WHERE email = norm_email AND topic = t.optout_topic) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, eff_key, p_to, 'suppressed', 'Recipient unsubscribed from ' || t.optout_topic || ' emails');
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = norm_email) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, eff_key, p_to, 'suppressed', 'Recipient is on the suppression list');
    RETURN;
  END IF;

  -- DUPLICATE GUARD. Concurrent callers used to read "not sent yet" within the
  -- same few milliseconds and each queue their own copy, so one recipient
  -- received the identical message two or three times. Any identical
  -- template/recipient pair already queued in the last five minutes is dropped.
  IF EXISTS (
    SELECT 1 FROM public.email_send_log
     WHERE template_name = eff_key
       AND lower(btrim(recipient_email)) = norm_email
       AND status <> 'duplicate'
       AND created_at > now() - interval '5 minutes'
  ) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (msg_id, eff_key, p_to, 'duplicate', 'Identical email already queued within the last 5 minutes');
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

  -- Deterministic idempotency key: template + recipient + five-minute bucket,
  -- so a retry that slips past the guard above is still collapsed downstream.
  dedupe_key := eff_key || ':' || norm_email || ':' ||
                to_char(to_timestamp(floor(extract(epoch FROM now()) / 300) * 300) AT TIME ZONE 'utc',
                        'YYYYMMDD"T"HH24MI');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', msg_id::text,
    'to', p_to,
    'from', 'Minerva IMS <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', body_html,
    'text', public.email_html_to_text(body_html),
    'purpose', 'transactional',
    'label', eff_key,
    'idempotency_key', dedupe_key,
    'unsubscribe_token', unsub,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_staff_email(p_key text, p_to text, p_vars jsonb DEFAULT '{}'::jsonb, p_dedupe text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'from', 'Minerva IMS <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', body_html,
    'text', public.email_html_to_text(body_html),
    'purpose', 'transactional',
    'label', p_key,
    'idempotency_key', dedupe_key,
    'unsubscribe_token', unsub,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$function$;

-- ---------------------------------------------------------------------
-- 4. The blocks.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.event_calendar_block(p_event text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_event IS NULL OR p_event !~ '^([0-9a-f-]{36}|sample)$' THEN ''
  ELSE replace($q3$<tr><td class="m-pad" style="padding:6px 40px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=sample" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Add to calendar</a></td></tr></table></td></tr><tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Or add it to <a class="m-link" href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=sample&amp;to=google" style="color:#1F0F4D;text-decoration:underline;">Google Calendar</a> or <a class="m-link" href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=sample&amp;to=outlook" style="color:#1F0F4D;text-decoration:underline;">Outlook on the web</a>.</p></td></tr>$q3$, '?e=sample', '?e=' || p_event)
  END;
$function$;

CREATE OR REPLACE FUNCTION public.event_join_block(p_place text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_place IS NULL OR btrim(p_place) !~* '^https?://[^\s<>"'']{3,}$' OR char_length(btrim(p_place)) > 2010 THEN ''
    ELSE replace(replace($q4$<tr><td class="m-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-box" style="background:#F5F5F5;padding:16px 18px;"><p class="m-ink" style="margin:0 0 8px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;"><strong>This event is online.</strong> Join from this link at the start time:</p><p class="m-ink" style="margin:0 0 8px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:17px;line-height:1.5;"><a class="m-link" href="§URL§" style="color:#1F0F4D;font-weight:700;text-decoration:underline;">§LABEL§&nbsp;&rarr;</a></p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#737373;word-break:break-all;">If the link does not open, copy this address: <a class="m-link" href="§URL§" style="color:#737373;text-decoration:underline;">§URL§</a></p></td></tr></table></td></tr>$q4$, '§LABEL§',
      CASE
        WHEN lower(p_place) LIKE '%teams.microsoft.com%' OR lower(p_place) LIKE '%teams.live.com%' THEN 'Join on Microsoft Teams'
        WHEN lower(p_place) LIKE '%zoom.us%' THEN 'Join on Zoom'
        WHEN lower(p_place) LIKE '%meet.google.com%' THEN 'Join on Google Meet'
        WHEN lower(p_place) LIKE '%webex.com%' THEN 'Join on Webex'
        ELSE 'Join the event'
      END), '§URL§', public.event_reminder_html(btrim(p_place)))
  END;
$function$;

CREATE OR REPLACE FUNCTION public.event_checkin_block(p_token text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_token IS NULL OR NOT (p_token ~ '^[a-f0-9]{32}$' OR p_token = 'sample') THEN ''
  ELSE replace($q5$<tr><td class="m-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-line" style="border:1px solid #E0E0E0;"><tr><td valign="middle" style="padding:14px;width:140px;"><img src="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/checkin-qr?t=§T§" width="140" height="140" alt="Your entry code" style="display:block;width:140px;height:140px;border:0;background:#FFFFFF;" /></td><td valign="middle" style="padding:14px 18px 14px 4px;"><p class="m-ink" style="margin:0 0 4px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.4;color:#141414;">Your entry code</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Show it at the entrance to be checked in.</p></td></tr></table></td></tr>$q5$, '§T§', p_token)
  END;
$function$;

CREATE OR REPLACE FUNCTION public.event_cancel_block(p_event text, p_token text, p_kind text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_event IS NULL OR p_event !~ '^([0-9a-f-]{36}|sample)$'
      OR p_token IS NULL OR p_token !~ '^([a-f0-9]{32}|sample)$' THEN ''
    ELSE replace(replace(CASE WHEN p_kind = 'waitlist' THEN $q6$<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">No longer able to come? <a class="m-link" href="https://minervaims.org/events/§E§/cancel?t=§T§" style="color:#1F0F4D;text-decoration:underline;">Leave the waiting list</a>.</p></td></tr>$q6$ ELSE $q7$<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Can&rsquo;t make it? <a class="m-link" href="https://minervaims.org/events/§E§/cancel?t=§T§" style="color:#1F0F4D;text-decoration:underline;">Cancel your registration</a> so that someone else can take your place.</p></td></tr>$q7$ END, '§E§', p_event), '§T§', p_token)
  END;
$function$;

-- New: the event's own description, as a paragraph (the three senders
-- below used to write it inline, in the old style).
CREATE OR REPLACE FUNCTION public.event_description_block(p_desc text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN nullif(btrim(coalesce(p_desc, '')), '') IS NULL THEN ''
  ELSE replace($q8$<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">§D§</p></td></tr>$q8$, '§D§', public.event_reminder_html(btrim(p_desc)))
  END;
$function$;
REVOKE EXECUTE ON FUNCTION public.event_description_block(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_description_block(text) TO service_role;

CREATE OR REPLACE FUNCTION public.profile_missing_block(p_photo boolean, p_phone boolean, p_linkedin boolean)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN NOT (p_photo OR p_phone OR p_linkedin) THEN '' ELSE
    $q9$<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">$q9$
    || CASE WHEN p_photo THEN $q0$<tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Profile photo</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">A professional headshot. It appears on the Members page of minervaims.org and next to your name in the Workspace.</td></tr>$q0$ ELSE '' END
    || CASE WHEN p_phone THEN $q1$<tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Phone number</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">So that your Head of Division and the Board can reach you. It is visible only inside the Workspace.</td></tr>$q1$ ELSE '' END
    || CASE WHEN p_linkedin THEN $q2$<tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">LinkedIn link<br />(recommended)</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">The address of your LinkedIn profile, shown next to your photo on the Members page.</td></tr>$q2$ ELSE '' END
    || $qa$</table></td></tr></table></td></tr>$qa$
  END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_photo_help_block()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT $qb$<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-box" style="background:#F5F5F5;padding:16px 18px;"><p class="m-ink" style="margin:0 0 8px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.4;color:#141414;">Making your profile photo with the Career tools</p><p class="m-ink" style="margin:0 0 8px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">In the Workspace, open <a class="m-link" href="https://minervaims.org/workspace/career/linkedin" style="color:#1F0F4D;text-decoration:underline;">Career, LinkedIn</a> and find Profile Picture. You need an AI chat that can edit images.</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">1. Choose a square photo of yourself in formal clothes, facing the camera, in good light.<br />2. Press Download the background (the Minerva background), then Copy prompt.<br />3. In the AI chat, attach your photo first and the background second, paste the prompt and send it.<br />4. Check that your face is exactly as in your photo.<br />5. Upload the result in My Profile, from a computer.</p></td></tr></table></td></tr>$qb$::text;
$function$;

CREATE OR REPLACE FUNCTION public.interview_division_reading(_division org_division)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _division IN ('equity', 'investment', 'macro', 'portfolio', 'quant') THEN replace($qc$We also strongly recommend reading your division&rsquo;s latest reports at <a class="m-link" href="https://minervaims.org/divisions/§D§" style="color:#1F0F4D;text-decoration:underline;">minervaims.org/divisions/§D§</a>.$qc$, '§D§', _division::text)
    ELSE $qd$We also recommend reading about the association, its divisions and the work of Media &amp; Communication and Operations at <a class="m-link" href="https://minervaims.org/about" style="color:#1F0F4D;text-decoration:underline;">minervaims.org/about</a>.$qd$
  END
$function$;

-- ---------------------------------------------------------------------
-- 5. The three senders that write the description.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.event_notice_enqueue(p_kind text, p_ev jsonb, p_to text, p_first text, p_checkin text DEFAULT NULL::text, p_cancel text DEFAULT NULL::text, p_position integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key    text;
  v_id     text := p_ev->>'id';
  v_start  timestamptz := nullif(p_ev->>'start_at', '')::timestamptz;
  v_end    timestamptz := nullif(p_ev->>'end_at', '')::timestamptz;
  v_date   date := nullif(p_ev->>'date', '')::date;
  v_online boolean := coalesce((p_ev->>'online')::boolean, false);
  v_desc   text := nullif(btrim(coalesce(p_ev->>'description', '')), '');
  v_ticket boolean := p_kind IN ('confirmation', 'waitlist_promoted');
  -- An online event's meeting link, in the box nobody can miss: only in
  -- the emails that confirm a place (the confirmation, and a place opened
  -- from the waiting list), never in the waiting-list or cancellation ones.
  v_join   text := CASE WHEN v_online
                        THEN public.event_join_block(coalesce(nullif(p_ev->>'join_url', ''), p_ev->>'place'))
                        ELSE '' END;
BEGIN
  v_key := CASE p_kind
    WHEN 'confirmation' THEN 'event_registration_confirmation'
    WHEN 'waitlist_joined' THEN 'event_waitlist_joined'
    WHEN 'waitlist_promoted' THEN 'event_waitlist_promoted'
    WHEN 'cancelled' THEN 'event_registration_cancelled'
  END;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Unknown event email %', p_kind; END IF;
  IF nullif(btrim(coalesce(p_to, '')), '') IS NULL THEN RETURN; END IF;

  PERFORM public.enqueue_app_email(v_key, btrim(p_to), jsonb_build_object(
    'first_name', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_first, '')), ''), 'there')),
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_ev->>'title', '')), ''), 'Minerva IMS event')),
    'event_date', coalesce(to_char(public.event_reminder_day(v_start, v_date), 'FMDay FMDD FMMonth YYYY'), 'To be confirmed'),
    'event_time', public.event_when_text(v_start, v_end),
    'event_location', public.event_reminder_html(CASE WHEN v_online AND v_ticket AND v_join <> '' THEN 'Online, link below'
                        WHEN v_online THEN 'Online'
                        ELSE coalesce(nullif(btrim(coalesce(p_ev->>'place', '')), ''), 'To be confirmed') END),
    'description_block', CASE WHEN v_desc IS NULL THEN ''
      ELSE public.event_description_block(v_desc) END,
    'register_url', CASE WHEN v_id = 'sample' THEN 'https://minervaims.org/events'
                         ELSE 'https://minervaims.org/events/' || v_id || '/register' END,
    'join_block', CASE WHEN v_ticket THEN v_join ELSE '' END,
    'checkin_block', CASE WHEN v_ticket AND NOT v_online THEN public.event_checkin_block(p_checkin) ELSE '' END,
    'calendar_block', CASE WHEN v_ticket THEN public.event_calendar_block(v_id) ELSE '' END,
    'cancel_block', CASE WHEN v_ticket THEN public.event_cancel_block(v_id, p_cancel, 'registration')
                         WHEN p_kind = 'waitlist_joined' THEN public.event_cancel_block(v_id, p_cancel, 'waitlist')
                         ELSE '' END,
    'waitlist_position', coalesce(p_position::text, '1')
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_event_registration_reminder(p_event_id uuid, p_stage text, p_test_to text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  e       RECORD;
  rcpt    RECORD;
  v_key   text;
  v_vars  jsonb;
  v_when  text;
  v_count integer := 0;
  v_first text;
  v_pres  text;
  v_join  text := '';
BEGIN
  IF p_stage NOT IN ('2w','1w','3d','24h_attending','thank_you') THEN
    RAISE EXCEPTION 'Unknown reminder stage %', p_stage;
  END IF;
  v_key := CASE WHEN p_stage = 'thank_you' THEN 'ws_event_thank_you'
                ELSE 'ws_event_reminder_' || p_stage END;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF p_stage = '24h_attending' AND coalesce(e.online, false) THEN
    v_join := public.event_join_block(coalesce(public.event_join_url(e.id), e.place));
  END IF;

  v_when := public.event_when_text(e.start_at, e.end_at);

  v_vars := jsonb_build_object(
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Minerva IMS event')),
    'event_date', to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'),
    'event_time', v_when,
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) AND v_join <> '' THEN 'Online, link below'
                                                      WHEN coalesce(e.online, false) THEN 'Online'
                                                      ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'register_url', 'https://minervaims.org/events/' || e.id::text || '/register',
    'join_block', v_join,
    'description_block', CASE WHEN nullif(btrim(e.description), '') IS NULL THEN ''
      ELSE public.event_description_block(btrim(e.description)) END
  );

  IF p_stage = 'thank_you' THEN
    SELECT nullif(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.surname, '')), '')
      INTO v_pres
      FROM public.members m
     WHERE m.role::text = 'president'
       AND m.membership_status = 'active'
       AND lower(coalesce(btrim(m.email), '')) <> 'as.minerva@unibocconi.it'
     ORDER BY m.created_at DESC
     LIMIT 1;
    v_vars := v_vars || jsonb_build_object(
      'president_name', public.event_reminder_html(coalesce(v_pres, 'The Board of Directors')),
      'signature_title', CASE WHEN v_pres IS NULL THEN '' ELSE 'President, on behalf of the Board of Directors' END);
  END IF;

  IF p_test_to IS NOT NULL THEN
    IF nullif(btrim(p_test_to), '') IS NULL THEN RETURN 0; END IF;
    SELECT nullif(btrim(m.first_name), '') INTO v_first
      FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_test_to)) LIMIT 1;
    v_first := coalesce(v_first, initcap(split_part(split_part(btrim(p_test_to), '@', 1), '.', 1)), 'member');
    PERFORM public.enqueue_app_email(v_key, btrim(p_test_to),
      v_vars || jsonb_build_object('first_name', public.event_reminder_html(v_first),
        'checkin_block', CASE WHEN p_stage = '24h_attending' AND NOT coalesce(e.online, false)
                              THEN public.event_checkin_block('sample') ELSE '' END,
        'cancel_block', CASE WHEN p_stage = '24h_attending' AND e.aod_day_id IS NULL AND NOT (e.event_type = 'company_visit' AND e.interest_closes_at IS NOT NULL)
                             THEN public.event_cancel_block(e.id::text, 'sample', 'registration') ELSE '' END));
    RETURN 1;
  END IF;

  IF p_stage = 'thank_you' THEN
    FOR rcpt IN SELECT * FROM public.event_thank_you_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
      v_count := v_count + 1;
    END LOOP;
  ELSIF p_stage = '24h_attending' THEN
    FOR rcpt IN SELECT * FROM public.event_attendance_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name),
          'checkin_block', CASE WHEN coalesce(e.online, false) THEN ''
                                ELSE public.event_checkin_block(rcpt.checkin_token) END,
          'cancel_block', CASE WHEN e.aod_day_id IS NULL AND NOT (e.event_type = 'company_visit' AND e.interest_closes_at IS NOT NULL)
                               THEN public.event_cancel_block(e.id::text, rcpt.cancel_token, 'registration') ELSE '' END));
      v_count := v_count + 1;
    END LOOP;
  ELSE
    FOR rcpt IN SELECT * FROM public.event_reminder_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name), 'join_block', ''));
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.company_visit_enqueue(p_kind text, p_event_id uuid, p_email text, p_first text, p_checkin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  e        RECORD;
  v_key    text;
  v_ticket boolean := p_kind IN ('invited', 'spot_opened');
  v_join   text := '';
  v_desc   text;
BEGIN
  v_key := CASE p_kind
    WHEN 'received' THEN 'company_visit_interest_received'
    WHEN 'invited' THEN 'company_visit_invited'
    WHEN 'not_selected' THEN 'company_visit_not_selected'
    WHEN 'spot_opened' THEN 'company_visit_spot_opened'
  END;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Unknown company visit email %', p_kind; END IF;
  IF nullif(btrim(coalesce(p_email, '')), '') IS NULL THEN RETURN; END IF;
  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_ticket AND coalesce(e.online, false) THEN
    v_join := public.event_join_block(coalesce(public.event_join_url(e.id), e.place));
  END IF;
  v_desc := nullif(btrim(coalesce(e.description, '')), '');

  PERFORM public.enqueue_app_email(v_key, btrim(p_email), jsonb_build_object(
    'first_name', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_first, '')), ''), 'there')),
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Company visit')),
    'event_date', coalesce(to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'), 'To be confirmed'),
    'event_time', public.event_when_text(e.start_at, e.end_at),
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) AND v_join <> '' THEN 'Online, link below'
                        WHEN coalesce(e.online, false) THEN 'Online'
                        ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'closes_at', CASE WHEN e.interest_closes_at IS NULL THEN 'the closing date'
                      ELSE to_char(e.interest_closes_at AT TIME ZONE 'Europe/Rome', 'FMDay FMDD FMMonth YYYY')
                           || ', ' || public.event_when_text(e.interest_closes_at, NULL) END,
    'description_block', CASE WHEN v_desc IS NULL OR p_kind <> 'received' THEN ''
      ELSE public.event_description_block(v_desc) END,
    'join_block', v_join,
    'checkin_block', CASE WHEN v_ticket AND NOT coalesce(e.online, false) AND p_checkin IS NOT NULL
                          THEN public.event_checkin_block(p_checkin) ELSE '' END,
    'calendar_block', CASE WHEN v_ticket THEN public.event_calendar_block(e.id::text) ELSE '' END
  ));
END;
$function$;

-- The hourly offer job, with the variables its two emails need.
CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RETURNING id, first_name, email, offer_deadline, offer_division
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY'),
      'division_name', coalesce(public.division_label(r.offer_division), ''),
      'acceptance_deadline', public.rome_stamp12(r.offer_deadline)
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
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', coalesce(public.division_label(r.offer_division), ''),
      'acceptance_deadline', public.rome_stamp12(r.offer_deadline)));

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
        'offer_deadline', public.rome_stamp12(r.offer_deadline)
      ), r.id::text || ':offer_expired');
    END LOOP;
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET interview_reminder_sent_at = now()
     WHERE status = 'interview_invitation_sent'
       AND interview_invited_at IS NOT NULL
       AND interview_reminder_sent_at IS NULL
       AND now() >= interview_invited_at + interval '24 hours'
       AND now() <  interview_invited_at + interval '3 days'
    RETURNING id, first_name, email, interview_division, interview_invited_at
  LOOP
    PERFORM public.enqueue_app_email('interview_booking_reminder_24h', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', public.intake_division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
      'division_reading', public.interview_division_reading(r.interview_division),
      'deadline', public.rome_stamp12(r.interview_invited_at + interval '3 days')
    ));
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET interview_reminder2_sent_at = now()
     WHERE status = 'interview_invitation_sent'
       AND interview_invited_at IS NOT NULL
       AND interview_reminder2_sent_at IS NULL
       AND interview_reminder_sent_at IS NOT NULL
       AND now() >= interview_reminder_sent_at + interval '12 hours'
       AND now() >= interview_invited_at + interval '48 hours'
       AND now() <  interview_invited_at + interval '3 days'
    RETURNING id, first_name, email, interview_division, interview_invited_at
  LOOP
    PERFORM public.enqueue_app_email('interview_booking_reminder_48h', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', public.intake_division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
      'division_reading', public.interview_division_reading(r.interview_division),
      'deadline', public.rome_stamp12(r.interview_invited_at + interval '3 days')
    ));
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------
-- 6. The templates.
-- ---------------------------------------------------------------------
INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('application_received', $qe$Application received$qe$, $qf$We have received your application | Minerva IMS$qf$, $qg$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>We have received your application | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application is under review. You will hear from us within 10 days.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your application is in</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for applying to Minerva Investment Management Society. Your application has arrived and is now under review.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Division</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{division_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Next step</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">The outcome of the CV screening, within 10 days at the latest</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/status" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Follow your application</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">There is nothing else to do for now. In the meantime, you are welcome to read our <a class="m-link" href="https://minervaims.org/archive" style="color:#1F0F4D;text-decoration:underline;">published research</a>.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qg$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('division_reassignment', $qh$Division reassignment$qh$, $qi$Update on your application | Minerva IMS$qi$, $qj$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Update on your application | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application is now with the {{to_division}} division. No action is needed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your application has moved division</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your application is now being assessed by the <strong>{{to_division}}</strong> division rather than {{from_division}}. Other profiles showed a stronger fit for {{from_division}}, and the committee believes yours may be a better match for {{to_division}}.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Now with</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{to_division}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Before</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{from_division}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Your part</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Nothing: the new division reviews the application you sent</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">An application can be assessed by no more than two divisions in each round, so any further move can only be back to {{from_division}}. We hope you will continue the selection with us.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/status" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Check your application</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qj$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('rejection_pre_interview', $qk$Rejection · pre-interview$qk$, $ql$An update on your application | Minerva IMS$ql$, $qm$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>An update on your application | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An update on your application to Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An update on your application</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you, sincerely, for applying to the <strong>{{division_name}}</strong> division and for the care you put into your application.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We received an exceptional number of strong applications, and on this occasion we are not able to take yours forward to the interview stage. This reflects the very limited number of places far more than your ability.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We would genuinely welcome a future application, and we hope you will apply again. We wish you every success in what comes next.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Our <a class="m-link" href="https://minervaims.org/archive" style="color:#1F0F4D;text-decoration:underline;">published research</a> and our <a class="m-link" href="https://minervaims.org/events" style="color:#1F0F4D;text-decoration:underline;">public events</a> are open to everyone, and a good place to keep building your profile.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">With our thanks and best wishes,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qm$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_invitation', $qn$Interview invitation$qn$, $qo$You are invited to interview | Minerva IMS$qo$, $qp$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>You are invited to interview | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations. Please choose your interview slot within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">You are invited to interview</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Congratulations: your application to the <strong>{{division_name}}</strong> division has passed the CV screening, and we would like to meet you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">What</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Interview, {{division_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Book by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{book_by}}<br /><span class="m-muted" style="color:#737373;font-size:14px;">72 hours from this email</span></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Online. The meeting link comes with your booking.</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/interview" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Choose your slot</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">To prepare, read the interview questions and our advice on the <a class="m-link" href="https://minervaims.org/join" style="color:#1F0F4D;text-decoration:underline;">Join page</a>. {{division_reading}}</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">You can cancel your slot up to 90 minutes before it begins, from the same page; we cannot always guarantee a new one. An interview may start 5 to 10 minutes late if the one before it overruns.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qp$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_reminder_24h', $qq$Interview booking reminder · 24h$qq$, $qr$Reminder: book your interview slot | Minerva IMS$qr$, $qs$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Reminder: book your interview slot | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interview slot is not booked yet. Please choose a time by {{deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">A reminder to book your interview</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">You were invited to interview for the <strong>{{division_name}}</strong> division about a day ago, and your slot is not booked yet.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Book by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Online. The meeting link comes with your booking.</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">If the deadline passes, we cannot guarantee a second invitation. The members who interview plan their schedules around these slots, so a prompt booking genuinely helps them.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/interview" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Choose your slot</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">None of the slots fits your commitments? Write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> explaining your circumstances; only motivated and exceptional cases can be considered.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">To prepare, read the interview questions and our advice on the <a class="m-link" href="https://minervaims.org/join" style="color:#1F0F4D;text-decoration:underline;">Join page</a>. {{division_reading}}</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">You can cancel your slot up to 90 minutes before it begins, from the same page; we cannot always guarantee a new one. An interview may start 5 to 10 minutes late if the one before it overruns.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qs$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_reminder_48h', $qt$Interview booking reminder · 48h$qt$, $qu$Second reminder: book your interview slot | Minerva IMS$qu$, $qv$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Second reminder: book your interview slot | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interview slot is still not booked, and the window closes on {{deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Second reminder: book your interview</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Two days have passed since you were invited to interview for the <strong>{{division_name}}</strong> division, and your slot is still not booked.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Book by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Online. The meeting link comes with your booking.</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">If the deadline passes, we cannot guarantee a second invitation. The members who interview plan their schedules around these slots, so a prompt booking genuinely helps them.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/interview" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Choose your slot</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">None of the slots fits your commitments? Write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> explaining your circumstances; only motivated and exceptional cases can be considered.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">To prepare, read the interview questions and our advice on the <a class="m-link" href="https://minervaims.org/join" style="color:#1F0F4D;text-decoration:underline;">Join page</a>. {{division_reading}}</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">You can cancel your slot up to 90 minutes before it begins, from the same page; we cannot always guarantee a new one. An interview may start 5 to 10 minutes late if the one before it overruns.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qv$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_confirmation', $qw$Interview booking confirmation$qw$, $qx$Your interview is confirmed | Minerva IMS$qx$, $qy$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your interview is confirmed | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{interview_date}}, {{interview_time}}. Your meeting link is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your interview is confirmed</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your interview for the <strong>{{division_name}}</strong> division is booked. We look forward to meeting you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{interview_date}}<br />{{interview_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Online: <a class="m-link" href="{{meeting_link}}" style="color:#1F0F4D;text-decoration:underline;">Join the interview&nbsp;&rarr;</a></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Division</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{division_name}}</td></tr></table></td></tr></table></td></tr>
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the link does not open, copy this address: <a class="m-link" href="{{meeting_link}}" style="color:#1F0F4D;text-decoration:underline;">{{meeting_link}}</a></p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">To prepare, read the interview questions and our advice on the <a class="m-link" href="https://minervaims.org/join" style="color:#1F0F4D;text-decoration:underline;">Join page</a>. {{division_reading}}</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Need to change it? <a class="m-link" href="{{status_url}}" style="color:#1F0F4D;text-decoration:underline;">Manage your booking</a>: you can cancel up to 90 minutes before it begins, though we cannot always guarantee a new slot. An interview may start 5 to 10 minutes late if the one before it overruns.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$qy$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_reminder_30m', $qz$Interview reminder · 30 minutes$qz$, $q10$Your interview begins in 30 minutes | Minerva IMS$q10$, $q11$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your interview begins in 30 minutes | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your {{division_name}} interview starts soon. The link is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your interview begins soon</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your <strong>{{division_name}}</strong> interview begins in about 30 minutes. We look forward to meeting you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{interview_date}}<br />{{interview_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Online</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{meeting_link}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Join the interview</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the button does not open, copy this address: <a class="m-link" href="{{meeting_link}}" style="color:#1F0F4D;text-decoration:underline;">{{meeting_link}}</a></p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">An interview may start 5 to 10 minutes late if the one before it overruns. Thank you for your patience.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q11$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('rejection_post_interview', $q12$Rejection · post-interview$q12$, $q13$An update on your application | Minerva IMS$q13$, $q14$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>An update on your application | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Thank you for interviewing with Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Thank you for interviewing with us</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for taking the time to interview with us, and for the genuine interest you showed in the <strong>{{division_name}}</strong> division. It was a real pleasure to meet you.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">After careful and difficult deliberation, we are not able to offer you a place on this occasion. With so many strong candidates and so few places, reaching the interview stage is itself an achievement to be proud of.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We would warmly welcome a future application, and we are happy to share advice on strengthening your profile. Do stay in touch on <a class="m-link" href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:underline;">LinkedIn</a>, and we hope to see you at our public events.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">With warm regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q14$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_to_join', $q15$Offer to join$q15$, $q16$Your offer to join Minerva IMS | Minerva IMS$q16$, $q17$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your offer to join Minerva IMS | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations. Please sign your offer within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Welcome to Minerva IMS</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Congratulations. Following your interview and a highly competitive selection, it is my pleasure, on behalf of the Society, to offer you a place in the <strong>{{division_name}}</strong> division as an analyst.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">You have been selected because we genuinely believe you have something to teach us. For us, that is the most important criterion of all.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Your role</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Analyst, {{division_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Sign by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{acceptance_deadline}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offer" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Sign your offer</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Sign in to the Minerva Workspace, sign your offer and complete your profile. Once we have your confirmation, we will welcome you into the community and give you access to our internal channels.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We are very much looking forward to working with you.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Warm regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">{{president_name}}</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">President, Minerva Investment Management Society</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q17$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('acceptance_received', $q18$Acceptance received$q18$, $q19$Welcome to the Society | Minerva IMS$q19$, $q1a$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Welcome to the Society | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">We have received your acceptance. One last step: complete your profile.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your place is confirmed</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you. We have received your acceptance of a place in the <strong>{{division_name}}</strong> division: welcome to Minerva Investment Management Society.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">One thing to do next: complete your profile in the Minerva Workspace. We will then be in touch with your onboarding details and access to our internal channels.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Complete your profile</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We are very glad to have you with us.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1a$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('acceptance_reminder', $q1b$Acceptance reminder$q1b$, $q1c$A gentle reminder: your offer | Minerva IMS$q1c$, $q1d$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>A gentle reminder: your offer | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your offer to join is still open until {{acceptance_deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">A gentle reminder about your offer</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your offer to join the <strong>{{division_name}}</strong> division is still open, but it expires soon.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Sign by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{acceptance_deadline}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offer" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Sign your offer</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Then complete your profile. If you have a question, or simply need a little more time, write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a>. We would love to have you on board.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1d$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_expired', $q1e$Offer expired$q1e$, $q1f$Your offer to join has expired | Minerva IMS$q1f$, $q1g$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your offer to join has expired | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">The offer to join the Society has now expired.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your offer has expired</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The offer to join the <strong>{{division_name}}</strong> division expired on {{acceptance_deadline}}. As we did not receive your acceptance in time, the place has now been released.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">If this was an oversight, or your circumstances have changed, please write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> as soon as possible. We cannot promise the place is still available, but we will do our best to help.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We would be glad to consider a future application, and you are always welcome at our public events.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">With our thanks and best wishes,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1g$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_withdrawn', $q1h$Offer withdrawn$q1h$, $q1i$An update on your offer | Minerva IMS$q1i$, $q1j$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>An update on your offer | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An update on your offer to join Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An update on your offer</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for the time and care you have given to Minerva IMS throughout the selection, and for your interest in the <strong>{{division_name}}</strong> division.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We are sorry to tell you that we have had to withdraw the offer to join that we made to you. It can no longer be accepted from the Workspace, and nothing is needed on your part. Being selected for an offer is itself an achievement, and this decision is not a judgement on the qualities that earned it.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">If you have a question about it, please write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a>. We would warmly welcome a future application, and we hope to see you at our public events.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">With warm regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1j$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('application_withdrawn', $q1k$Application withdrawn$q1k$, $q1l$Your application has been withdrawn | Minerva IMS$q1l$, $q1m$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your application has been withdrawn | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application has been withdrawn at your request. No further action is needed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your application has been withdrawn</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">This confirms that you have withdrawn your application to the <strong>{{division_name}}</strong> division. We have recorded your decision and your candidacy is now closed.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Only one application per person is accepted in each round, so you cannot apply again for the {{semester_label}} intake; you are very welcome to apply in a future round.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Did not mean to withdraw? Write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> as soon as possible.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1m$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_interview_booked', $q1n$Head of Division · interview slot booked$q1n$, $q1o$Interview slot booked: {{division_name}} | Minerva IMS$q1o$, $q1p$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Interview slot booked: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has booked one of your interview slots.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An interview slot has been booked</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{candidate_name}}</strong>, a candidate for the {{division_name}} division, has booked one of the interview slots you opened. It is no longer offered to other candidates.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Candidate</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Interview</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{interview_when}}</td></tr></table></td></tr></table></td></tr>
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">No action is needed unless the arrangements change; you will hear from us if the candidate releases or moves the slot. The whole calendar is in the <a class="m-link" href="https://minervaims.org/workspace/applications/interview-calendar" style="color:#1F0F4D;text-decoration:underline;">Interview Calendar</a>.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1p$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_interview_released', $q1q$Head of Division · interview slot released$q1q$, $q1r$Interview slot released: {{division_name}} | Minerva IMS$q1r$, $q1s$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Interview slot released: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has released one of your interview slots.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An interview slot has been released</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{candidate_name}}</strong>, a candidate for the {{division_name}} division, has cancelled their booking of one of the slots you opened. It is open again for the other candidates.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Candidate</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Slot released</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{interview_when}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/interview-calendar" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Open the Interview Calendar</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the candidate is moving to another time, a second notice with the new booking follows shortly. No action is needed.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1s$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_sent', $q1t$Head of Division · offer sent$q1t$, $q1u$Offer sent: {{division_name}} | Minerva IMS$q1u$, $q1v$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Offer sent: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An offer to join {{division_name}} has been sent to {{candidate_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An offer has been sent for your division</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">An offer to join the <strong>{{division_name}}</strong> division has been sent to {{candidate_name}}. The candidate has 72 hours to accept or decline, and you will hear the outcome as soon as it is recorded.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Candidate</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}, {{offer_role}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Reply by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{offer_deadline}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offers" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Open Offers</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">No action is needed from you at this stage.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1v$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_accepted', $q1w$Head of Division · offer accepted$q1w$, $q1x$Offer accepted: {{division_name}} | Minerva IMS$q1x$, $q1y$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Offer accepted: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has accepted the offer to join {{division_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An offer has been accepted</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{candidate_name}}</strong> has accepted the offer to join the {{division_name}} division. Their account is now a member account, with the Workspace sections their role allows.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">New joiner</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}, {{offer_role}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Division</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{division_name}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offers" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Open Offers</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Please make sure the new joiner is included in the division&rsquo;s onboarding.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1y$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_declined', $q1z$Head of Division · offer declined$q1z$, $q20$Offer declined: {{division_name}} | Minerva IMS$q20$, $q21$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Offer declined: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has declined the offer to join {{division_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An offer has been declined</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{candidate_name}}</strong> has declined the offer to join the {{division_name}} division. The candidacy is closed and the place remains unfilled; no further email goes to the candidate.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Candidate</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}, {{offer_role}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Division</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{division_name}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offers" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Open Offers</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the division wishes to offer the place to another candidate, a new offer is prepared in Offers.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q21$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_expired', $q22$Head of Division · offer expired$q22$, $q23$Offer expired: {{division_name}} | Minerva IMS$q23$, $q24$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Offer expired: {{division_name}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">The offer to {{candidate_name}} has expired without an answer.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">An offer has expired</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The offer to join the <strong>{{division_name}}</strong> division made to {{candidate_name}} has expired without an answer. The candidacy has been closed automatically and the place remains unfilled.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Candidate</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_name}}, {{offer_role}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Deadline passed</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{offer_deadline}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/offers" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Open Offers</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the division wishes to offer the place to another candidate, a new offer is prepared in Offers.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q24$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_complete_profile', $q25$Workspace · complete your profile$q25$, $q26$Your profile is missing a few details | Minerva IMS$q26$, $q27$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your profile is missing a few details | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your profile is missing a few details: here is what, and how to add them.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your profile is missing a few details</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your profile in the Minerva Workspace is what your colleagues see about you, and your photo appears on the public Members page of minervaims.org. It is still missing:</p></td></tr>
{{missing_block}}
{{photo_help_block}}
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Complete my profile</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">It takes a few minutes, from a computer. This reminder is sent at most twice a semester, at least two weeks apart, and stops as soon as your profile is complete.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q27$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_fee_collection', $q28$Workspace · fee collection$q28$, $q29$Membership fee for {{semester_label}} | Minerva IMS$q29$, $q2a$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Membership fee for {{semester_label}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{fee_amount}}, due by {{fee_deadline}}. Payment details inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your membership fee for {{semester_label}}</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The membership fee for <strong>{{semester_label}}</strong> is now being collected. It supports the Society&rsquo;s events, materials and running costs throughout the semester.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/dashboard" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Once your payment arrives, it is recorded and the Dashboard shows it as paid. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2a$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_membership_reminder', $q2b$Workspace · membership reminder$q2b$, $q2c$Reminder: membership fee still due | Minerva IMS$q2c$, $q2d$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Reminder: membership fee still due | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your membership fee for {{semester_label}} is still outstanding.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">A reminder about your membership fee</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">A friendly reminder that your membership fee for <strong>{{semester_label}}</strong> is still outstanding.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/dashboard" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Already paid? Thank you: it is recorded once the payment arrives. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2d$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_registration_confirmation', $q2e$Event registration confirmation$q2e$, $q2f$Your place is confirmed: {{event_title}} | Minerva IMS$q2f$, $q2g$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your place is confirmed: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{event_date}}, {{event_time}}. Your place is confirmed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your place is confirmed</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for registering for <strong>{{event_title}}</strong>. Your name is on the attendance list, and we look forward to seeing you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{join_block}}
{{checkin_block}}
{{calendar_block}}
{{description_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Please be there a few minutes early so that we can begin on time.</p></td></tr>
{{cancel_block}}
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2g$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_waitlist_promoted', $q2h$Event waiting list: a place for you$q2h$, $q2i$A place has opened up: {{event_title}} | Minerva IMS$q2i$, $q2j$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>A place has opened up: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">A place at {{event_title}} has opened up, and it is yours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">A place has opened up</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Good news: a place has opened up at <strong>{{event_title}}</strong>, and it is yours. You have moved from the waiting list to the attendance list, so there is nothing else to do.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{join_block}}
{{checkin_block}}
{{calendar_block}}
{{description_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Please be there a few minutes early so that we can begin on time.</p></td></tr>
{{cancel_block}}
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2j$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_waitlist_joined', $q2k$Event waiting list: joined$q2k$, $q2l$You are on the waiting list: {{event_title}} | Minerva IMS$q2l$, $q2m$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>You are on the waiting list: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{event_title}} is full. You are number {{waitlist_position}} on the waiting list.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">You are on the waiting list</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for your interest in <strong>{{event_title}}</strong>. The event is full at the moment, so you are on the waiting list. If a place opens up, it goes to the first person on the list, and we will email you at once with your entry code.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Your place</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Number {{waitlist_position}} on the list</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{description_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">There is nothing else to do for now: you will hear from us again only if a place becomes available for you.</p></td></tr>
{{cancel_block}}
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2m$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_registration_cancelled', $q2n$Event registration cancelled$q2n$, $q2o$Your registration is cancelled: {{event_title}} | Minerva IMS$q2o$, $q2p$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your registration is cancelled: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your registration for {{event_title}} is cancelled.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your registration is cancelled</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your registration for <strong>{{event_title}}</strong> has been cancelled, as you asked. Thank you for letting us know: your place can now go to someone else.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{register_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Register again</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Changed your mind? You can register again while places are available.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2p$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_2w', $q2q$Workspace · event reminder, 2 weeks before$q2q$, $q2r$Two weeks to go: {{event_title}} | Minerva IMS$q2r$, $q2s$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Two weeks to go: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Registration for {{event_title}} is open. Save your place.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Two weeks to go</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{event_title}}</strong> takes place in two weeks and registration is open. Your name is not on the list yet, so this is a reminder to save your place.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{description_block}}
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{register_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Register now</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">It takes a minute: sign in with your Minerva account and your details are filled in for you. If you registered in the last hour, please disregard this message.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:10px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">You receive these reminders as a member who has not registered yet. <a class="m-link" href="{{unsubscribe_url}}&amp;topic=events" style="color:#737373;text-decoration:underline;">Unsubscribe from these emails</a></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2s$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_1w', $q2t$Workspace · event reminder, 1 week before$q2t$, $q2u$One week to go: {{event_title}} | Minerva IMS$q2u$, $q2v$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>One week to go: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Registration for {{event_title}} is open. Save your place.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">One week to go</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{event_title}}</strong> takes place next week and registration is still open. If you plan to attend, please register so that we can prepare for the right number of people.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{description_block}}
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{register_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Register now</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">It takes a minute: sign in with your Minerva account and your details are filled in for you. If you registered in the last hour, please disregard this message.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:10px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">You receive these reminders as a member who has not registered yet. <a class="m-link" href="{{unsubscribe_url}}&amp;topic=events" style="color:#737373;text-decoration:underline;">Unsubscribe from these emails</a></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2v$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_3d', $q2w$Workspace · event reminder, 3 days before$q2w$, $q2x$Three days to go: {{event_title}} | Minerva IMS$q2x$, $q2y$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Three days to go: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Last reminder: registration for {{event_title}} is still open.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Three days to go</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{event_title}}</strong> takes place in three days and this is the last reminder. If you plan to attend, please register now.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{description_block}}
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{register_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Register now</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">It takes a minute: sign in with your Minerva account and your details are filled in for you. If you registered in the last hour, please disregard this message.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:10px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">You receive these reminders as a member who has not registered yet. <a class="m-link" href="{{unsubscribe_url}}&amp;topic=events" style="color:#737373;text-decoration:underline;">Unsubscribe from these emails</a></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q2y$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_24h_attending', $q2z$Workspace · event reminder, 24 hours before (registered)$q2z$, $q30$See you tomorrow: {{event_title}} | Minerva IMS$q30$, $q31$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>See you tomorrow: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Tomorrow, {{event_time}}: {{event_title}}. Your details are inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">See you tomorrow</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;"><strong>{{event_title}}</strong> takes place tomorrow and your name is on the list. We look forward to seeing you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{join_block}}
{{checkin_block}}
{{description_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Please be there a few minutes early so that we can begin on time.</p></td></tr>
{{cancel_block}}
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q31$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_thank_you', $q32$Workspace · event thank you, the day after (guests who attended)$q32$, $q33$Thank you for joining us | Minerva IMS$q33$, $q34$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Thank you for joining us | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Thank you for attending {{event_title}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Thank you for joining us</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for attending <strong>{{event_title}}</strong> on {{event_date}}. On behalf of the Board of Directors, thank you for your time and for the interest you showed in our work.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Minerva Investment Management Society is a student association at Bocconi University: our members research companies and markets, manage virtual portfolios and publish their analysis, and we open part of what we do to everyone through public events like this one.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/events" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See our upcoming events</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Follow our work: our <a class="m-link" href="https://minervaims.org/archive" style="color:#1F0F4D;text-decoration:underline;">published reports</a>, <a class="m-link" href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:underline;">LinkedIn</a> and <a class="m-link" href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:underline;">Instagram</a>.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Warm regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">{{president_name}}</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">{{signature_title}}</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:10px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">You receive this because you attended one of our events. <a class="m-link" href="{{unsubscribe_url}}&amp;topic=events" style="color:#737373;text-decoration:underline;">Unsubscribe from these emails</a></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q34$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_interest_received', $q35$Company visit: interest received$q35$, $q36$We have received your interest: {{event_title}} | Minerva IMS$q36$, $q37$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>We have received your interest: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interest in {{event_title}} has been received. The decision comes by email after the form closes.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">We have received your interest</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for registering your interest in <strong>{{event_title}}</strong>. Your request and your CV have arrived. Places are limited, so the President and the Vice President select the participants after the interest form closes, and everyone who asked hears the decision by email at the same time.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Interest closes</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{closes_at}}</td></tr></table></td></tr></table></td></tr>
{{description_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:8px 0 6px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;font-weight:700;">How participants are selected</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Participants are selected solely on their active participation in the Society&rsquo;s activities and their demonstrated interest in the topic of the visit, as the Society&rsquo;s own records show. Your CV does not count towards the selection.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Only the CVs of the members invited may be shared with the host company, and only if the host asks for them. All CVs are deleted automatically six months after the visit. You can replace your CV from the visit&rsquo;s page while the form is open.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">There is nothing else to do for now.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q37$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_invited', $q38$Company visit: invitation$q38$, $q39$You are invited: {{event_title}} | Minerva IMS$q39$, $q3a$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>You are invited: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">You have a place at {{event_title}}. Your entry code is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">You are invited</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We are pleased to invite you to <strong>{{event_title}}</strong>. You have been selected among the members who asked to take part, and your place is confirmed.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{join_block}}
{{checkin_block}}
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:8px 0 6px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;font-weight:700;">A commitment to the other members</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Places are limited and other members asked to come. Forfeiting your place and not attending is a severe offence towards the other interested members. If you can no longer attend, write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> as soon as possible, so that your place can go to a member on the reserve list.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the host company asks for them, we will send it the CVs of the members invited, yours included, for this visit only. Please arrive a few minutes early so that we can welcome you and begin on time.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q3a$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_not_selected', $q3b$Company visit: not selected this time$q3b$, $q3c$Your interest in {{event_title}} | Minerva IMS$q3c$, $q3d$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your interest in {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Not this time for {{event_title}}: you are on the reserve list.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Not this time</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for your interest in <strong>{{event_title}}</strong>. There were more requests than places, and this time you have not been selected.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">You remain on the reserve list: if a place opens up before the visit, we will write to you at once.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">The selection looks at participation in the Society&rsquo;s activities through the year and at interest in the topic of the visit. We hope to see you at our next events, and at the next company visit.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q3d$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_spot_opened', $q3e$Company visit: a place has opened up$q3e$, $q3f$A place has opened up: {{event_title}} | Minerva IMS$q3f$, $q3g$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>A place has opened up: {{event_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">A place has opened up at {{event_title}}, and it is yours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">A place has opened up</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Good news: a place has opened up at <strong>{{event_title}}</strong>, and it is yours. You were on the reserve list, and your place is now confirmed.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_date}}<br />{{event_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{event_location}}</td></tr></table></td></tr></table></td></tr>
{{join_block}}
{{checkin_block}}
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:8px 0 6px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;font-weight:700;">A commitment to the other members</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Places are limited and other members asked to come. Forfeiting your place and not attending is a severe offence towards the other interested members. If you can no longer attend, write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a> as soon as possible, so that your place can go to a member on the reserve list.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the host company asks for them, we will send it the CVs of the members invited, yours included, for this visit only. Please arrive a few minutes early so that we can welcome you and begin on time.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q3g$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('internal_form_receipt', $q3h$Form: answers received$q3h$, $q3i$Answers received: {{form_title}} | Minerva IMS$q3i$, $q3j$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Answers received: {{form_title}} | Minerva IMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:#1F0F4D;}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:23px!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:#0D0D0D!important;}
  .m-box{background:#262626!important;}
  .m-ink{color:#F2F2F2!important;}
  .m-muted{color:#A6A6A6!important;}
  .m-line{border-color:#333333!important;}
  .m-rule{border-color:#6F54DE!important;}
  .m-link,.m-ink a,.m-muted a{color:#A99ED6!important;}
  .m-btn,.m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:#F2F2F2!important;}
[data-ogsc] .m-muted{color:#A6A6A6!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:#A99ED6!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:#0D0D0D!important;}
[data-ogsb] .m-box{background:#262626!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:#6F54DE!important;border-color:#6F54DE!important;}
[data-ogsb] .m-rule{border-color:#6F54DE!important;}
[data-ogsb] .m-line{border-color:#333333!important;}
</style>
</head>
<body class="m-page" data-mims-layout="2" style="margin:0;padding:0;background:#FFFFFF;">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your answers to {{form_title}} have been received.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" style="padding:32px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;" /></div><!--<![endif]--></td><td valign="middle" class="m-ink" style="font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:17px;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva IMS</span></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:20px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#141414;">Your answers are in</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for answering <strong>{{form_title}}</strong>. This email is your receipt: it shows what you sent and what happens next.</p></td></tr>
{{summary_block}}
{{order_block}}
{{payment_block}}
{{answers_block}}
{{confirmation_block}}
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{form_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">View your answers</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q3j$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

-- The eleven templates nothing sends: kept, with their text, but switched
-- off (the backup above holds them as they were).
UPDATE public.auto_email_templates
   SET connected = false
 WHERE key IN ('newsletter_applications_open', 'newsletter_applications_closing', 'newsletter_public_event', 'general_communication', 'ws_role_assignment', 'ws_expulsion_alert', 'ws_expulsion', 'ws_deadline_overdue', 'ws_internal_event', 'ws_alumni_call', 'ws_association_on_display')
   AND connected IS DISTINCT FROM false;

DO $do$
DECLARE v_new int; v_off int; v_opt int;
BEGIN
  SELECT count(*) INTO v_new FROM public.auto_email_templates WHERE body LIKE '%data-mims-layout="2"%';
  SELECT count(*) INTO v_off FROM public.auto_email_templates WHERE key IN ('newsletter_applications_open', 'newsletter_applications_closing', 'newsletter_public_event', 'general_communication', 'ws_role_assignment', 'ws_expulsion_alert', 'ws_expulsion', 'ws_deadline_overdue', 'ws_internal_event', 'ws_alumni_call', 'ws_association_on_display') AND connected = false;
  SELECT count(*) INTO v_opt FROM public.auto_email_templates WHERE optout_topic = 'events';
  RAISE NOTICE 'Step 96: % templates in the new layout, % switched off, % with an unsubscribe link.', v_new, v_off, v_opt;
END
$do$;
