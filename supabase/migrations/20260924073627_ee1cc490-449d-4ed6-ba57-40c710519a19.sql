-- lovable-cron-fallback-reviewed: time-based reminders at 14/7/3 days; one event-stage per run to avoid the 5-minute duplicate guard, so a 10-minute cadence is required by the spec
-- =====================================================================
-- REGISTRATION REMINDERS: TWO WEEKS, ONE WEEK AND THREE DAYS BEFORE.
-- ---------------------------------------------------------------------
-- An event whose registration form is open sends every active member who
-- has NOT registered yet a reminder at three moments before it: 14, 7
-- and 3 days before the event day (Europe/Rome). Whoever is on the list
-- at the moment of sending is left out, so a member who registers after
-- the first reminder never receives the second.
--
-- STOPPING. Registration Forms has a button, next to Preview, that stops
-- the reminders of one event (for instance when the room is full). It
-- sets events.reminders_paused; the sender skips paused events, and a
-- reminder whose moment passes while it is stopped is not sent later.
--
-- ONE EVENT AND ONE STAGE PER RUN. enqueue_app_email drops an identical
-- template and recipient pair queued within five minutes, which is right
-- for retries but would silently drop the second of two events reminded
-- in the same run. The job therefore runs every ten minutes and sends one
-- (event, stage) each time: two events due the same day go out ten
-- minutes apart and both arrive. Sending is limited to 09:00 to 21:00
-- Rome time, and a stage still goes out on the following day if its own
-- day was missed, never later.
--
-- NOTHING EXISTING CHANGES. New columns default to "not paused"; the new
-- table, templates and functions are only read by the new job and by the
-- new admin-event-reminders edge function.
-- =====================================================================

-- 1. The per-event stop, and who pressed it.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reminders_paused    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminders_paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. What has been sent. The primary key is what makes a stage go out
--    once: the row is written before the emails are queued.
CREATE TABLE IF NOT EXISTS public.event_reminder_log (
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  stage       text NOT NULL CHECK (stage IN ('2w','1w','3d')),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  recipients  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, stage)
);
ALTER TABLE public.event_reminder_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_reminder_log FROM anon, authenticated;
GRANT ALL ON public.event_reminder_log TO service_role;

-- 3. The three emails. The real home of these bodies is
--    supabase/functions/_shared/transactional-emails.ts; they are seeded
--    here, exactly as the Auto emails page stores them, because the send
--    path reads this table and sends nothing for a key with no row.
INSERT INTO public.auto_email_templates
  (key, name, description, subject, body, connected, trigger_description, recipient_description, schedule_description)
VALUES (
  'ws_event_reminder_2w',
  'Workspace · event reminder, 2 weeks before',
  'Sent 14 days before an event with an open registration form, to every active member who has not registered yet.',
  'Two weeks to go: event registration reminder | Minerva IMS',
  $html$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Registration reminder: {{event_title}} | Minerva IMS</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Two weeks to go: register for {{event_title}}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Registration reminder</td></tr>
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
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Two weeks to go</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;"><strong>{{event_title}}</strong> takes place in two weeks and registration is open. Your name is not on the list yet, so this is a reminder to save your place. The details are set out below.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Registering takes a minute: sign in with your Minerva account and your details are filled in for you. You receive this reminder as a member of the Society because you have not registered yet; members who are already on the list do not receive it. If you registered in the last hour, please disregard this message.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="{{register_url}}" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Register now</a></td></tr></table></td></tr>
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
  'Active members with an email address who are not on the event''s registration list at the moment of sending.',
  'Two weeks before the event, between 09:00 and 21:00 Rome time.'
)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
       description = coalesce(public.auto_email_templates.description, EXCLUDED.description),
       trigger_description = coalesce(public.auto_email_templates.trigger_description, EXCLUDED.trigger_description),
       recipient_description = coalesce(public.auto_email_templates.recipient_description, EXCLUDED.recipient_description),
       schedule_description = coalesce(public.auto_email_templates.schedule_description, EXCLUDED.schedule_description);

INSERT INTO public.auto_email_templates
  (key, name, description, subject, body, connected, trigger_description, recipient_description, schedule_description)
