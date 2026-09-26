-- =====================================================================
-- A FOURTH REMINDER: THE DAY BEFORE, TO THE PEOPLE ON THE LIST.
-- ---------------------------------------------------------------------
-- The three existing reminders (14, 7 and 3 days) chase members who have
-- NOT registered. Nobody reminded the people who had. This stage does
-- exactly that, 24 hours before, and is the mirror image of the others:
-- same job, same hours, same per-event stop, one row in the log so it
-- goes out once.
--
-- Its audience is the registration list itself, so external guests who
-- left an email are reminded too; a member registered through their
-- account but without an email on the row is reached by their member
-- address.
-- =====================================================================

-- 1. The register accepts the new stage.
ALTER TABLE public.event_reminder_log DROP CONSTRAINT IF EXISTS event_reminder_log_stage_check;
ALTER TABLE public.event_reminder_log
  ADD CONSTRAINT event_reminder_log_stage_check
  CHECK (stage IN ('2w','1w','3d','24h_attending'));

-- 2. Who is on the list. One row per address, whatever route put it there.
CREATE OR REPLACE FUNCTION public.event_attendance_recipients(p_event_id uuid)
RETURNS TABLE (email text, first_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT DISTINCT ON (lower(btrim(addr)))
         btrim(addr) AS email,
         coalesce(nullif(btrim(fname), ''), 'member') AS first_name
    FROM (
      SELECT coalesce(nullif(btrim(r.email), ''), nullif(btrim(m.email), '')) AS addr,
             coalesce(nullif(split_part(btrim(r.name), ' ', 1), ''), m.first_name) AS fname,
             r.registered_at
        FROM public.event_registrations r
        LEFT JOIN public.members m ON m.user_id = r.user_id
       WHERE r.event_id = p_event_id
    ) s
   WHERE addr IS NOT NULL
     AND addr LIKE '%@%'
   ORDER BY lower(btrim(addr)), registered_at;
$fn$;

-- 3. The sender learns the stage. Everything else is unchanged; only the
--    audience differs, so the same variables serve both emails.
CREATE OR REPLACE FUNCTION public.send_event_registration_reminder(
  p_event_id uuid, p_stage text, p_test_to text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  e       RECORD;
  rcpt    RECORD;
  v_key   text;
  v_vars  jsonb;
  v_when  text;
  v_count integer := 0;
  v_first text;
BEGIN
  IF p_stage NOT IN ('2w','1w','3d','24h_attending') THEN
    RAISE EXCEPTION 'Unknown reminder stage %', p_stage;
  END IF;
  v_key := 'ws_event_reminder_' || p_stage;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_when := CASE
    WHEN e.start_at IS NULL THEN 'To be confirmed'
    WHEN e.end_at IS NULL THEN to_char(e.start_at AT TIME ZONE 'Europe/Rome', 'HH24:MI')
    ELSE to_char(e.start_at AT TIME ZONE 'Europe/Rome', 'HH24:MI') || ' to '
         || to_char(e.end_at AT TIME ZONE 'Europe/Rome', 'HH24:MI')
  END;

  v_vars := jsonb_build_object(
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Minerva IMS event')),
    'event_date', to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'),
    'event_time', v_when,
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) THEN 'Online'
                                                      ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'register_url', 'https://minervaims.org/events/' || e.id::text || '/register',
    'description_block', CASE WHEN nullif(btrim(e.description), '') IS NULL THEN ''
      ELSE '<tr><td style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">'
           || public.event_reminder_html(btrim(e.description)) || '</p></td></tr>' END
  );

  IF p_test_to IS NOT NULL THEN
    IF nullif(btrim(p_test_to), '') IS NULL THEN RETURN 0; END IF;
    SELECT nullif(btrim(m.first_name), '') INTO v_first
      FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_test_to)) LIMIT 1;
    v_first := coalesce(v_first, initcap(split_part(split_part(btrim(p_test_to), '@', 1), '.', 1)), 'member');
    PERFORM public.enqueue_app_email(v_key, btrim(p_test_to),
      v_vars || jsonb_build_object('first_name', public.event_reminder_html(v_first)));
    RETURN 1;
  END IF;

  IF p_stage = '24h_attending' THEN
    FOR rcpt IN SELECT * FROM public.event_attendance_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
      v_count := v_count + 1;
    END LOOP;
  ELSE
    FOR rcpt IN SELECT * FROM public.event_reminder_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$fn$;

