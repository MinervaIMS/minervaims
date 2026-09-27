-- =====================================================================
-- THE EMAIL HEADER IN DARK MODE: A WHITE LOGO AND A WHITE SOCIETY NAME.
-- (And the Instagram link of the footers, at the end.)
-- ---------------------------------------------------------------------
-- Outlook (and the Gmail apps) darken the emails even though they ask to
-- stay light: the transparent purple logo disappears on the dark
-- background and the purple society name is recoloured pink.
--
-- The send path (enqueue_app_email) sends the copy stored in this table,
-- so the stored copies receive exactly what the code now produces
-- (supabase/functions/_shared/email-responsive.ts, withDarkModeHeader):
--   * the logo becomes a pair: the usual logo, now with a thin white
--     outline that is invisible on the white header, and a white logo
--     hidden by default and shown only where the client darkened the
--     email (Outlook's [data-ogsc] marker, or the dark-mode media query);
--   * the society name, the masthead cell and the thin rule beside the
--     logo get class hooks so that, in dark mode only, the name turns
--     white on a deep purple masthead;
--   * one extra <style> block, of its own, carries those rules.
-- Light mode is unchanged. The update touches only bodies that still use
-- the previous logo and do not have the pair yet, so running it twice
-- changes nothing.
-- =====================================================================

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

-- The Instagram link in the footers pointed at a handle that is not the
-- society's. The code now writes @minerva.ims, as the website footer does
-- (supabase/functions/_shared/email-links.ts); the stored copies follow.
UPDATE public.auto_email_templates
   SET body = regexp_replace(body, 'https://www\.instagram\.com/minervaims/?(?=")', 'https://www.instagram.com/minerva.ims/', 'g')
 WHERE body ~ 'https://www\.instagram\.com/minervaims/?"';
