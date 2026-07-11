-- Application automatic-email engine
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS received_email_sent_at   timestamptz,
  ADD COLUMN IF NOT EXISTS offer_sent_at            timestamptz,
  ADD COLUMN IF NOT EXISTS offer_reminder_sent_at   timestamptz,
  ADD COLUMN IF NOT EXISTS offer_deadline           timestamptz;

INSERT INTO public.auto_email_templates (key, name, description, subject, body, connected) VALUES
  ('application_received', 'Application received',
   'Sent once the candidate has submitted and confirmed their email.',
   'We have received your application',
   '<p>Dear {{first_name}},</p><p>Thank you for applying to Minerva Investment Management Society. We have received your application and our team will review it carefully.</p><p>You can already access your workspace to follow the progress of your application.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Monitor your application status</a></p><p>We will be in touch with the next steps.</p>',
   true),
  ('interview_invitation', 'Interview invitation',
   'Sent when a candidate''s status becomes "Interview invitation sent".',
   'You are invited to interview',
   '<p>Dear {{first_name}},</p><p>We are pleased to invite you to an interview for the {{division}} division. Please book a slot that suits you from your workspace.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Book your interview</a></p><p>We look forward to meeting you.</p>',
   true),
  ('rejection_no_interview', 'Rejection (before interview)',
   'Sent when a candidate is rejected before being invited to interview.',
   'Update on your application',
   '<p>Dear {{first_name}},</p><p>Thank you for your interest in Minerva Investment Management Society and for the time you invested in your application. After careful consideration, we are unable to move forward with your application on this occasion.</p><p>We received many strong applications and encourage you to apply again in a future round.</p>',
   true),
  ('rejection_after_interview', 'Rejection (after interview)',
   'Sent when a candidate is rejected after the interview stage.',
   'Update on your application',
   '<p>Dear {{first_name}},</p><p>Thank you for taking the time to interview with us. It was a pleasure to learn more about you. After careful consideration, we are unable to offer you a place on this occasion.</p><p>We genuinely encourage you to apply again in a future round.</p>',
   true),
  ('offer_to_join', 'Offer to join',
   'Sent when a candidate passes the selection and receives an offer to join.',
   'An offer to join Minerva IMS',
   '<p>Dear {{first_name}},</p><p>Congratulations! We are delighted to offer you a place in the {{division}} division of Minerva Investment Management Society.</p><p>Please confirm your acceptance from your workspace by {{deadline}}.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Review your offer</a></p>',
   true),
  ('offer_accepted_confirmation', 'Offer accepted (welcome)',
   'Sent when the candidate accepts the offer and joins as an analyst.',
   'Welcome to Minerva IMS',
   '<p>Dear {{first_name}},</p><p>Welcome to Minerva Investment Management Society! We are thrilled to have you join us.</p><p>Please complete your member profile in your workspace, including a profile photo and your details.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Complete your profile</a></p>',
   true),
  ('offer_reminder', 'Offer acceptance reminder',
   'Sent two days after the offer if the candidate has not yet accepted.',
   'Reminder: your offer to join Minerva IMS',
   '<p>Dear {{first_name}},</p><p>This is a friendly reminder that your offer to join Minerva IMS is waiting for your confirmation. Please accept it by {{deadline}} to secure your place.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Review your offer</a></p>',
   true),
  ('offer_expired', 'Offer expired',
   'Sent if the candidate does not accept the offer within three days.',
   'Your offer to join Minerva IMS has expired',
   '<p>Dear {{first_name}},</p><p>Unfortunately your offer to join Minerva IMS has expired, as we did not receive your confirmation within the required time. If you are still interested, please get in touch with us.</p>',
   true)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      subject = EXCLUDED.subject, body = EXCLUDED.body, connected = true;