-- 4. The job. The three chasing stages keep their grace day; the new one
--    is due on the day before the event and on that day only, because a
--    note saying "tomorrow" is wrong the morning of the event itself.
CREATE OR REPLACE FUNCTION public.process_event_registration_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_now_rome timestamp := now() AT TIME ZONE 'Europe/Rome';
  v_today    date := (now() AT TIME ZONE 'Europe/Rome')::date;
  due        RECORD;
  v_sent     integer;
BEGIN
  IF extract(hour FROM v_now_rome) < 9 OR extract(hour FROM v_now_rome) >= 21 THEN
    RETURN 0;
  END IF;

  SELECT ev.id, s.stage, s.days
    INTO due
    FROM public.events ev
    CROSS JOIN (VALUES ('2w', 14), ('1w', 7), ('3d', 3), ('24h_attending', 1)) AS s(stage, days)
   WHERE ev.registration_enabled = true
     AND ev.reminders_paused = false
     AND ev.aod_day_id IS NULL
     AND (ev.start_at IS NULL OR ev.start_at > now())
     AND (
       (s.stage <> '24h_attending'
         AND public.event_reminder_day(ev.start_at, ev.date) - v_today BETWEEN s.days - 1 AND s.days)
       OR (s.stage = '24h_attending'
         AND public.event_reminder_day(ev.start_at, ev.date) - v_today = 1)
     )
     AND NOT EXISTS (SELECT 1 FROM public.event_reminder_log l WHERE l.event_id = ev.id AND l.stage = s.stage)
   ORDER BY public.event_reminder_day(ev.start_at, ev.date) - v_today - s.days, ev.start_at NULLS LAST, ev.id
   LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  INSERT INTO public.event_reminder_log (event_id, stage) VALUES (due.id, due.stage)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_sent := public.send_event_registration_reminder(due.id, due.stage);
  UPDATE public.event_reminder_log SET recipients = v_sent WHERE event_id = due.id AND stage = due.stage;
  RETURN v_sent;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.event_attendance_recipients(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_attendance_recipients(uuid) TO service_role;

-- 5. The email itself. Its real home is
--    supabase/functions/_shared/transactional-emails.ts; it is stored
--    here because the send path reads subject and body from this table.
INSERT INTO public.auto_email_templates
  (key, name, description, subject, body, connected, trigger_description, recipient_description, schedule_description)
VALUES (
  'ws_event_reminder_24h_attending',
  'Workspace · event reminder, 24 hours before (registered)',
  'Sent 24 hours before an event to everyone already on its registration list, as a reminder to attend.',
  'Tomorrow: attendance reminder | Minerva IMS',
  $html$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Attendance reminder: {{event_title}} | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Tomorrow: {{event_title}} &mdash; you are registered.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Attendance reminder</td></tr>
          <tr>
            <td class="mims-pad" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img src="https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></td>
                  <td style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">See you tomorrow</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;"><strong>{{event_title}}</strong> takes place tomorrow and your name is on the list. The details are set out below; we look forward to seeing you there.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">You receive this reminder because you are registered for this event. If your plans have changed and you can no longer attend, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a> so that your place can be offered to another member.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/events" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Event details</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Operations Team</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minervaims" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
              <p class="mims-xsmall" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p class="mims-xsmall" style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p class="mims-xsmall" style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p class="mims-xsmall" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  true,
  'Registration Forms: an event with registration enabled whose reminders are not stopped.',
  'Everyone on the event''s registration list with an email address, members and external guests alike.',
  'Twenty-four hours before the event, between 09:00 and 21:00 Rome time.'
)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
       description = coalesce(public.auto_email_templates.description, EXCLUDED.description),
       trigger_description = coalesce(public.auto_email_templates.trigger_description, EXCLUDED.trigger_description),
       recipient_description = coalesce(public.auto_email_templates.recipient_description, EXCLUDED.recipient_description),
       schedule_description = coalesce(public.auto_email_templates.schedule_description, EXCLUDED.schedule_description);