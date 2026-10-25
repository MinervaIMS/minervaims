-- =====================================================================
-- STEP 97B. My Profile in three pages: what the Membership page reads.
-- ---------------------------------------------------------------------
-- Two reads, each answering for the signed-in caller only (auth.uid()),
-- never for anybody else, so a member sees their own path and their own
-- reports and nothing more:
--
--   my_roster_history()   the member's role in every semester, from the
--                         rosters (Step 94): the past semesters as
--                         recorded, the current one from the register.
--   my_report_projects()  the reports that name the member among their
--                         authors, by the rule the report pages already
--                         use to link an author to a person (a picked
--                         person by id, otherwise one person only with
--                         that name: a namesake is never guessed).
--
-- Then four emails point at the new Commitment page. Each is changed
-- only where it is still exactly the Step 97 text, so a template edited
-- by hand in Automatic Emails is left as it is (and named in a notice).
--
-- Nothing is deleted. Safe to run twice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The person behind the signed-in account.
-- ---------------------------------------------------------------------
-- Their member record first (members.user_id); for a former member, the
-- alumni entry kept with their private address (alumni_contacts, the same
-- match the membership certificate makes), when exactly one entry has it.
CREATE OR REPLACE FUNCTION public.my_person_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_person uuid;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT pr.person_id INTO v_person
    FROM public.members m
    JOIN public.person_records pr ON pr.record_type = 'member' AND pr.record_id = m.id
   WHERE m.user_id = v_uid
   ORDER BY m.updated_at DESC
   LIMIT 1;
  IF v_person IS NOT NULL THEN RETURN v_person; END IF;
  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;
  SELECT CASE WHEN count(DISTINCT pr.person_id) = 1 THEN (array_agg(pr.person_id))[1] END INTO v_person
    FROM public.alumni_contacts c
    JOIN public.person_records pr ON pr.record_type = 'alumni' AND pr.record_id = c.alumni_id
   WHERE lower(btrim(c.email)) = v_email;
  RETURN v_person;
END;
$$;
REVOKE ALL ON FUNCTION public.my_person_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_person_id() TO service_role;

-- ---------------------------------------------------------------------
-- 2. Career inside Minerva: one row per semester and role.
-- ---------------------------------------------------------------------
-- The same two sources as People > Rosters, read for one person: every
-- past semester as the rosters record it, and the current semester from
-- the register (the live roster), so a promotion made today shows today.
-- No person code, no source, nothing about anybody else.
CREATE OR REPLACE FUNCTION public.my_roster_history()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid;
  v_current text := public.current_semester_key();
  v_entries jsonb;
  v_live jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to read your history.' USING ERRCODE = '42501';
  END IF;
  v_person := public.my_person_id();
  IF v_person IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'current_semester', v_current,
                              'current_label', public.semester_label(v_current),
                              'entries', '[]'::jsonb, 'current', NULL);
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'semester', e.semester_key, 'label', public.semester_label(e.semester_key),
           'role', e.role_label, 'division', e.division_key, 'team', e.team)
         ORDER BY public.semester_ordinal(e.semester_key) DESC, public.roster_office_rank(e.role_label) NULLS LAST),
         '[]'::jsonb)
    INTO v_entries
    FROM public.roster_entries e
   WHERE e.person_id = v_person
     AND public.semester_ordinal(e.semester_key) < public.semester_ordinal(v_current);
  SELECT jsonb_build_object('semester', v_current, 'label', public.semester_label(v_current),
                            'role', l.role_label, 'division', l.division_key, 'team', l.team, 'status', l.status)
    INTO v_live
    FROM public.roster_live() l
   WHERE l.person_id = v_person
   LIMIT 1;
  RETURN jsonb_build_object('linked', true, 'current_semester', v_current,
                            'current_label', public.semester_label(v_current),
                            'entries', v_entries, 'current', v_live);
