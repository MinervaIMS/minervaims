## Diagnosis

The app code now points uploads to the correct `event-posters` bucket and accepts JPG, JPEG, PNG, and PDF. The remaining issue is backend storage access: there are currently no object access policies for `event-posters`, while `archive-files` and `team-photos` do have policies. Because file uploads are done directly from the browser as a signed-in admin, the bucket being public is not enough; signed-in users also need explicit permission to create objects in that bucket.

## Implementation plan

1. **Add storage policies for event posters**
   - Add a migration for `storage.objects` policies on the existing `event-posters` bucket.
   - Allow public viewing of poster files.
   - Allow signed-in users to upload event poster files.
   - Allow signed-in users to update/delete poster files if needed later.
   - Keep service-role management access for backend/admin operations.

2. **Make the upload error visible**
   - Update the poster upload catch block so the toast shows the actual storage error message instead of only “Could not upload poster.”
   - Keep the console error for debugging.

3. **Keep accepted formats unchanged**
   - Preserve support for `.jpg`, `.jpeg`, `.png`, and `.pdf` through both MIME type and extension fallback.

4. **Verify after implementation**
   - Confirm the `event-posters` storage policies exist.
   - Confirm the frontend still uploads to `event-posters` and no longer references `team-photos` for posters.