ALTER TABLE public.membership_certificates
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS membership_certificates_issued
  ON public.membership_certificates (issued_at DESC);