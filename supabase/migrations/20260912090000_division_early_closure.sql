-- =====================================================================
-- CLOSING ONE DIVISION'S APPLICATIONS BEFORE THE ROUND ENDS.
-- ---------------------------------------------------------------------
-- The recruitment window is a single pair of dates for the whole
-- association, which is right for opening: every division opens at once.
-- It is wrong for closing. A division that has filled its places three
-- days into a two-week round has nothing left to offer, and every
-- application it receives afterwards is a candidate who will be turned
-- away and a CV somebody has to read.
--
-- So the window keeps deciding WHEN the round runs, and this column
-- decides WHICH DIVISIONS are still taking part in it. It holds the
-- divisions that have closed early, as the values the application form
-- stores in `applications.first_choice` ('equity', 'macro', 'media'...).
-- Empty is the ordinary case and the default: nothing closed early.
--
-- WHEN EVERY DIVISION IS IN IT the association is no longer recruiting,
-- and the public site says so exactly as it does after the closing date:
-- the readers derive "accepting applications" from the window AND this
-- column together, so one rule covers both ways a round can end.
--
-- Text rather than the org_division enum, deliberately: the enum holds
-- divisions nobody applies to (board, none) and the set that can close is
-- the set the form offers. The edge function validates against that list
-- before writing, and every reader intersects with it, so a value that
-- should not be here cannot affect anything if it ever arrives.
-- =====================================================================

ALTER TABLE public.application_settings
  ADD COLUMN IF NOT EXISTS closed_divisions text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.application_settings.closed_divisions IS
  'Divisions whose applications closed early, inside an open recruitment window. Empty means every division is taking part. Written by admin-settings, read publicly alongside the window dates.';