END;
$$;
REVOKE ALL ON FUNCTION public.my_roster_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_roster_history() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Your projects: the reports that name the member as an author.
-- ---------------------------------------------------------------------
-- An author is the member when the report pages would link them to the
-- member's entry on the Members page (team_members) or, for a former
-- member, to their entry in the alumni directory: resolve_report_authors,
-- unchanged, so the profile and the public report page always agree.
-- Every report not deleted: a published one with its address, a draft or
-- a blocked one with its state and no address. The role is the one
-- printed on the cover.
CREATE OR REPLACE FUNCTION public.my_report_projects()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_links text[];
  v_people jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to read your projects.' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(array_agg('/people/members?person=' || t.id::text), '{}'::text[]) INTO v_links
    FROM public.team_members t
    JOIN public.members m ON m.id = t.member_id
   WHERE m.user_id = v_uid;
  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NOT NULL AND v_email <> '' THEN
    v_links := v_links || coalesce((
      SELECT array_agg(DISTINCT '/people/alumni?person=' || c.alumni_id::text)
        FROM public.alumni_contacts c
       WHERE lower(btrim(c.email)) = v_email), '{}'::text[]);
  END IF;
  IF cardinality(v_links) = 0 THEN
    RETURN jsonb_build_object('linked', false, 'reports', '[]'::jsonb);
  END IF;
  v_people := public.public_people_json();
  RETURN jsonb_build_object('linked', true, 'reports', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
             'id', f.id, 'title', f.title,
             'slug', CASE WHEN f.status = 'published' THEN f.slug END,
             'date', f.date, 'division', f.division,
             'report_type', coalesce(f.report_type, public.archive_default_type(f.division::text)),
             'status', f.status, 'role', a.role)
           ORDER BY f.date DESC NULLS LAST, f.created_at DESC)
      FROM public.archive_files f
      CROSS JOIN LATERAL (
        SELECT x ->> 'role' AS role
          FROM jsonb_array_elements(public.resolve_report_authors(f.authors, v_people)) x
         WHERE x ->> 'link' = ANY (v_links)
         LIMIT 1) a
     WHERE f.deleted_at IS NULL), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.my_report_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_report_projects() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. The commitment and declaration emails lead to My Profile, Commitment.
