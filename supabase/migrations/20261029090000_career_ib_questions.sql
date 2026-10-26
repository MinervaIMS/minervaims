-- =====================================================================
-- STEP 101. Career > IB Questions. Safe to run twice.
-- ---------------------------------------------------------------------
-- The page is built as Career > Brainteasers is (migration
-- 20261009100000), on the same model:
--
-- 1. public.ib_questions: the questions of two banks, each with its
--    subject, the subsection of the guide it comes from, four options,
--    the right one and the guide's explanation:
--      redbook    Wall Street Prep, "Investment Banking Interview
--                 Questions" (2020)
--      blueprint  Breaking Into Wall Street, "The 400 Investment Banking
--                 Interview Questions & Answers" (2010)
--    Loaded once from the starter set in
--    supabase/functions/career-ib/seed.ts the first time the page is
--    opened, then corrected, hidden and added to in the page itself.
-- 2. public.ib_question_progress: each member's own record, one row per
--    question they have touched: whether their last answer was right,
--    the option they chose, how many times they answered, a flag, a
--    private note, and when the right answer was first given to them.
-- 3. The two guides: one PDF each in Career, in the same private bucket
--    as the greenbook (career-library), listed in career_files as kinds
--    'ib_redbook' and 'ib_blueprint'. Only the President and the admin
--    account replace them; every download is a copy watermarked with the
--    reader's name and is recorded in public.career_book_downloads.
--
-- NOTHING HERE IS READABLE FROM THE BROWSER. All three tables have RLS on
-- and no policy, and are revoked from anon and authenticated: the
-- career-ib function (service role) is the only way in, which is what
-- lets it hand out a right answer only once the reader has answered.
--
-- Nothing existing is changed or deleted. career_files' list of kinds
-- gains two entries; every kind already allowed stays allowed.
-- =====================================================================

-- ── 1. The questions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_questions (
  id           text PRIMARY KEY CHECK (id ~ '^[A-Z]{2}-[A-Z0-9-]{1,30}$'),
  bank         text NOT NULL CHECK (bank IN ('redbook', 'blueprint')),
  subject      text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 60),
  section      text NOT NULL CHECK (char_length(btrim(section)) BETWEEN 1 AND 80),
  question     text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 2000),
  original     text CHECK (original IS NULL OR char_length(original) <= 2000),
  kind         text NOT NULL DEFAULT 'technical' CHECK (kind IN ('technical', 'completion')),
  instruction  text NOT NULL CHECK (char_length(btrim(instruction)) BETWEEN 1 AND 300),
  statement    text CHECK (statement IS NULL OR char_length(statement) <= 2000),
  options      text[] NOT NULL CHECK (cardinality(options) = 4),
  correct      text NOT NULL CHECK (correct IN ('A', 'B', 'C', 'D')),
  explanation  text NOT NULL CHECK (char_length(btrim(explanation)) BETWEEN 1 AND 8000),
  page         integer CHECK (page IS NULL OR page BETWEEN 1 AND 2000),
  sort_order   integer NOT NULL DEFAULT 0,
  hidden       boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- A statement to complete names the missing term with ____.
  CONSTRAINT ib_questions_statement_blank CHECK (kind <> 'completion' OR (statement IS NOT NULL AND position('____' IN statement) > 0))
);
CREATE INDEX IF NOT EXISTS ib_questions_order ON public.ib_questions (bank, sort_order, id);
ALTER TABLE public.ib_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ib_questions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ib_questions TO service_role;
DROP TRIGGER IF EXISTS update_ib_questions_updated_at ON public.ib_questions;
CREATE TRIGGER update_ib_questions_updated_at BEFORE UPDATE ON public.ib_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. Each member's record ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_question_progress (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id  text NOT NULL REFERENCES public.ib_questions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status       text CHECK (status IS NULL OR status IN ('right', 'wrong')),
  choice       text CHECK (choice IS NULL OR choice IN ('A', 'B', 'C', 'D')),
  attempts     integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  flagged      boolean NOT NULL DEFAULT false,
  note         text CHECK (note IS NULL OR char_length(note) <= 2000),
  revealed_at  timestamptz,
  status_at    timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS ib_question_progress_reveals ON public.ib_question_progress (user_id, revealed_at);
ALTER TABLE public.ib_question_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ib_question_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ib_question_progress TO service_role;

-- ── 3. The two guides ───────────────────────────────────────────────
ALTER TABLE public.career_files DROP CONSTRAINT IF EXISTS career_files_kind_check;
ALTER TABLE public.career_files ADD CONSTRAINT career_files_kind_check
  CHECK (kind IN ('cv_template', 'cl_template', 'portrait_background', 'wallpaper', 'greenbook', 'ib_redbook', 'ib_blueprint'));

-- The bucket the greenbook uses (private, PDFs, 60 MB); created here too
-- in case this runs on a database where it does not exist yet.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('career-library', 'career-library', false, 62914560, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.career_book_downloads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind          text NOT NULL CHECK (kind IN ('ib_redbook', 'ib_blueprint')),
  name          text NOT NULL,
  email         text,
  file_id       uuid,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS career_book_downloads_user ON public.career_book_downloads (user_id, kind, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS career_book_downloads_when ON public.career_book_downloads (kind, downloaded_at DESC);
ALTER TABLE public.career_book_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_book_downloads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.career_book_downloads TO service_role;
