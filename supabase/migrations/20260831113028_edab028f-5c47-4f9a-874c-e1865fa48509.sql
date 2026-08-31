CREATE TABLE public.auth_link_receipts (
  token_sha256 text PRIMARY KEY,
  user_id uuid,
  email text,
  action_type text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_link_receipts TO service_role;

ALTER TABLE public.auth_link_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX auth_link_receipts_expires_idx ON public.auth_link_receipts (expires_at);

COMMENT ON TABLE public.auth_link_receipts IS 'One row per auth link mailed: the SHA-256 of the emailed token hash, so a second click on a spent link can be recognised as "already confirmed" instead of an error. Never stores the token itself. Service role only.';