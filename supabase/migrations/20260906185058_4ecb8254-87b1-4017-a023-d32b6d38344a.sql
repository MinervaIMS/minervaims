CREATE POLICY "Admins can delete application documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'applications'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'president')
    OR public.has_role(auth.uid(), 'vice_president')
    OR public.has_role(auth.uid(), 'head_of_asset_management')
  )
);