-- ---------------------------------------------------------------------
-- As transactional-emails.ts writes them (AGENTS.md). The receipt of the
-- declaration and of the commitment answer open the Commitment page, and
-- the request and its reminder say "My Profile, Commitment". Their button
-- (`/workspace/my-profile?commitment=1`) is unchanged: the Workspace
-- opens the Commitment page from it.
UPDATE public.auto_email_templates SET body = $e0$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>We have received your one-association declaration | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Your acceptance of the one-association policy is recorded.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your declaration is received</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Thank you. We have received your acceptance of the one-association policy: you signed the declaration in the Minerva Workspace, and it is recorded with your typed name and the time.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Signed by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{signer_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">On</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{signed_at}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Semester</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{semester_label}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile/commitment" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Read what you signed</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">There is nothing else to do. If your situation changes while you are a member, tell the President or the Vice President.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$e0$
 WHERE key = 'declaration_signed' AND md5(body) = '277c4b7663029a75ae0a5bb99994fb08';

UPDATE public.auto_email_templates SET body = $e1$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Confirm your commitment for {{semester_label}} | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">A minute in the Workspace: tell us whether you can commit to the Society this semester.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Your commitment for {{semester_label}}</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">A new semester is starting, and with it recruiting. Before the new analysts join, we ask every member to confirm their commitment to the Society for <strong>{{semester_label}}</strong>.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">What</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Confirm or decline{{declaration_clause}}, with your typed name</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">My Profile, Commitment, in the Minerva Workspace</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{confirm_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Answer now</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If you cannot commit this semester, say so on the same page: the Board would rather know now. If you have not answered, you will receive one reminder.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$e1$
 WHERE key = 'commitment_request' AND md5(body) = '528f1c5035f8717a6b66dfac8e775e7a';

UPDATE public.auto_email_templates SET body = $e2$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Reminder: your commitment for {{semester_label}} | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">We have not received your answer for {{semester_label}} yet.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">A reminder about your commitment</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">A few days ago we asked every member to confirm their commitment to the Society for <strong>{{semester_label}}</strong>, and we have not received your answer yet.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">What</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">Confirm or decline{{declaration_clause}}, with your typed name</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Where</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">My Profile, Commitment, in the Minerva Workspace</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="{{confirm_url}}" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">Answer now</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">This is the only reminder.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$e2$
 WHERE key = 'commitment_reminder' AND md5(body) = '390607250bcd52100eccddd6adc97e5e';

UPDATE public.auto_email_templates SET body = $e3$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Your answer for {{semester_label}} is recorded | Minerva IMS</title>
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
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">Thank you: your answer for {{semester_label}} is recorded.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;margin:0 auto;">
<tr><td class="m-pad" align="center" style="padding:34px 40px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><img class="m-logo-l" src="https://minervaims.org/email/minerva-logo-light.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /><!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" /></div><!--<![endif]--></td></tr></table><p class="m-ink m-sc" style="margin:12px 0 0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#1F0F4D;"><span class="m-ink" style="color:#1F0F4D;">Minerva Investment Management Society</span></p></td></tr>
<tr><td class="m-pad" style="padding:22px 40px 0;"><div class="m-rule" style="border-top:1px solid #1F0F4D;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td class="m-pad" style="padding:28px 40px 4px;"><h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:'Times New Roman',Times,Georgia,serif;font-size:28px;line-height:1.25;font-weight:400;color:#141414;">Thank you, your answer is recorded</h1></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Dear {{first_name}},</p></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-ink" style="margin:0 0 16px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">We have recorded your answer for <strong>{{semester_label}}</strong>: {{decision_label}}.</p></td></tr>
<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid #1F0F4D;padding:2px 0 2px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Your answer</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{decision_label}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">Signed by</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{signer_name}}</td></tr><tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#737373;">On</td><td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#141414;">{{signed_at}}</td></tr></table></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:6px 40px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="#1F0F4D" style="background:#1F0F4D;"><a class="m-btn-a" href="https://minervaims.org/workspace/my-profile/commitment" style="display:inline-block;padding:13px 24px;border:1px solid #1F0F4D;background:#1F0F4D;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">See your answer</a></td></tr></table></td></tr>
<tr><td class="m-pad" style="padding:0 40px;"><p class="m-muted" style="margin:0 0 10px;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#737373;">If anything changes during the semester, write to <a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:underline;">as.minerva@unibocconi.it</a>.</p></td></tr>
<tr><td class="m-pad" style="padding:10px 40px 30px;"><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">Kind regards,</p><p class="m-ink" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#141414;">The Board of Directors</p></td></tr>
<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;"><p class="m-ink" style="margin:0 0 4px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:15px;line-height:1.4;letter-spacing:.04em;color:#141414;">Minerva Investment Management Society</p><p class="m-muted" style="margin:0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#737373;">Bocconi University, Milan <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:underline;">Privacy Policy</a></span> <span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span><a class="m-link" href="mailto:as.minerva@unibocconi.it" style="color:#737373;text-decoration:underline;">Contact</a></span></p><p class="m-muted" style="margin:12px 0 0;font-family:Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#737373;line-height:1.5;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>$e3$
 WHERE key = 'commitment_recorded' AND md5(body) = 'ee7d0f31b022f8228ac0d1d492bd5a6b';

DO $$
DECLARE
  v_done integer;
  v_left text;
BEGIN
  SELECT count(*) INTO v_done FROM public.auto_email_templates
   WHERE (key, md5(body)) IN (('declaration_signed', '2e9aabea3aa4434bf97c4361d7ea59cd'), ('commitment_request', 'cff2b9d509274e66ac2a409e8b0722c8'), ('commitment_reminder', '3bdc337e04c36e5d495eb64e87c9d10c'), ('commitment_recorded', 'c17b35cd2e678c4c7c772ab2ab89ecf0'));
  SELECT string_agg(key, ', ' ORDER BY key) INTO v_left FROM public.auto_email_templates
   WHERE key IN ('declaration_signed', 'commitment_request', 'commitment_reminder', 'commitment_recorded')
     AND (key, md5(body)) NOT IN (('declaration_signed', '2e9aabea3aa4434bf97c4361d7ea59cd'), ('commitment_request', 'cff2b9d509274e66ac2a409e8b0722c8'), ('commitment_reminder', '3bdc337e04c36e5d495eb64e87c9d10c'), ('commitment_recorded', 'c17b35cd2e678c4c7c772ab2ab89ecf0'));
  IF v_left IS NOT NULL THEN
    RAISE NOTICE 'Step 97B: left as edited by hand: %', v_left;
  END IF;
  RAISE NOTICE 'Step 97B: my_roster_history and my_report_projects ready; % of 4 emails lead to My Profile, Commitment.', v_done;
END $$;
