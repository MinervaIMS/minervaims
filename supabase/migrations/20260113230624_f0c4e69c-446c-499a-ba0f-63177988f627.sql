-- Fix storage bucket security: restrict to service_role only
-- This ensures file uploads MUST go through edge functions with proper authorization

-- Drop overly permissive policies for archive-files bucket
DROP POLICY IF EXISTS "Authenticated users can upload archive files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update archive files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete archive files" ON storage.objects;

-- Drop overly permissive policies for team-photos bucket
DROP POLICY IF EXISTS "Authenticated users can upload team photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team photos" ON storage.objects;

-- Keep public read access for both buckets (they are public buckets)
-- Only add service_role policies for write operations

-- Service role can manage archive files (used by admin-files edge function)
DROP POLICY IF EXISTS "Service role can manage archive files" ON storage.objects;
CREATE POLICY "Service role can manage archive files"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'archive-files')
WITH CHECK (bucket_id = 'archive-files');

-- Service role can manage team photos (used by admin-team edge function)
DROP POLICY IF EXISTS "Service role can manage team photos" ON storage.objects;
CREATE POLICY "Service role can manage team photos"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'team-photos')
WITH CHECK (bucket_id = 'team-photos');