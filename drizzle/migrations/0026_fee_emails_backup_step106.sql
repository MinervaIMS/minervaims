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