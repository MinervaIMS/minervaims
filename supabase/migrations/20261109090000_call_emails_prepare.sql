-- =====================================================================
-- STEP 105. The phone call emails say what to prepare (AGENTS.md: the
-- source is transactional-emails.ts, and the database sends its stored
-- copy, so the copy is brought in line here).
-- ---------------------------------------------------------------------
-- The invitation, the booking confirmation and the reminder 30 minutes
-- before: the call is about the Society as a whole, and the candidate is
-- asked to come prepared to talk about why they want to join Minerva
-- specifically, how the Society is organised, its events and what
-- membership involves. "There is nothing to prepare" is gone.
--
-- Only the subject and the body of these three rows change; whether a
-- template is switched on, and every other template, is left as it is.
-- Safe to run twice: a second run finds nothing different and changes
-- nothing.
-- =====================================================================

UPDATE public.auto_email_templates
   SET subject = $c105_0$A short phone call | Minerva IMS$c105_0$, body = $c105_1$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>A short phone call | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations on your interview. Please choose a time for a short phone call within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Let us talk on the phone</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Congratulations: your interview went well, and before any decision the President or the Vice President would like a short phone call with you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">What</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">A short phone call, about 15 minutes</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">About</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Minerva Investment Management Society as a whole</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">To prepare</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Why you want to join Minerva specifically, how the Society is organised (its divisions and its Board), its events and what membership involves</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Book by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{book_by}}<br /><span class="m-muted" style="color:#737373;font-size:14px;">72 hours from this email</span></td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/phone-call" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Choose a time</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">We call you on the phone number in your application. You can move the call once, up to one hour before it starts.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_1$, updated_at = now()
 WHERE key = 'call_invitation'
   AND (subject IS DISTINCT FROM $c105_2$A short phone call | Minerva IMS$c105_2$ OR body IS DISTINCT FROM $c105_3$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>A short phone call | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Congratulations on your interview. Please choose a time for a short phone call within 72 hours.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Let us talk on the phone</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Congratulations: your interview went well, and before any decision the President or the Vice President would like a short phone call with you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">What</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">A short phone call, about 15 minutes</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">About</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Minerva Investment Management Society as a whole</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">To prepare</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Why you want to join Minerva specifically, how the Society is organised (its divisions and its Board), its events and what membership involves</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Book by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{book_by}}<br /><span class="m-muted" style="color:#737373;font-size:14px;">72 hours from this email</span></td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/applications/phone-call" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Choose a time</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">We call you on the phone number in your application. You can move the call once, up to one hour before it starts.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_3$);

UPDATE public.auto_email_templates
   SET subject = $c105_4$Your phone call is confirmed | Minerva IMS$c105_4$, body = $c105_5$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your phone call is confirmed | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{call_date}}, {{call_time}}. We will call you on {{candidate_phone}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your phone call is confirmed</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your phone call with <strong>{{caller_name}}</strong> is booked. It is about Minerva Investment Management Society as a whole. Please come prepared to talk about why you want to join Minerva specifically, how the Society is organised (its divisions and its Board), its events and what membership involves. It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{call_date}}<br />{{call_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">We call you on</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_phone}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">From</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{caller_name}}, {{caller_phone}}</td></tr></table></td></tr></table></td></tr>
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the call has not arrived five minutes after the start, call {{caller_phone}}. Need to change it? <a class="m-link" href="{{status_url}}" style="color:#1F0F4D;text-decoration:underline;">Manage your booking</a>: you can move it once, up to one hour before it starts.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_5$, updated_at = now()
 WHERE key = 'call_booking_confirmation'
   AND (subject IS DISTINCT FROM $c105_6$Your phone call is confirmed | Minerva IMS$c105_6$ OR body IS DISTINCT FROM $c105_7$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your phone call is confirmed | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">{{call_date}}, {{call_time}}. We will call you on {{candidate_phone}}.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your phone call is confirmed</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your phone call with <strong>{{caller_name}}</strong> is booked. It is about Minerva Investment Management Society as a whole. Please come prepared to talk about why you want to join Minerva specifically, how the Society is organised (its divisions and its Board), its events and what membership involves. It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{call_date}}<br />{{call_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">We call you on</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_phone}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">From</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{caller_name}}, {{caller_phone}}</td></tr></table></td></tr></table></td></tr>
{{calendar_block}}
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the call has not arrived five minutes after the start, call {{caller_phone}}. Need to change it? <a class="m-link" href="{{status_url}}" style="color:#1F0F4D;text-decoration:underline;">Manage your booking</a>: you can move it once, up to one hour before it starts.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_7$);

UPDATE public.auto_email_templates
   SET subject = $c105_8$Your phone call begins in 30 minutes | Minerva IMS$c105_8$, body = $c105_9$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your phone call begins in 30 minutes | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">We will call you on {{candidate_phone}} in about 30 minutes.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your phone call begins soon</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your phone call with <strong>{{caller_name}}</strong> begins in about 30 minutes. Please keep your phone with you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{call_date}}<br />{{call_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">We call you on</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_phone}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">From</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{caller_name}}, {{caller_phone}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the call has not arrived five minutes after the start, call {{caller_phone}}. It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_9$, updated_at = now()
 WHERE key = 'call_reminder_30m'
   AND (subject IS DISTINCT FROM $c105_a$Your phone call begins in 30 minutes | Minerva IMS$c105_a$ OR body IS DISTINCT FROM $c105_b$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your phone call begins in 30 minutes | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">We will call you on {{candidate_phone}} in about 30 minutes.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your phone call begins soon</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Your phone call with <strong>{{caller_name}}</strong> begins in about 30 minutes. Please keep your phone with you.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">When</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{call_date}}<br />{{call_time}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">We call you on</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{candidate_phone}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">From</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{caller_name}}, {{caller_phone}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If the call has not arrived five minutes after the start, call {{caller_phone}}. It is not a technical conversation about markets.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$c105_b$);
