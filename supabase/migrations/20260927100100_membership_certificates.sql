-- =====================================================================
-- VERIFIED MEMBERSHIP CERTIFICATES.
-- ---------------------------------------------------------------------
-- A member downloads, from My Profile, a PDF certificate of the role they
-- hold in the current semester, signed by the President and the Vice
-- President on behalf of that semester's Board of Directors. Each
-- certificate carries a number (MIMS-26F-7K3Q-9D2X) and a QR code;
-- minervaims.org/verify/<number> confirms it to anybody the member shows
-- it to.
--
-- One row per certificate, written only by the `membership-certificate`
-- function (service role). Nobody reads this table directly: row level
-- security is on and there are no policies. The public verification goes
-- through the same function and returns the name, the role, the semester,
-- the issue date and whether it is valid, and nothing else.
--
--   * It records what was certified AS ISSUED (name, role, semester and
--     the President and Vice President who signed), so the same
--     certificate downloaded again is the same page, and a later change
--     of role does not rewrite it.
--   * Asking again in the same semester and role returns the same
--     certificate and number; a new role in the semester gets a new one.
--   * A certificate is shown as no longer valid once revoked_at is set,
--     or once its holder has been expelled.
--   * Deleting the account deletes its certificates.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.membership_certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE
                 CHECK (code ~ '^MIMS-[0-9]{2}[FS]-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id      uuid REFERENCES public.members(id) ON DELETE SET NULL,
  holder_name    text NOT NULL CHECK (char_length(btrim(holder_name)) BETWEEN 1 AND 160),
  role_label     text NOT NULL CHECK (char_length(btrim(role_label)) BETWEEN 1 AND 120),
  semester_key   text NOT NULL CHECK (semester_key ~ '^[0-9]{4}-(fall|spring)$'),
  semester_label text NOT NULL CHECK (char_length(semester_label) <= 40),
  board          jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(board) = 'array'),
  issued_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  revoked_reason text CHECK (revoked_reason IS NULL OR char_length(revoked_reason) <= 300)
);

CREATE INDEX IF NOT EXISTS membership_certificates_user
  ON public.membership_certificates (user_id, semester_key, issued_at DESC);

REVOKE ALL ON public.membership_certificates FROM anon, authenticated;
GRANT ALL ON public.membership_certificates TO service_role;
ALTER TABLE public.membership_certificates ENABLE ROW LEVEL SECURITY;
