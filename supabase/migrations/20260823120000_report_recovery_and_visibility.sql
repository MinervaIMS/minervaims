-- =====================================================================
-- Reports: a recovery window for deletions, and public visibility that
-- respects the report's own status.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Deleting a report no longer destroys it.
--
-- `delete` used to remove the row and the stored PDF in one call, so a
-- mistaken deletion was final: the file, the title, the division, the
-- date and every reference to it were gone at once. The row is now
-- stamped instead, and the admin-files function treats a stamped row as
-- deleted everywhere. Nothing about the report's data or its
-- relationships changes during the window, so restoring it is a matter
-- of clearing the stamp.
--
-- The partial index is deliberately partial: almost every row has a null
-- here, and only the handful that do not are ever queried by it.
-- ---------------------------------------------------------------------
ALTER TABLE public.archive_files
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.archive_files.deleted_at IS
  'When the report was deleted. Recoverable for 30 days from this moment; purged permanently afterwards. Null means live.';

CREATE INDEX IF NOT EXISTS archive_files_deleted_at_idx
  ON public.archive_files (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. The public read policy also excludes deleted reports.
--
-- It already required `status = 'published'`, which is what keeps drafts
-- and blocked reports off the public site for a signed-out visitor. It
-- said nothing about deletion, because until now deletion removed the
-- row. Recovering a deleted report must not put it back on the public
-- website behind anyone's back, so the two conditions are stated
-- together: public means published AND not deleted.
--
-- The staff policy is untouched. Staff continue to see every report,
-- including drafts, blocked reports and the recycle bin, which is what
-- the workspace archive needs in order to offer them back.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "archive files public read" ON public.archive_files;

CREATE POLICY "archive files public read"
ON public.archive_files
FOR SELECT
TO anon, authenticated
USING (status = 'published' AND deleted_at IS NULL);
