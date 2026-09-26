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
CREATE UNIQUE INDEX IF NOT EXISTS career_files_single_kind ON public.career_files (kind) WHERE kind <> 'wallpaper';
CREATE INDEX IF NOT EXISTS career_files_kind_order ON public.career_files (kind, display_order, created_at);
REVOKE ALL ON public.career_files FROM anon, authenticated;
GRANT ALL ON public.career_files TO service_role;
ALTER TABLE public.career_files ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_career_files_updated_at ON public.career_files;
CREATE TRIGGER update_career_files_updated_at BEFORE UPDATE ON public.career_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.gpa_calculations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  system        text NOT NULL CHECK (char_length(system) BETWEEN 1 AND 40),
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  courses       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(courses) = 'array' AND jsonb_array_length(courses) <= 200),
  average       numeric,
  total_weight  numeric,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gpa_calculations_user ON public.gpa_calculations (user_id, updated_at DESC);
REVOKE ALL ON public.gpa_calculations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gpa_calculations TO authenticated;
GRANT ALL ON public.gpa_calculations TO service_role;
ALTER TABLE public.gpa_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own gpa calculations: read" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: read" ON public.gpa_calculations FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: add" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: add" ON public.gpa_calculations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: change" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: change" ON public.gpa_calculations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own gpa calculations: delete" ON public.gpa_calculations;
CREATE POLICY "own gpa calculations: delete" ON public.gpa_calculations FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP TRIGGER IF EXISTS update_gpa_calculations_updated_at ON public.gpa_calculations;
CREATE TRIGGER update_gpa_calculations_updated_at BEFORE UPDATE ON public.gpa_calculations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();