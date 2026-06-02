DROP POLICY IF EXISTS "Event posters are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Event managers can upload event posters" ON storage.objects;
DROP POLICY IF EXISTS "Event managers can update event posters" ON storage.objects;
DROP POLICY IF EXISTS "Event managers can delete event posters" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage event posters" ON storage.objects;

CREATE POLICY "Event posters are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-posters');

CREATE POLICY "Event managers can upload event posters"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-posters'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN (
          'admin',
          'president',
          'vice_president',
          'head_of_asset_management',
          'head_of_operations',
          'head_of_media',
          'head_of_equity',
          'head_of_investment',
          'head_of_macro',
          'head_of_portfolio',
          'head_of_quant'
        )
    )
  )
);

CREATE POLICY "Event managers can update event posters"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-posters'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN (
          'admin',
          'president',
          'vice_president',
          'head_of_asset_management',
          'head_of_operations',
          'head_of_media',
          'head_of_equity',
          'head_of_investment',
          'head_of_macro',
          'head_of_portfolio',
          'head_of_quant'
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'event-posters'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN (
          'admin',
          'president',
          'vice_president',
          'head_of_asset_management',
          'head_of_operations',
          'head_of_media',
          'head_of_equity',
          'head_of_investment',
          'head_of_macro',
          'head_of_portfolio',
          'head_of_quant'
        )
    )
  )
);

CREATE POLICY "Event managers can delete event posters"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-posters'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN (
          'admin',
          'president',
          'vice_president',
          'head_of_asset_management',
          'head_of_operations',
          'head_of_media',
          'head_of_equity',
          'head_of_investment',
          'head_of_macro',
          'head_of_portfolio',
          'head_of_quant'
        )
    )
  )
);

CREATE POLICY "Service role can manage event posters"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'event-posters')
WITH CHECK (bucket_id = 'event-posters');