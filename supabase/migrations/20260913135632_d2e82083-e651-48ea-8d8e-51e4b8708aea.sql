ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.applications.priority IS
  'Screening marker: this candidacy has been flagged to be looked at first. Off by default. Set only by the roles that manage Candidate Screening (President, Admin, Vice President, Head of Asset Management, Heads of Division) through the admin-applications edge function. Carries no meaning in the status flow and triggers no email.';

CREATE INDEX IF NOT EXISTS applications_priority_idx
  ON public.applications (priority)
  WHERE priority = true;