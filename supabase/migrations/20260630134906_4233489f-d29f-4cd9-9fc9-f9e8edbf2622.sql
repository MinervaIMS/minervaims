
CREATE TABLE IF NOT EXISTS public.fee_periods (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_label     text NOT NULL UNIQUE,
  fee_amount         numeric NOT NULL DEFAULT 10,
  closed             boolean NOT NULL DEFAULT false,
  closed_at          timestamptz,
  treasury_entry_id  uuid,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_fees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     uuid NOT NULL REFERENCES public.fee_periods(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  paid          boolean NOT NULL DEFAULT false,
  amount        numeric,
  collected_by  uuid REFERENCES auth.users(id),
  collected_at  timestamptz,
  UNIQUE (period_id, member_id)
);

CREATE INDEX IF NOT EXISTS membership_fees_period_idx ON public.membership_fees(period_id);

GRANT SELECT ON public.fee_periods TO authenticated;
GRANT SELECT ON public.membership_fees TO authenticated;
GRANT ALL ON public.fee_periods TO service_role;
GRANT ALL ON public.membership_fees TO service_role;

ALTER TABLE public.fee_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee periods readable by staff" ON public.fee_periods FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "membership fees readable by staff" ON public.membership_fees FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


CREATE TABLE IF NOT EXISTS public.treasury_entries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount             numeric NOT NULL,
  flow               text NOT NULL CHECK (flow IN ('in', 'out')),
  description        text NOT NULL,
  source             text,
  execution_date     date NOT NULL,
  registration_date  date NOT NULL DEFAULT current_date,
  academic_semester  text,
  is_auto            boolean NOT NULL DEFAULT false,
  locked             boolean NOT NULL DEFAULT false,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasury_entries_date_idx ON public.treasury_entries(execution_date DESC);

GRANT SELECT ON public.treasury_entries TO authenticated;
GRANT ALL ON public.treasury_entries TO service_role;

ALTER TABLE public.treasury_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury readable by staff" ON public.treasury_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


CREATE TABLE IF NOT EXISTS public.auto_email_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  name         text NOT NULL,
  subject      text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',
  description  text,
  updated_by   uuid REFERENCES auth.users(id),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auto_email_templates TO authenticated;
GRANT ALL ON public.auto_email_templates TO service_role;

ALTER TABLE public.auto_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto email templates readable by staff" ON public.auto_email_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_auto_email_templates_updated_at
  BEFORE UPDATE ON public.auto_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.auto_email_templates (key, name, description) VALUES
  ('application_received', 'Application received', 'Sent to a candidate when their application is submitted.'),
  ('candidate_status',     'Candidate status update', 'Sent when a candidate''s status changes.'),
  ('event_registration',   'Event registration confirmation', 'Sent to confirm an event registration.'),
  ('membership_confirmed', 'Membership confirmation', 'Sent when a new member is approved.'),
  ('fee_reminder',         'Membership fee reminder', 'Sent to members with an outstanding fee.'),
  ('newsletter_welcome',   'Newsletter subscription', 'Sent when someone subscribes to the newsletter.')
ON CONFLICT (key) DO NOTHING;
