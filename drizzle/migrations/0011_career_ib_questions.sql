CREATE TABLE IF NOT EXISTS public.ib_questions (
  id text PRIMARY KEY CHECK (id ~ '^[A-Z]{2}-[A-Z0-9-]{1,30}$'),
  bank text NOT NULL CHECK (bank IN ('redbook', 'blueprint')),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 60),
  section text NOT NULL CHECK (char_length(btrim(section)) BETWEEN 1 AND 80),
  question text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 2000),
  original text CHECK (original IS NULL OR char_length(original) <= 2000),
  kind text NOT NULL DEFAULT 'technical' CHECK (kind IN ('technical', 'completion')),
  instruction text NOT NULL CHECK (char_length(btrim(instruction)) BETWEEN 1 AND 300),
  statement text CHECK (statement IS NULL OR char_length(statement) <= 2000),
  options text[] NOT NULL CHECK (cardinality(options) = 4),
  correct text NOT NULL CHECK (correct IN ('A', 'B', 'C', 'D')),
  explanation text NOT NULL CHECK (char_length(btrim(explanation)) BETWEEN 1 AND 8000),
  page integer CHECK (page IS NULL OR page BETWEEN 1 AND 2000),
  sort_order integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ib_questions_statement_blank CHECK (kind <> 'completion' OR (statement IS NOT NULL AND position('____' IN statement) > 0))
);
CREATE INDEX IF NOT EXISTS ib_questions_order ON public.ib_questions (bank, sort_order, id);
ALTER TABLE public.ib_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ib_questions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ib_questions TO service_role;
DROP TRIGGER IF EXISTS update_ib_questions_updated_at ON public.ib_questions;
CREATE TRIGGER update_ib_questions_updated_at BEFORE UPDATE ON public.ib_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ib_question_progress (
  user_id uuid NOT NULL,
  question_id text NOT NULL REFERENCES public.ib_questions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status text CHECK (status IS NULL OR status IN ('right', 'wrong')),
  choice text CHECK (choice IS NULL OR choice IN ('A', 'B', 'C', 'D')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  flagged boolean NOT NULL DEFAULT false,
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  revealed_at timestamptz,
  status_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS ib_question_progress_reveals ON public.ib_question_progress (user_id, revealed_at);
ALTER TABLE public.ib_question_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ib_question_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ib_question_progress TO service_role;

ALTER TABLE public.career_files DROP CONSTRAINT IF EXISTS career_files_kind_check;
ALTER TABLE public.career_files ADD CONSTRAINT career_files_kind_check
  CHECK (kind IN ('cv_template', 'cl_template', 'portrait_background', 'wallpaper', 'greenbook', 'ib_redbook', 'ib_blueprint'));

CREATE TABLE IF NOT EXISTS public.career_book_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL CHECK (kind IN ('ib_redbook', 'ib_blueprint')),
  name text NOT NULL,
  email text,
  file_id uuid,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS career_book_downloads_user ON public.career_book_downloads (user_id, kind, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS career_book_downloads_when ON public.career_book_downloads (kind, downloaded_at DESC);
ALTER TABLE public.career_book_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_book_downloads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.career_book_downloads TO service_role;