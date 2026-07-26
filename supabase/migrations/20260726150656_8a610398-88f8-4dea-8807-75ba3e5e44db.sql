-- archive_files: split public (published) read from staff read
DROP POLICY IF EXISTS "archive files visibility" ON public.archive_files;

CREATE POLICY "archive files public read"
ON public.archive_files
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "archive files staff read"
ON public.archive_files
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- calendar_entries: staff read policy should only apply to signed-in users
DROP POLICY IF EXISTS "calendar entries readable by staff" ON public.calendar_entries;

CREATE POLICY "calendar entries readable by staff"
ON public.calendar_entries
FOR SELECT
TO authenticated
USING (
  public.is_staff(auth.uid())
  AND (
    entry_type <> ALL (ARRAY['casa_committee'::text, 'casa_deadline'::text])
    OR public.is_board_member(auth.uid())
  )
);

-- Signed-out visitors never need the staff check
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
