-- =====================================================================
-- STEP 106. The three membership fee emails, as transactional-emails.ts
-- writes them (AGENTS.md: the code is the source; the database sends its
-- stored copy, so the copy is brought in line here).
-- ---------------------------------------------------------------------
-- What changes in each of them (the opening of a collection, the
-- reminder, the receipt of a payment):
--   * they say that members on a semester of leave or on exchange are
--     also expected to pay the fee;
--   * "See your fee status" opens the member's own fee, on My Profile,
--     Membership (?show=fee), instead of the Dashboard.
--
-- Only the subject and the body of these three rows change. Whether a
-- template is switched on, its unsubscribe topic and every other
-- template are left as they are. A row that is missing is created
-- switched on, because recording a payment needs the receipt template
-- (membership_fee_email_transition). Safe to run twice: the second run
-- finds nothing different and changes nothing.
--
-- BACKUP FIRST. The three stored copies can be edited in the workspace,
-- so each is copied as it stands into auto_email_templates_backup
-- (reason 'step106') before it is changed. A second run keeps that first
-- copy. To put one back:
--   UPDATE public.auto_email_templates t SET subject = b.subject, body = b.body
--     FROM public.auto_email_templates_backup b
--    WHERE b.reason = 'step106' AND b.key = t.key AND t.key = '<key>';
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.auto_email_templates_backup (
  key      text NOT NULL,
  name     text,
  subject  text,
  body     text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  reason   text NOT NULL,
  PRIMARY KEY (key, reason)
);
ALTER TABLE public.auto_email_templates_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auto_email_templates_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.auto_email_templates_backup TO service_role;

INSERT INTO public.auto_email_templates_backup (key, name, subject, body, reason)
SELECT key, name, subject, body, 'step106'
  FROM public.auto_email_templates
 WHERE key IN ('ws_fee_collection', 'ws_membership_reminder', 'ws_fee_payment_received')
ON CONFLICT (key, reason) DO NOTHING;

-- ws_fee_collection
INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic, trigger_description, recipient_description, schedule_description)
VALUES ('ws_fee_collection', $f106_0$Workspace · fee collection$f106_0$, $f106_1$Membership fee for {{semester_label}} | Minerva IMS$f106_1$, $f106_2$<!DOCTYPE html>
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
  .m-h1{font-size:25px!important;}
  .m-sc{font-size:11px!important;letter-spacing:.1em!important;}
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
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your membership fee for {{semester_label}}</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The membership fee for <strong>{{semester_label}}</strong> is now being collected. It supports the Society&rsquo;s events, materials and running costs throughout the semester.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Members on a semester of leave or on exchange are also expected to pay the fee.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile/membership?show=fee" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Once your payment arrives, it is recorded and your fee status in My Profile shows it as paid. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$f106_2$, true, NULL, $f106_3$A fee collection is opened (Operations, Membership Fees).$f106_3$, $f106_4$Every member who pays the fee, including members on a semester of leave or on exchange.$f106_4$, $f106_5$Once, when the collection opens.$f106_5$)
ON CONFLICT (key) DO UPDATE
   SET subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = now()
 WHERE public.auto_email_templates.subject IS DISTINCT FROM EXCLUDED.subject
    OR public.auto_email_templates.body IS DISTINCT FROM EXCLUDED.body;

-- ws_membership_reminder
INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic, trigger_description, recipient_description, schedule_description)
VALUES ('ws_membership_reminder', $f106_6$Workspace · membership reminder$f106_6$, $f106_7$Reminder: membership fee still due | Minerva IMS$f106_7$, $f106_8$<!DOCTYPE html>
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
  .m-h1{font-size:25px!important;}
  .m-sc{font-size:11px!important;letter-spacing:.1em!important;}
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
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A reminder about your membership fee</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">A friendly reminder that your membership fee for <strong>{{semester_label}}</strong> is still outstanding.</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Members on a semester of leave or on exchange are also expected to pay the fee.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile/membership?show=fee" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If, and only if, you are sure you paid within the last 24 hours, please allow for a delay in recording your payment. We will sort it out on our side soon. Thank you. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$f106_8$, true, NULL, $f106_9$A member has not paid while the collection is open.$f106_9$, $f106_a$The member.$f106_a$, $f106_b$Every four working days until the fee is recorded as paid.$f106_b$)
ON CONFLICT (key) DO UPDATE
   SET subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = now()
 WHERE public.auto_email_templates.subject IS DISTINCT FROM EXCLUDED.subject
    OR public.auto_email_templates.body IS DISTINCT FROM EXCLUDED.body;

-- ws_fee_payment_received
INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic, trigger_description, recipient_description, schedule_description)
VALUES ('ws_fee_payment_received', $f106_c$Workspace · membership fee payment received$f106_c$, $f106_d$Payment received: membership fee for {{semester_label}} | Minerva IMS$f106_d$, $f106_e$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Payment received: membership fee for {{semester_label}} | Minerva IMS</title>
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
  .m-h1{font-size:25px!important;}
  .m-sc{font-size:11px!important;letter-spacing:.1em!important;}
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your {{fee_amount}} membership fee for {{semester_label}} is recorded as paid.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your membership fee payment is received</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you, {{first_name}}. Your membership fee for <strong>{{semester_label}}</strong> has been recorded as paid.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount received</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Status</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Paid</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile/membership?show=fee" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">No further payment is needed for this collection. Members on a semester of leave or on exchange are also expected to pay the fee. If this confirmation does not match your payment, please contact the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$f106_e$, true, NULL, $f106_f$A payment is recorded as paid (Operations, Membership Fees).$f106_f$, $f106_g$The member.$f106_g$, $f106_h$At once.$f106_h$)
ON CONFLICT (key) DO UPDATE
   SET subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = now()
 WHERE public.auto_email_templates.subject IS DISTINCT FROM EXCLUDED.subject
    OR public.auto_email_templates.body IS DISTINCT FROM EXCLUDED.body;
