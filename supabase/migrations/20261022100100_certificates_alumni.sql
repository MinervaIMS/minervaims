-- =====================================================================
-- STEP 90. Certificates for alumni, and validity that follows the holder.
-- ---------------------------------------------------------------------
-- A former member listed among the alumni can now download a certificate
-- of the LAST semester they served (supabase/functions/membership-
-- certificate). It reads "was a member", is signed by the Board in office
-- when it is issued, and is not tied to a member record (they no longer
-- have one), so member_id stays empty for it.
--
-- holder_status says which kind a certificate is:
--   'member'  issued to an active member for the current semester (every
--             certificate issued so far);
--   'alumni'  issued to a former member for the last semester they served.
--
-- Whether a certificate is still VALID is decided when it is checked, not
-- stored: it is valid while its holder is a member or an alumnus and the
-- Board has not withdrawn it. Nothing existing changes.
--
-- Safe to run twice.
-- =====================================================================

ALTER TABLE public.membership_certificates
  ADD COLUMN IF NOT EXISTS holder_status text NOT NULL DEFAULT 'member';

ALTER TABLE public.membership_certificates DROP CONSTRAINT IF EXISTS membership_certificates_holder_status_check;
ALTER TABLE public.membership_certificates ADD CONSTRAINT membership_certificates_holder_status_check
  CHECK (holder_status IN ('member', 'alumni'));
