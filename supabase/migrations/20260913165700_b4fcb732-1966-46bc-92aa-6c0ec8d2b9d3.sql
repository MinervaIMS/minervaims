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

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

INSERT INTO public.auto_email_templates (key, name, description, subject, body, connected)
VALUES (
  'application_withdrawn',
  'Application withdrawn',
  'Sent to the candidate when they withdraw their own application from the workspace.',
  'Your application has been withdrawn | Minerva IMS',
  '<p>Placeholder: synced from the branded code template.</p>',
  true
)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      subject = EXCLUDED.subject, connected = true;

INSERT INTO public.application_email_map (trigger_code, template_key, description) VALUES
  ('event:application_withdrawn', 'application_withdrawn',
   'The candidate withdrew their own application from the Status page.')
ON CONFLICT (trigger_code) DO UPDATE
  SET template_key = EXCLUDED.template_key, description = EXCLUDED.description;