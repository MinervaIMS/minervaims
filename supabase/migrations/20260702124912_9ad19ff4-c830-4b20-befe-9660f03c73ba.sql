DROP POLICY IF EXISTS "workspace resources readable by staff" ON storage.objects;
CREATE POLICY "workspace resources readable by staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'workspace-resources' AND public.is_staff(auth.uid()));