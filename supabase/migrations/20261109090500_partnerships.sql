-- =====================================================================
-- PARTNERSHIPS (Step 105).
-- ---------------------------------------------------------------------
-- The website's former "Partnerships" page, about working with companies,
-- is now "Company relations" (/company-relations). "Partnerships"
-- (/partnerships) is a new page for the association's agreements and
-- joint initiatives with SERVICE PROVIDERS and OTHER STUDENT
-- ASSOCIATIONS, edited by the Board in Website > Partnerships.
--
-- 1. public.partnerships: one row per partner. A visitor reads the
--    published rows only; the workspace reads and writes everything
--    through the admin-partnerships function (service role), which checks
--    the access matrix ('website-partnerships') and records every change
--    in Activity tracking. Nobody writes the table from the browser.
-- 2. partner-logos: a public bucket for the logos, images only, 2 MB at
--    most. Uploads use a signed link the function issues to an editor;
--    the browser has no write policy on it.
--
-- The table starts empty, and the page says so until the first partner is
-- published. Nothing existing is changed. Safe to run twice.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.partnerships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  kind          text NOT NULL,
  summary       text,
  url           text,
  logo_url      text,
  display_order integer NOT NULL DEFAULT 0,
  published     boolean NOT NULL DEFAULT true,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnerships_kind_check') THEN
    ALTER TABLE public.partnerships ADD CONSTRAINT partnerships_kind_check
      CHECK (kind IN ('service_provider', 'student_association'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnerships_name_check') THEN
    ALTER TABLE public.partnerships ADD CONSTRAINT partnerships_name_check
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 160);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnerships_summary_check') THEN
    ALTER TABLE public.partnerships ADD CONSTRAINT partnerships_summary_check
      CHECK (summary IS NULL OR char_length(summary) <= 600);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnerships_url_check') THEN
    ALTER TABLE public.partnerships ADD CONSTRAINT partnerships_url_check
      CHECK (url IS NULL OR url ~* '^https?://[^ ]+$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS partnerships_order_idx ON public.partnerships (kind, display_order);

ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partnerships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partnerships TO anon, authenticated;
GRANT ALL ON public.partnerships TO service_role;

DROP POLICY IF EXISTS partnerships_public_read ON public.partnerships;
CREATE POLICY partnerships_public_read ON public.partnerships
  FOR SELECT TO anon, authenticated USING (published);

DROP TRIGGER IF EXISTS update_partnerships_updated_at ON public.partnerships;
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON public.partnerships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner-logos', 'partner-logos', true, 2097152,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE
   SET public = true, file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
