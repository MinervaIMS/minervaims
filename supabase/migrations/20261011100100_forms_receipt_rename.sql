-- =====================================================================
-- STEP 89. The form receipt, renamed with the section.
-- Operations > Internal Forms is now Operations > Forms, because a form
-- can now be answered by guests outside the Society as well. The receipt
-- email changes in two places only: its name in Automatic Emails
-- ("Form: answers received") and the strap at its top ("Operations ·
-- Forms"). Everything else is as stored in Step 87.
--
-- The body below is the responsive output of transactional-emails.ts
-- (the source of the application's email HTML), stored here because the
-- database enqueue function sends the stored copy. Safe to run twice.
-- =====================================================================

INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('internal_form_receipt', $t$Form: answers received$t$, $t$Answers received | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Your answers are in | Minerva IMS</title>
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
<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Your answers to {{form_title}} have been received.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Operations · Forms</td></tr>
          <tr>
            <td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]--></td>
                  <td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Your answers are in</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 22px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Thank you for answering <strong>{{form_title}}</strong>. This email is your receipt: keep it. It shows what you sent and what happens next.</p></td></tr>
          {{summary_block}}
          {{order_block}}
          {{payment_block}}
          {{answers_block}}
          {{confirmation_block}}
          <tr><td class="mims-pad" style="padding:4px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="{{form_url}}" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">View your answers</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Operations Team</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
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
</html>$tpl$, true)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body;

