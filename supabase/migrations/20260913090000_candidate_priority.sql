-- =====================================================================
-- Candidate screening: PRIORITY.
-- ---------------------------------------------------------------------
-- A marker a reviewer puts on a candidacy worth looking at first. It is
-- deliberately NOT part of the status flow: it says nothing about where
-- a candidate has reached, it does not move them, and it sends nothing.
-- It is off for everybody until somebody turns it on.
--
-- NOT NULL with a default, so every existing row and every new
-- application starts at false and no reader has to treat NULL as a third
-- state.
-- =====================================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.applications.priority IS
  'Screening marker: this candidacy has been flagged to be looked at first. Off by default. Set only by the roles that manage Candidate Screening (President, Admin, Vice President, Head of Asset Management, Heads of Division) through the admin-applications edge function. Carries no meaning in the status flow and triggers no email.';

-- Reviewers sort and filter on it, and the flagged rows are always the
-- small part of an intake, so the index only carries them.
CREATE INDEX IF NOT EXISTS applications_priority_idx
  ON public.applications (priority)
  WHERE priority = true;
