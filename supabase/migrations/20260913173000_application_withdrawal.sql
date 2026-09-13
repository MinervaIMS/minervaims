-- =====================================================================
-- WITHDRAWING AN APPLICATION.
-- ---------------------------------------------------------------------
-- A candidate may stop their own candidacy at any point while it is
-- still running. It is not a rejection and it is not a declined offer:
-- it is the applicant's own decision, taken by them, and it deserves its
-- own state rather than being folded into an outcome the association
-- decided.
--
-- THE STATE IS LAST IN THE WORKFLOW ORDER, deliberately. Both the client
-- (`STATUS_FLOW`) and the screening function (`STATUSES`) enforce a
-- forward-only progression by comparing positions in that list, so a
-- status sitting at the end has two properties for free: a candidacy can
-- be withdrawn from any stage it has reached, and nothing can ever be
-- moved on from `withdrawn`. Reviewers are additionally refused the
-- value outright, because withdrawing is the candidate's act and nobody
-- else's.
--
-- THE ROW IS NEVER DELETED. It stays visible to interviewers and
-- examiners in Candidate Screening, and `applications_user_semester_uidx`
-- keeps holding the one-application-per-person rule for the round, which
-- is what stops a withdrawn candidate from applying again in the same
-- cycle.
-- =====================================================================

-- 1. The status itself. The CHECK constraint is found by what it
--    constrains rather than by a name, because the table was created in
--    one migration and its constraint has carried the default name since.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND rel.relname = 'applications'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%offer_declined%'
  LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check CHECK (status IN (
    'received','cv_opened','under_review','to_be_contacted',
    'interview_invitation_sent','waiting_interview_confirmation',
    'interview_confirmed','interview_completed','accepted','rejected',
    'offer_accepted','offer_declined','joined','withdrawn'));

-- 2. When it happened. Read by the screening register so a reviewer sees
--    the date beside the state, and by the candidate's own status page.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

-- 3. The confirmation the candidate receives.
--
--    The body is the branded template held in
--    supabase/functions/_shared/transactional-emails.ts, which is the
--    single source of truth: the Auto emails page re-syncs subject and
--    body from the code on every read. It is seeded here as well because
--    the send path (enqueue_app_email) reads this table and silently
--    sends nothing for a key with no row, and the first withdrawal must
--    not depend on somebody having opened that page first.
INSERT INTO public.auto_email_templates (key, name, description, subject, body, connected)
VALUES (
  'application_withdrawn',
  'Application withdrawn',
  'Sent to the candidate when they withdraw their own application from the workspace.',
  'Your application has been withdrawn | Minerva IMS',
  $html$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Your application has been withdrawn | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Your application to Minerva IMS has been withdrawn at your request. No further action is needed.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;">
          <tr><td style="background:#1F0F4D;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Application &middot; Withdrawn</td></tr>
          <tr>
            <td style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img src="https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></td>
                  <td style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:30px 40px 20px;"><h1 style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Your application has been withdrawn</h1></td></tr>
          <tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">This message confirms that you have withdrawn your application to Minerva Investment Management Society for the <strong>{{division_name}}</strong> division. We have recorded your decision and your candidacy is now closed.</p></td></tr>
          <tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Nothing further is expected of you. Any interview slot you were holding has been released, and you will receive no more messages about this application.</p></td></tr>
          <tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Please note that only one application per person is accepted in each recruitment round, so a new application cannot be submitted for the {{semester_label}} intake. You are very welcome to apply again in a future round, and doing so is both permitted and common.</p></td></tr>
          <tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">If you did not intend to withdraw, please write to us as soon as possible at the address below: a withdrawal cannot be reversed from the workspace.</p></td></tr>
          <tr><td style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/workspace/applications/status" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Open Workspace</a></td></tr></table></td></tr>
          <tr><td style="padding:14px 40px 4px;"><p style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Talent Recruiting Team</p><p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:22px 40px 30px;">
              <p style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://www.linkedin.com/company/minervaims" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minervaims" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              <p style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  true
)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      subject = EXCLUDED.subject, body = EXCLUDED.body, connected = true;

-- 4. The trigger -> template map, which documents what sends what.
INSERT INTO public.application_email_map (trigger_code, template_key, description) VALUES
  ('event:application_withdrawn', 'application_withdrawn',
   'The candidate withdrew their own application from the Status page.')
ON CONFLICT (trigger_code) DO UPDATE
  SET template_key = EXCLUDED.template_key, description = EXCLUDED.description;
