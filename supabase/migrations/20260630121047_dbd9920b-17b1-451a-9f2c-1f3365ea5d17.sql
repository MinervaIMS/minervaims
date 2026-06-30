
CREATE TABLE IF NOT EXISTS public.application_questions (
  division    public.org_division PRIMARY KEY,
  question    text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.application_questions TO anon, authenticated;
GRANT ALL ON public.application_questions TO service_role;

ALTER TABLE public.application_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions are public" ON public.application_questions;
CREATE POLICY "questions are public"
  ON public.application_questions FOR SELECT
  USING (true);

INSERT INTO public.application_questions (division, question) VALUES
  ('equity',     'Equity Research — written question to be set by the Head of Division.'),
  ('investment', 'Investment Research — written question to be set by the Head of Division.'),
  ('macro',      'Macro Research — written question to be set by the Head of Division.'),
  ('portfolio',  'Portfolio Management — written question to be set by the Head of Division.'),
  ('quant',      'Quantitative Research — written question to be set by the Head of Division.')
ON CONFLICT (division) DO NOTHING;


CREATE TABLE IF NOT EXISTS public.applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  semester_label  text NOT NULL,
  first_name      text NOT NULL,
  surname         text NOT NULL,
  bocconi_id      text NOT NULL,
  email           text NOT NULL,
  phone           text NOT NULL,
  linkedin_url    text,
  degree_course   text NOT NULL,
  academic_year   text NOT NULL CHECK (academic_year IN
                    ('bachelor_1','bachelor_2','bachelor_3','master_1','master_2','exchange')),
  cv_path         text,
  answer_path     text,
  first_choice    public.org_division NOT NULL,
  second_choice   public.org_division,
  status          text NOT NULL DEFAULT 'received' CHECK (status IN (
                    'received','cv_opened','under_review','to_be_contacted',
                    'interview_invitation_sent','waiting_interview_confirmation',
                    'interview_confirmed','interview_completed','accepted','rejected',
                    'offer_accepted','offer_declined','joined')),
  cv_viewed_at    timestamptz,
  cv_viewed_by    uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_user_semester_uidx
  ON public.applications (user_id, semester_label);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications(status);
CREATE INDEX IF NOT EXISTS applications_first_choice_idx ON public.applications(first_choice);

GRANT SELECT ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applicants read own application" ON public.applications;
CREATE POLICY "applicants read own application"
  ON public.applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.application_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES auth.users(id),
  author_name     text,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_notes_app_idx ON public.application_notes(application_id);

GRANT ALL ON public.application_notes TO service_role;

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
