-- Create policy for uploading to archive-files bucket (service role only via edge function)
CREATE POLICY "Service role can upload archive files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'archive-files');

-- Create policy for deleting from archive-files bucket
CREATE POLICY "Service role can delete archive files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'archive-files');