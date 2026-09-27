UPDATE public.auto_email_templates AS t
   SET body = CASE
                WHEN x.b ~* '</head>' THEN regexp_replace(x.b, '</head>', x.style || E'\n</head>', 'i')
                ELSE x.style || E'\n' || x.b
              END
  FROM (
    SELECT k.key,
           replace(replace(replace(replace(k.body,
             $a$<img src="https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" />$a$,
             $a$<img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]-->$a$),
             $a$<td class="mims-pad" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">$a$,
             $a$<td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">$a$),
             $a$<td style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">$a$,
             $a$<td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">$a$),
             $a$<div class="mims-hero-title" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment$a$,
             $a$<div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment$a$) AS b,
           $s$<style>
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
</style>$s$ AS style
      FROM public.auto_email_templates k
     WHERE position($a$<img src="https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" />$a$ IN k.body) > 0
       AND position('mims-logo-dark' IN k.body) = 0
  ) AS x
 WHERE t.key = x.key;

UPDATE public.auto_email_templates
   SET body = regexp_replace(body, 'https://www\.instagram\.com/minervaims/?(?=")', 'https://www.instagram.com/minerva.ims/', 'g')
 WHERE body ~ 'https://www\.instagram\.com/minervaims/?"';