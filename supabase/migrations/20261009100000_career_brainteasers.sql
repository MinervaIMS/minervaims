-- =====================================================================
-- STEP 88. Career > Brainteasers. Safe to run twice.
-- ---------------------------------------------------------------------
-- 1. public.brainteasers: the questions, their type, the firms they are
--    attributed to and their worked solutions. Loaded once from the
--    starter set in supabase/functions/career-brainteasers/seed.ts the
--    first time the page is opened, then corrected and added to in the
--    page itself.
-- 2. public.brainteaser_progress: each member's own training record, one
--    row per question they have touched: whether they solved it on their
--    own or needed the solution, a personal "hard" flag, a private note,
--    and when they first opened the solution.
-- 3. The greenbook: one PDF in Career, kept in its own private bucket
--    (career-library, 60 MB) and listed in career_files as kind
--    'greenbook'. Only the President and the admin account replace it;
--    every download is a copy watermarked with the reader's name, and is
--    recorded in public.greenbook_downloads.
--
-- NOTHING HERE IS READABLE FROM THE BROWSER. All three tables have RLS on
-- and no policy, and are revoked from anon and authenticated: the
-- career-brainteasers function (service role) is the only way in, which
-- is what lets it hand a solution out one at a time, never the whole set.
-- =====================================================================

-- ── 1. The questions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brainteasers (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title       text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  field       text NOT NULL CHECK (char_length(btrim(field)) BETWEEN 1 AND 40),
  firms       text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(firms) <= 30),
  question    text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 8000),
  answer      text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 20000),
  sort_order  integer NOT NULL DEFAULT 0,
  hidden      boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brainteasers_order ON public.brainteasers (sort_order, id);
ALTER TABLE public.brainteasers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brainteasers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.brainteasers TO service_role;
DROP TRIGGER IF EXISTS update_brainteasers_updated_at ON public.brainteasers;
CREATE TRIGGER update_brainteasers_updated_at BEFORE UPDATE ON public.brainteasers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. Each member's training record ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.brainteaser_progress (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id   text NOT NULL REFERENCES public.brainteasers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status       text CHECK (status IS NULL OR status IN ('solved', 'needed_help')),
  flagged      boolean NOT NULL DEFAULT false,
  note         text CHECK (note IS NULL OR char_length(note) <= 2000),
  revealed_at  timestamptz,
  status_at    timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
CREATE INDEX IF NOT EXISTS brainteaser_progress_reveals ON public.brainteaser_progress (user_id, revealed_at);
ALTER TABLE public.brainteaser_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brainteaser_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.brainteaser_progress TO service_role;

-- ── 3. The greenbook ────────────────────────────────────────────────
ALTER TABLE public.career_files DROP CONSTRAINT IF EXISTS career_files_kind_check;
ALTER TABLE public.career_files ADD CONSTRAINT career_files_kind_check
  CHECK (kind IN ('cv_template', 'cl_template', 'portrait_background', 'wallpaper', 'greenbook'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('career-library', 'career-library', false, 62914560, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
   SET public = false, file_size_limit = 62914560, allowed_mime_types = ARRAY['application/pdf'];

CREATE TABLE IF NOT EXISTS public.greenbook_downloads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  email         text,
  file_id       uuid,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS greenbook_downloads_user ON public.greenbook_downloads (user_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS greenbook_downloads_when ON public.greenbook_downloads (downloaded_at DESC);
ALTER TABLE public.greenbook_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.greenbook_downloads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.greenbook_downloads TO service_role;
