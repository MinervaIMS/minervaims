CREATE POLICY "Admins can read application documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'applications'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'president')
    OR public.has_role(auth.uid(), 'vice_president')
    OR public.has_role(auth.uid(), 'head_of_asset_management')
  )
);