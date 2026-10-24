-- =====================================================================
-- STEP 96, follow-up. The header of every email, and the company visit
-- interest email.
-- ---------------------------------------------------------------------
-- The 38 stored templates, as transactional-emails.ts now writes them
-- (AGENTS.md): the crest centred over the Society's name in small capitals
-- and a thin navy line above the heading, the heading in Times New Roman,
-- and company_visit_interest_received without a time or a place, saying
-- that it is not yet a place and that the answer comes by email after the
-- form closes. Templates only: no table, column or function changes.
-- Safe to run twice; nothing is deleted, and a template switched off by
-- an administrator stays switched off.
-- =====================================================================

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('application_received', $q0$Application received$q0$, $q1$We have received your application | Minerva IMS$q1$, $q2$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application is under review. You will hear from us within 10 days.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your application is in</h1></td></tr>
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
</html>$q2$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('division_reassignment', $q3$Division reassignment$q3$, $q4$Update on your application | Minerva IMS$q4$, $q5$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application is now with the {{to_division}} division. No action is needed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your application has moved division</h1></td></tr>
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
</html>$q5$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('rejection_pre_interview', $q6$Rejection · pre-interview$q6$, $q7$An update on your application | Minerva IMS$q7$, $q8$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An update on your application to Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An update on your application</h1></td></tr>
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
</html>$q8$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_invitation', $q9$Interview invitation$q9$, $qa$You are invited to interview | Minerva IMS$qa$, $qb$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations. Please choose your interview slot within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">You are invited to interview</h1></td></tr>
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
</html>$qb$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_reminder_24h', $qc$Interview booking reminder · 24h$qc$, $qd$Reminder: book your interview slot | Minerva IMS$qd$, $qe$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interview slot is not booked yet. Please choose a time by {{deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A reminder to book your interview</h1></td></tr>
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
</html>$qe$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_reminder_48h', $qf$Interview booking reminder · 48h$qf$, $qg$Second reminder: book your interview slot | Minerva IMS$qg$, $qh$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interview slot is still not booked, and the window closes on {{deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Second reminder: book your interview</h1></td></tr>
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
</html>$qh$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_booking_confirmation', $qi$Interview booking confirmation$qi$, $qj$Your interview is confirmed | Minerva IMS$qj$, $qk$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{interview_date}}, {{interview_time}}. Your meeting link is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your interview is confirmed</h1></td></tr>
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
</html>$qk$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('interview_reminder_30m', $ql$Interview reminder · 30 minutes$ql$, $qm$Your interview begins in 30 minutes | Minerva IMS$qm$, $qn$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your {{division_name}} interview starts soon. The link is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your interview begins soon</h1></td></tr>
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
</html>$qn$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('rejection_post_interview', $qo$Rejection · post-interview$qo$, $qp$An update on your application | Minerva IMS$qp$, $qq$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Thank you for interviewing with Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Thank you for interviewing with us</h1></td></tr>
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
</html>$qq$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_to_join', $qr$Offer to join$qr$, $qs$Your offer to join Minerva IMS | Minerva IMS$qs$, $qt$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations. Please sign your offer within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Welcome to Minerva IMS</h1></td></tr>
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
</html>$qt$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('acceptance_received', $qu$Acceptance received$qu$, $qv$Welcome to the Society | Minerva IMS$qv$, $qw$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">We have received your acceptance. One last step: complete your profile.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your place is confirmed</h1></td></tr>
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
</html>$qw$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('acceptance_reminder', $qx$Acceptance reminder$qx$, $qy$A gentle reminder: your offer | Minerva IMS$qy$, $qz$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your offer to join is still open until {{acceptance_deadline}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A gentle reminder about your offer</h1></td></tr>
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
</html>$qz$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_expired', $q10$Offer expired$q10$, $q11$Your offer to join has expired | Minerva IMS$q11$, $q12$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">The offer to join the Society has now expired.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your offer has expired</h1></td></tr>
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
</html>$q12$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('offer_withdrawn', $q13$Offer withdrawn$q13$, $q14$An update on your offer | Minerva IMS$q14$, $q15$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An update on your offer to join Minerva IMS.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An update on your offer</h1></td></tr>
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
</html>$q15$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('application_withdrawn', $q16$Application withdrawn$q16$, $q17$Your application has been withdrawn | Minerva IMS$q17$, $q18$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your application has been withdrawn at your request. No further action is needed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your application has been withdrawn</h1></td></tr>
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
</html>$q18$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_interview_booked', $q19$Head of Division · interview slot booked$q19$, $q1a$Interview slot booked: {{division_name}} | Minerva IMS$q1a$, $q1b$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has booked one of your interview slots.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An interview slot has been booked</h1></td></tr>
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
</html>$q1b$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_interview_released', $q1c$Head of Division · interview slot released$q1c$, $q1d$Interview slot released: {{division_name}} | Minerva IMS$q1d$, $q1e$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has released one of your interview slots.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An interview slot has been released</h1></td></tr>
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
</html>$q1e$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_sent', $q1f$Head of Division · offer sent$q1f$, $q1g$Offer sent: {{division_name}} | Minerva IMS$q1g$, $q1h$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">An offer to join {{division_name}} has been sent to {{candidate_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An offer has been sent for your division</h1></td></tr>
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
</html>$q1h$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_accepted', $q1i$Head of Division · offer accepted$q1i$, $q1j$Offer accepted: {{division_name}} | Minerva IMS$q1j$, $q1k$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has accepted the offer to join {{division_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An offer has been accepted</h1></td></tr>
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
</html>$q1k$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_declined', $q1l$Head of Division · offer declined$q1l$, $q1m$Offer declined: {{division_name}} | Minerva IMS$q1m$, $q1n$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{candidate_name}} has declined the offer to join {{division_name}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An offer has been declined</h1></td></tr>
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
</html>$q1n$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('staff_offer_expired', $q1o$Head of Division · offer expired$q1o$, $q1p$Offer expired: {{division_name}} | Minerva IMS$q1p$, $q1q$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">The offer to {{candidate_name}} has expired without an answer.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">An offer has expired</h1></td></tr>
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
</html>$q1q$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_complete_profile', $q1r$Workspace · complete your profile$q1r$, $q1s$Your profile is missing a few details | Minerva IMS$q1s$, $q1t$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your profile is missing a few details: here is what, and how to add them.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your profile is missing a few details</h1></td></tr>
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
</html>$q1t$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_fee_collection', $q1u$Workspace · fee collection$q1u$, $q1v$Membership fee for {{semester_label}} | Minerva IMS$q1v$, $q1w$<!DOCTYPE html>
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
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/dashboard" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Once your payment arrives, it is recorded and the Dashboard shows it as paid. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1w$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_membership_reminder', $q1x$Workspace · membership reminder$q1x$, $q1y$Reminder: membership fee still due | Minerva IMS$q1y$, $q1z$<!DOCTYPE html>
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
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Amount</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;"><strong>{{fee_amount}}</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Due by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{fee_deadline}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">How to pay</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{payment_method}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/dashboard" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your fee status</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">Already paid? Thank you: it is recorded once the payment arrives. A question? Ask the Head of Operations or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Operations Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$q1z$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_registration_confirmation', $q20$Event registration confirmation$q20$, $q21$Your place is confirmed: {{event_title}} | Minerva IMS$q21$, $q22$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{event_date}}, {{event_time}}. Your place is confirmed.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your place is confirmed</h1></td></tr>
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
</html>$q22$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_waitlist_promoted', $q23$Event waiting list: a place for you$q23$, $q24$A place has opened up: {{event_title}} | Minerva IMS$q24$, $q25$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">A place at {{event_title}} has opened up, and it is yours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A place has opened up</h1></td></tr>
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
</html>$q25$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_waitlist_joined', $q26$Event waiting list: joined$q26$, $q27$You are on the waiting list: {{event_title}} | Minerva IMS$q27$, $q28$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{event_title}} is full. You are number {{waitlist_position}} on the waiting list.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">You are on the waiting list</h1></td></tr>
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
</html>$q28$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('event_registration_cancelled', $q29$Event registration cancelled$q29$, $q2a$Your registration is cancelled: {{event_title}} | Minerva IMS$q2a$, $q2b$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your registration for {{event_title}} is cancelled.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your registration is cancelled</h1></td></tr>
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
</html>$q2b$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_2w', $q2c$Workspace · event reminder, 2 weeks before$q2c$, $q2d$Two weeks to go: {{event_title}} | Minerva IMS$q2d$, $q2e$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Registration for {{event_title}} is open. Save your place.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Two weeks to go</h1></td></tr>
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
</html>$q2e$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_1w', $q2f$Workspace · event reminder, 1 week before$q2f$, $q2g$One week to go: {{event_title}} | Minerva IMS$q2g$, $q2h$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Registration for {{event_title}} is open. Save your place.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">One week to go</h1></td></tr>
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
</html>$q2h$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_3d', $q2i$Workspace · event reminder, 3 days before$q2i$, $q2j$Three days to go: {{event_title}} | Minerva IMS$q2j$, $q2k$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Last reminder: registration for {{event_title}} is still open.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Three days to go</h1></td></tr>
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
</html>$q2k$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_reminder_24h_attending', $q2l$Workspace · event reminder, 24 hours before (registered)$q2l$, $q2m$See you tomorrow: {{event_title}} | Minerva IMS$q2m$, $q2n$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Tomorrow, {{event_time}}: {{event_title}}. Your details are inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">See you tomorrow</h1></td></tr>
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
</html>$q2n$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('ws_event_thank_you', $q2o$Workspace · event thank you, the day after (guests who attended)$q2o$, $q2p$Thank you for joining us | Minerva IMS$q2p$, $q2q$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Thank you for attending {{event_title}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Thank you for joining us</h1></td></tr>
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
</html>$q2q$, true, 'events')
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_interest_received', $q2r$Company visit: interest received$q2r$, $q2s$Interest received, not yet a place: {{event_title}} | Minerva IMS$q2s$, $q2t$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Interest received, not yet a place: {{event_title}} | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your interest in {{event_title}} is registered. It is not yet a place: the answer comes by email after the form closes.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">We have received your interest</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you for registering your interest in <strong>{{event_title}}</strong>. Your request and your CV have arrived.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Your request</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Interest registered, <strong>not yet a place</strong></td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">The answer</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">By email, soon after the interest form closes on {{closes_at}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Places are limited, so the President and the Vice President select the participants once the form has closed. If you are selected, you will receive your invitation soon after, with the time, the place and your entry code; otherwise we will let you know at the same time.</p></td></tr>
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
</html>$q2t$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_invited', $q2u$Company visit: invitation$q2u$, $q2v$You are invited: {{event_title}} | Minerva IMS$q2v$, $q2w$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">You have a place at {{event_title}}. Your entry code is inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">You are invited</h1></td></tr>
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
</html>$q2w$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_not_selected', $q2x$Company visit: not selected this time$q2x$, $q2y$Your interest in {{event_title}} | Minerva IMS$q2y$, $q2z$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Not this time for {{event_title}}: you are on the reserve list.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Not this time</h1></td></tr>
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
</html>$q2z$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('company_visit_spot_opened', $q30$Company visit: a place has opened up$q30$, $q31$A place has opened up: {{event_title}} | Minerva IMS$q31$, $q32$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">A place has opened up at {{event_title}}, and it is yours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A place has opened up</h1></td></tr>
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
</html>$q32$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected, optout_topic)
VALUES ('internal_form_receipt', $q33$Form: answers received$q33$, $q34$Answers received: {{form_title}} | Minerva IMS$q34$, $q35$<!DOCTYPE html>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your answers to {{form_title}} have been received.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your answers are in</h1></td></tr>
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
</html>$q35$, true, NULL)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, optout_topic = EXCLUDED.optout_topic;

DO $do$
DECLARE v_new int;
BEGIN
  SELECT count(*) INTO v_new FROM public.auto_email_templates WHERE body LIKE '%MINERVA INVESTMENT MANAGEMENT SOCIETY%' OR body LIKE '%m-sc%';
  RAISE NOTICE 'Step 96 follow-up: % templates with the centred header.', v_new;
END
$do$;
