CREATE OR REPLACE FUNCTION public.event_reminder_recipients(p_event_id uuid)
RETURNS TABLE (email text, first_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (lower(btrim(m.email)))
         btrim(m.email) AS email,
         coalesce(nullif(btrim(m.first_name), ''), 'member') AS first_name
    FROM public.members m
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.membership_status = 'active'
     AND m.role::text NOT IN ('member', 'advisor', 'silent_advisor')
     AND nullif(btrim(m.email), '') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.event_registrations r
        WHERE r.event_id = p_event_id
          AND (
            (m.user_id IS NOT NULL AND r.user_id = m.user_id)
            OR lower(btrim(r.email)) = lower(btrim(m.email))
            OR (p.email IS NOT NULL AND lower(btrim(r.email)) = lower(btrim(p.email)))
          )
     )
   ORDER BY lower(btrim(m.email)), m.created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.event_reminder_recipients(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_reminder_recipients(uuid) TO service_role;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_email_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_email_semester text;

CREATE OR REPLACE FUNCTION public.semester_key(p_day date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE
    WHEN extract(month FROM p_day) >= 9 THEN extract(year FROM p_day)::int || '-fall'
    WHEN extract(month FROM p_day) = 1 THEN (extract(year FROM p_day)::int - 1) || '-fall'
    ELSE extract(year FROM p_day)::int || '-spring'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.profile_missing_block(p_photo boolean, p_phone boolean, p_linkedin boolean)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE WHEN NOT (p_photo OR p_phone OR p_linkedin) THEN '' ELSE
    '<tr><td class="mims-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;">'
    || CASE WHEN p_photo THEN
         '<tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:34%;vertical-align:top;">Profile photo</td>'
         || '<td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">A professional headshot. It appears on the Members page of minervaims.org and next to your name in the Workspace.</td></tr>'
       ELSE '' END
    || CASE WHEN p_phone THEN
         '<tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:34%;vertical-align:top;">Phone number</td>'
         || '<td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">So that your Head of Division and the Board can reach you. It is visible only inside the Workspace.</td></tr>'
       ELSE '' END
    || CASE WHEN p_linkedin THEN
         '<tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:34%;vertical-align:top;">LinkedIn link<br />(recommended)</td>'
         || '<td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">The address of your LinkedIn profile, shown next to your photo on the Members page.</td></tr>'
       ELSE '' END
    || '</table></td></tr>'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.profile_photo_help_block()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT '<tr><td class="mims-pad" style="padding:0 40px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;"><tr><td style="padding:20px 18px;">'
    || '<p style="margin:0 0 10px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#1F0F4D;">Making your profile photo with the Career tools</p>'
    || '<p class="mims-body" style="margin:0 0 10px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#141414;">In the Workspace, open <a href="https://minervaims.org/workspace/career/linkedin" style="color:#1F0F4D;text-decoration:underline;">Career, LinkedIn</a> and find Profile Picture. You need an AI chat that can edit images.</p>'
    || '<p class="mims-body" style="margin:0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.8;color:#141414;">'
    || '1. Choose a square photo of yourself in formal clothes, facing the camera, in good light.<br />'
    || '2. Press Download the background (the Minerva background), then Copy prompt.<br />'
    || '3. In the AI chat, attach your photo first and the background second, paste the prompt and send it.<br />'
    || '4. Check that your face is exactly as in your photo.<br />'
    || '5. Upload the result in My Profile, from a computer.</p>'
    || '</td></tr></table></td></tr>';
$fn$;

CREATE OR REPLACE FUNCTION public.process_profile_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r   record;
  n   integer := 0;
  sem text := public.semester_key((now() AT TIME ZONE 'Europe/Rome')::date);
BEGIN
  IF extract(isodow FROM now() AT TIME ZONE 'Europe/Rome') <> 1
     OR extract(hour FROM now() AT TIME ZONE 'Europe/Rome') <> 9 THEN
    RETURN 0;
  END IF;
  FOR r IN
    UPDATE public.members m
       SET profile_email_sent_at = now(),
           profile_email_count = CASE WHEN m.profile_email_semester = sem THEN m.profile_email_count + 1 ELSE 1 END,
           profile_email_semester = sem
     WHERE m.membership_status = 'active'
       AND m.account_status = 'approved'
       AND nullif(btrim(m.email), '') IS NOT NULL
       AND m.role::text NOT IN ('candidate', 'pending', 'alumni', 'member', 'advisor', 'silent_advisor')
       AND (coalesce(btrim(m.phone), '') = '' OR coalesce(btrim(m.photo_url), '') = '')
       AND (m.profile_email_semester IS DISTINCT FROM sem OR m.profile_email_count < 2)
       AND (m.profile_email_sent_at IS NULL OR m.profile_email_sent_at < now() - interval '14 days')
     RETURNING m.email, m.first_name, m.phone, m.photo_url, m.linkedin_url
  LOOP
    PERFORM public.enqueue_app_email('ws_complete_profile', r.email, jsonb_build_object(
      'first_name', public.event_reminder_html(coalesce(nullif(btrim(r.first_name), ''), 'member')),
      'missing_block', public.profile_missing_block(
        coalesce(btrim(r.photo_url), '') = '', coalesce(btrim(r.phone), '') = '', coalesce(btrim(r.linkedin_url), '') = ''),
      'photo_help_block', CASE WHEN coalesce(btrim(r.photo_url), '') = '' THEN public.profile_photo_help_block() ELSE '' END,
      'status_url', 'https://minervaims.org/workspace/my-profile'));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_profile_reminder_test(p_to text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_first text;
BEGIN
  IF nullif(btrim(coalesce(p_to, '')), '') IS NULL THEN RETURN 0; END IF;
  SELECT nullif(btrim(m.first_name), '') INTO v_first
    FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_to)) LIMIT 1;
  v_first := coalesce(v_first, nullif(initcap(substring(split_part(split_part(btrim(p_to), '@', 1), '.', 1) FROM '^[A-Za-z]{3,}$')), ''), 'member');
  PERFORM public.enqueue_app_email('ws_complete_profile', btrim(p_to), jsonb_build_object(
    'first_name', public.event_reminder_html(v_first),
    'missing_block', public.profile_missing_block(true, true, true),
    'photo_help_block', public.profile_photo_help_block(),
    'status_url', 'https://minervaims.org/workspace/my-profile'));
  RETURN 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_profile_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_profile_reminder_test(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_profile_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_profile_reminder_test(text) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process_profile_reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_profile_reminders');
    PERFORM cron.schedule('process_profile_reminders', '0 7,8 * * 1', $cron$SELECT public.process_profile_reminders()$cron$);
  END IF;
END $$;