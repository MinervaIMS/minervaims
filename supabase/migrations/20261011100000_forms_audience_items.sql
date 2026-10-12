-- =====================================================================
-- STEP 89. Forms: who a form is for, and more than one item per answer.
-- Safe to run twice. Nothing existing changes: every form stays for
-- members only, with one item per answer, until an organiser says
-- otherwise.
-- ---------------------------------------------------------------------
-- 1. internal_forms.audience: 'internal' (the Society's active members,
--    signed in: as before), 'external' (guests, by link) or 'both'.
-- 2. internal_forms.items_max (1 to 5) and item_label ("Hoodie"): with
--    more than 1, people can add another item ("Want another one?"),
--    and the questions of one item are asked again for each extra one.
--    The extra items are kept inside the answer (see the forms rules);
--    no column is needed for them.
-- 3. internal_form_responses can now hold a guest's answer:
--      respondent   'member' (an account, as before) or 'guest';
--      user_id      empty for a guest;
--      member_name / member_email  the name and email the guest typed;
--      access_hash  the SHA-256 of the private link the guest received
--                   with their receipt, which is the only way to open
--                   or change their answer (the link itself is never
--                   stored);
--      client_hash  a one-way code made from the guest's connection,
--                   used only to stop automated abuse (a limit on how
--                   many answers one connection can send in an hour).
--    One answer per email per form for guests, as one per account for
--    members.
-- The tables keep RLS on with no policy: the internal-forms function is
-- still the only way in.
-- =====================================================================

-- ── 1 and 2. The form ───────────────────────────────────────────────
ALTER TABLE public.internal_forms ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'internal';
ALTER TABLE public.internal_forms DROP CONSTRAINT IF EXISTS internal_forms_audience_check;
ALTER TABLE public.internal_forms ADD CONSTRAINT internal_forms_audience_check
  CHECK (audience IN ('internal', 'external', 'both'));

ALTER TABLE public.internal_forms ADD COLUMN IF NOT EXISTS items_max smallint NOT NULL DEFAULT 1;
ALTER TABLE public.internal_forms DROP CONSTRAINT IF EXISTS internal_forms_items_max_check;
ALTER TABLE public.internal_forms ADD CONSTRAINT internal_forms_items_max_check
  CHECK (items_max BETWEEN 1 AND 5);

ALTER TABLE public.internal_forms ADD COLUMN IF NOT EXISTS item_label text;
ALTER TABLE public.internal_forms DROP CONSTRAINT IF EXISTS internal_forms_item_label_check;
ALTER TABLE public.internal_forms ADD CONSTRAINT internal_forms_item_label_check
  CHECK (item_label IS NULL OR char_length(btrim(item_label)) BETWEEN 1 AND 40);

-- ── 3. The answers ──────────────────────────────────────────────────
ALTER TABLE public.internal_form_responses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.internal_form_responses ADD COLUMN IF NOT EXISTS respondent text NOT NULL DEFAULT 'member';
ALTER TABLE public.internal_form_responses ADD COLUMN IF NOT EXISTS access_hash text;
ALTER TABLE public.internal_form_responses ADD COLUMN IF NOT EXISTS client_hash text;

ALTER TABLE public.internal_form_responses DROP CONSTRAINT IF EXISTS internal_form_responses_respondent_check;
ALTER TABLE public.internal_form_responses ADD CONSTRAINT internal_form_responses_respondent_check
  CHECK (
    (respondent = 'member' AND user_id IS NOT NULL)
    OR (respondent = 'guest' AND user_id IS NULL AND member_email IS NOT NULL AND member_name IS NOT NULL AND access_hash IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS internal_form_responses_guest_email
  ON public.internal_form_responses (form_id, lower(member_email)) WHERE respondent = 'guest';
CREATE UNIQUE INDEX IF NOT EXISTS internal_form_responses_access
  ON public.internal_form_responses (access_hash) WHERE access_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS internal_form_responses_client
  ON public.internal_form_responses (client_hash, submitted_at) WHERE client_hash IS NOT NULL;

-- Unchanged, said again: closed to the browser.
REVOKE ALL ON public.internal_forms FROM anon, authenticated;
REVOKE ALL ON public.internal_form_responses FROM anon, authenticated;
GRANT ALL ON public.internal_forms TO service_role;
GRANT ALL ON public.internal_form_responses TO service_role;
