-- =====================================================================
-- CAREER: the files behind the new Career section, and saved GPA averages.
-- ---------------------------------------------------------------------
-- 1. A PRIVATE storage bucket, `career`. The CV and cover letter templates
--    are for members only ("not to be circulated outside the society"),
--    so nothing in it is public: files are read through time-limited
--    signed links issued by the `career-files` edge function, which checks
--    the reader's role first. There are no storage policies for anon or
--    authenticated on purpose: only the service role reaches the bucket.
--
-- 2. public.career_files: which file is shown where.
--      cv_template          Career > CV Template             (one at a time)
--      cl_template          Career > Cover Letter Template   (one at a time)
--      portrait_background  Career > LinkedIn, Profile Picture (one at a time)
--      wallpaper            Career > LinkedIn, Wallpaper     (any number)
--    Read and written only by the edge function (service role). Replacing
--    or adding a file is for the President, the Vice President and the
--    Head of Operations (access matrix: career-* at 'manage').
--
-- 3. public.gpa_calculations: the weighted averages a member saves in
--    Career > GPA Converter. PRIVATE TO EACH PERSON: row level security
--    lets a user read, add, change and delete only their own rows, and
--    nobody else, board included, can read them.
--
-- Nothing existing changes. Idempotent.
-- =====================================================================

-- 1. The private bucket (25 MB per file; documents and images only).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career', 'career', false, 26214400,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Which file is shown where.
CREATE TABLE IF NOT EXISTS public.career_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('cv_template', 'cl_template', 'portrait_background', 'wallpaper')),
  label         text CHECK (label IS NULL OR char_length(label) <= 120),
  file_path     text NOT NULL,
  file_name     text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  mime_type     text,
  size_bytes    bigint,
  width         integer,
  height        integer,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- One current file for each single-file kind; wallpapers are a list.
CREATE UNIQUE INDEX IF NOT EXISTS career_files_single_kind
  ON public.career_files (kind) WHERE kind <> 'wallpaper';
CREATE INDEX IF NOT EXISTS career_files_kind_order
  ON public.career_files (kind, display_order, created_at);

ALTER TABLE public.career_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_files FROM anon, authenticated;
GRANT ALL ON public.career_files TO service_role;

DROP TRIGGER IF EXISTS update_career_files_updated_at ON public.career_files;
CREATE TRIGGER update_career_files_updated_at
  BEFORE UPDATE ON public.career_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Saved GPA calculations, private to their owner.
CREATE TABLE IF NOT EXISTS public.gpa_calculations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  system        text NOT NULL CHECK (char_length(system) BETWEEN 1 AND 40),
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  courses       jsonb NOT NULL DEFAULT '[]'::jsonb
                CHECK (jsonb_typeof(courses) = 'array' AND jsonb_array_length(courses) <= 200),
  average       numeric,
  total_weight  numeric,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpa_calculations_user ON public.gpa_calculations (user_id, updated_at DESC);

ALTER TABLE public.gpa_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own gpa calculations: read" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: read" ON public.gpa_calculations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: add" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: add" ON public.gpa_calculations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: change" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: change" ON public.gpa_calculations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: delete" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: delete" ON public.gpa_calculations
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.gpa_calculations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gpa_calculations TO authenticated;
GRANT ALL ON public.gpa_calculations TO service_role;

DROP TRIGGER IF EXISTS update_gpa_calculations_updated_at ON public.gpa_calculations;
CREATE TRIGGER update_gpa_calculations_updated_at
  BEFORE UPDATE ON public.gpa_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
