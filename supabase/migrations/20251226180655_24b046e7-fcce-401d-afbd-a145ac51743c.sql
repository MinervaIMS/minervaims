-- Fix overly permissive storage policies

-- Team Photos: Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload team photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team photos" ON storage.objects;

-- Archive Files: Drop and recreate with service role
DROP POLICY IF EXISTS "Service role can upload archive files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete archive files" ON storage.objects;

-- Team Photos: Service role only for write operations (edge functions use service role)
CREATE POLICY "Service role can manage team photos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'team-photos')
WITH CHECK (bucket_id = 'team-photos');

-- Archive Files: Service role only for write operations  
CREATE POLICY "Service role can manage archive files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'archive-files')
WITH CHECK (bucket_id = 'archive-files');