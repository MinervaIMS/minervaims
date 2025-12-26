-- Add storage policy to allow authenticated users to upload files to archive-files bucket
-- This is needed because file uploads happen directly from the client before the edge function is called

-- Policy for INSERT (uploading files)
CREATE POLICY "Authenticated users can upload archive files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'archive-files');

-- Policy for UPDATE (replacing files)
CREATE POLICY "Authenticated users can update archive files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'archive-files')
WITH CHECK (bucket_id = 'archive-files');

-- Policy for DELETE (removing files)
CREATE POLICY "Authenticated users can delete archive files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'archive-files');