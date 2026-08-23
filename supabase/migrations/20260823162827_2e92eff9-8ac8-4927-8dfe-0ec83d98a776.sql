ALTER TABLE public.archive_files
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.archive_files.deleted_at IS
  'When the report was deleted. Recoverable for 30 days from this moment; purged permanently afterwards. Null means live.';

CREATE INDEX IF NOT EXISTS archive_files_deleted_at_idx
  ON public.archive_files (deleted_at)
  WHERE deleted_at IS NOT NULL;

DROP POLICY IF EXISTS "archive files public read" ON public.archive_files;

CREATE POLICY "archive files public read"
ON public.archive_files
FOR SELECT
TO anon, authenticated
USING (status = 'published' AND deleted_at IS NULL);