VALUES (
  'ws_event_reminder_1w',
  'Workspace · event reminder, 1 week before',
  'Sent 7 days before an event with an open registration form, to every active member who has not registered yet.',
  'One week to go: event registration reminder | Minerva IMS',
  $html$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Registration reminder: {{event_title}} | Minerva IMS</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">One week to go: register for {{event_title}}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Registration reminder</td></tr>
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
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">One week to go</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;"><strong>{{event_title}}</strong> takes place next week and registration is still open. Your name is not on the list yet: if you plan to attend, please register so that we can prepare for the right number of people. The details are set out below.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Registering takes a minute: sign in with your Minerva account and your details are filled in for you. You receive this reminder as a member of the Society because you have not registered yet; members who are already on the list do not receive it. If you registered in the last hour, please disregard this message.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="{{register_url}}" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Register now</a></td></tr></table></td></tr>
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
  'Active members with an email address who are not on the event''s registration list at the moment of sending.',
  'One week before the event, between 09:00 and 21:00 Rome time.'
)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
       description = coalesce(public.auto_email_templates.description, EXCLUDED.description),
       trigger_description = coalesce(public.auto_email_templates.trigger_description, EXCLUDED.trigger_description),
       recipient_description = coalesce(public.auto_email_templates.recipient_description, EXCLUDED.recipient_description),
       schedule_description = coalesce(public.auto_email_templates.schedule_description, EXCLUDED.schedule_description);

INSERT INTO public.auto_email_templates
  (key, name, description, subject, body, connected, trigger_description, recipient_description, schedule_description)
VALUES (
  'ws_event_reminder_3d',
  'Workspace · event reminder, 3 days before',
  'Sent 3 days before an event with an open registration form, to every active member who has not registered yet.',
  'Three days to go: event registration reminder | Minerva IMS',
  $html$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Registration reminder: {{event_title}} | Minerva IMS</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Three days to go: register for {{event_title}}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Registration reminder</td></tr>
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
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Three days to go</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;"><strong>{{event_title}}</strong> takes place in three days and this is the last reminder. Your name is not on the list yet: if you plan to attend, please register now. The details are set out below.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Registering takes a minute: sign in with your Minerva account and your details are filled in for you. You receive this reminder as a member of the Society because you have not registered yet; members who are already on the list do not receive it. If you registered in the last hour, please disregard this message.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="{{register_url}}" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Register now</a></td></tr></table></td></tr>
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
  'Active members with an email address who are not on the event''s registration list at the moment of sending.',
  'Three days before the event, between 09:00 and 21:00 Rome time.'
)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
       description = coalesce(public.auto_email_templates.description, EXCLUDED.description),
       trigger_description = coalesce(public.auto_email_templates.trigger_description, EXCLUDED.trigger_description),
       recipient_description = coalesce(public.auto_email_templates.recipient_description, EXCLUDED.recipient_description),
       schedule_description = coalesce(public.auto_email_templates.schedule_description, EXCLUDED.schedule_description);

-- 4. Helpers. Template variables are replaced into the HTML as they are,
--    so anything typed by a person (a title, a place, a description) is
--    escaped before it gets there.
CREATE OR REPLACE FUNCTION public.event_reminder_html(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- The event's day as people in Milan read it.
CREATE OR REPLACE FUNCTION public.event_reminder_day(p_start_at timestamptz, p_date date)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((p_start_at AT TIME ZONE 'Europe/Rome')::date, p_date);
$$;

-- Active members who are not on the event's list right now. A member is
-- on the list when a registration carries their account, the email in
-- their member record, or the email they sign in with.
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
     AND m.role::text <> 'advisor'
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

-- 5. Sending one stage of one event. With p_test_to the email goes to that
--    single address only, is not written in the log and does not use up
--    the stage: that is the test the Registration Forms page offers.
CREATE OR REPLACE FUNCTION public.send_event_registration_reminder(
  p_event_id uuid, p_stage text, p_test_to text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e       RECORD;
  rcpt    RECORD;
  v_key   text;
  v_vars  jsonb;
  v_when  text;
  v_count integer := 0;
  v_first text;
BEGIN
  IF p_stage NOT IN ('2w','1w','3d') THEN
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

  FOR rcpt IN SELECT * FROM public.event_reminder_recipients(p_event_id) LOOP
    PERFORM public.enqueue_app_email(v_key, rcpt.email,
      v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6. The job. Finds the one (event, stage) most overdue, claims it in the
--    log, and sends it. Returns how many reminders were queued.
CREATE OR REPLACE FUNCTION public.process_event_registration_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CROSS JOIN (VALUES ('2w', 14), ('1w', 7), ('3d', 3)) AS s(stage, days)
   WHERE ev.registration_enabled = true
     AND ev.reminders_paused = false
     AND ev.aod_day_id IS NULL
     AND (ev.start_at IS NULL OR ev.start_at > now())
     AND public.event_reminder_day(ev.start_at, ev.date) - v_today BETWEEN s.days - 1 AND s.days
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
$$;

REVOKE EXECUTE ON FUNCTION public.event_reminder_recipients(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_event_registration_reminder(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_event_registration_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_reminder_recipients(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_event_registration_reminder(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_event_registration_reminders() TO service_role;

-- 7. Every ten minutes (see ONE EVENT AND ONE STAGE PER RUN above).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN PERFORM cron.unschedule('process_event_registration_reminders'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule('process_event_registration_reminders', '*/10 * * * *',
      $cron$SELECT public.process_event_registration_reminders()$cron$);
  END IF;
END $$;