CREATE TABLE IF NOT EXISTS public.application_email_map (
  trigger_code text PRIMARY KEY,
  template_key text NOT NULL REFERENCES public.auto_email_templates(key),
  description  text
);
GRANT SELECT ON public.application_email_map TO authenticated;
GRANT ALL ON public.application_email_map TO service_role;
ALTER TABLE public.application_email_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email map readable by staff" ON public.application_email_map;
CREATE POLICY "email map readable by staff" ON public.application_email_map
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.application_email_map (trigger_code, template_key, description) VALUES
  ('event:email_confirmed',       'application_received',        'Applicant submitted and confirmed their email.'),
  ('status:interview_invitation_sent', 'interview_invitation',   'Reviewer invited the candidate to interview.'),
  ('status:rejected_pre_interview',    'rejection_no_interview', 'Rejected before any interview invitation.'),
  ('status:rejected_post_interview',   'rejection_after_interview', 'Rejected after the interview stage.'),
  ('event:offer_sent',            'offer_to_join',               'Offer to join extended (New Joiners).'),
  ('status:offer_accepted',       'offer_accepted_confirmation', 'Candidate accepted the offer / joined.'),
  ('deadline:offer_reminder_2d',  'offer_reminder',              'Two days after the offer, still unaccepted.'),
  ('deadline:offer_expired_3d',   'offer_expired',               'Offer not accepted within three days.')
ON CONFLICT (trigger_code) DO UPDATE
  SET template_key = EXCLUDED.template_key, description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.enqueue_app_email(p_key text, p_to text, p_vars jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t       RECORD;
  subj    text;
  inner_body text;
  k       text;
  v       text;
  html    text;
  msg_id  uuid := gen_random_uuid();
BEGIN
  IF p_to IS NULL OR p_to = '' THEN RETURN; END IF;
  SELECT subject, body, connected INTO t FROM public.auto_email_templates WHERE key = p_key;
  IF NOT FOUND OR t.connected IS NOT TRUE THEN RETURN; END IF;

  subj := coalesce(t.subject, 'Minerva IMS');
  inner_body := coalesce(t.body, '');
  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_vars) LOOP
    subj := replace(subj, '{{' || k || '}}', v);
    inner_body := replace(inner_body, '{{' || k || '}}', v);
  END LOOP;
  subj := regexp_replace(subj, '\{\{[a-z_]+\}\}', '', 'g');
  inner_body := regexp_replace(inner_body, '\{\{[a-z_]+\}\}', '', 'g');

  html :=
    '<div style="background:#f4f4f5;padding:24px 0;font-family:Georgia,''Times New Roman'',serif;color:#18181b;">'
    || '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">'
    || '<div style="background:#28185a;color:#ffffff;padding:18px 28px;font-size:18px;letter-spacing:.3px;">Minerva Investment Management Society</div>'
    || '<div style="padding:28px;font-size:15px;line-height:1.6;">' || inner_body || '</div>'
    || '<div style="padding:16px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">'
    || 'Minerva Investment Management Society · Bocconi University · <a href="https://minervaims.org" style="color:#28185a;">minervaims.org</a></div>'
    || '</div></div>';
  html := replace(html, 'class="btn"',
    'style="display:inline-block;background:#28185a;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:14px;"');

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status)
  VALUES (msg_id, p_key, p_to, 'pending');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id', gen_random_uuid()::text,
    'message_id', msg_id::text,
    'to', p_to,
    'from', 'minervaims <noreply@minervaims.org>',
    'sender_domain', 'notify.minervaims.org',
    'subject', subj,
    'html', html,
    'text', regexp_replace(inner_body, '<[^>]+>', '', 'g'),
    'purpose', 'transactional',
    'label', p_key,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_app_email(text, text, jsonb) TO service_role;

-- Offer flow columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_role     text,
  ADD COLUMN IF NOT EXISTS offer_division public.org_division,
  ADD COLUMN IF NOT EXISTS offer_fee_due  boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, first_name, email, offer_deadline
    FROM public.applications
    WHERE status = 'accepted'
      AND offer_sent_at IS NOT NULL
      AND offer_reminder_sent_at IS NULL
      AND offer_deadline IS NOT NULL
      AND now() >= offer_sent_at + interval '2 days'
      AND now() < offer_deadline
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
    UPDATE public.applications SET offer_reminder_sent_at = now() WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT id, first_name, email
    FROM public.applications
    WHERE status = 'accepted'
      AND offer_sent_at IS NOT NULL
      AND offer_deadline IS NOT NULL
      AND now() >= offer_deadline
  LOOP
    UPDATE public.applications SET status = 'offer_declined' WHERE id = r.id;
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object('first_name', r.first_name));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN PERFORM cron.unschedule('process_offer_deadlines'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule('process_offer_deadlines', '0 * * * *', $cron$SELECT public.process_offer_deadlines()$cron$);
  END IF;
END $$;