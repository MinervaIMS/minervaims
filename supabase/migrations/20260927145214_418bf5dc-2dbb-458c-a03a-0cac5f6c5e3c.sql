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