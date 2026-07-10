ALTER TABLE public.auto_email_templates 
  ADD COLUMN IF NOT EXISTS trigger_description text,
  ADD COLUMN IF NOT EXISTS recipient_description text,
  ADD COLUMN IF NOT EXISTS schedule_description text;