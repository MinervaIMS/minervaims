
-- 1. admin_users: explicit deny for anon/authenticated; revoke direct grants
REVOKE ALL ON public.admin_users FROM anon, authenticated;
DROP POLICY IF EXISTS "Deny all client access to admin_users" ON public.admin_users;
CREATE POLICY "Deny all client access to admin_users"
  ON public.admin_users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 2. profiles: INSERT policy restricting to self
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. user_roles: prevent self-promotion. Replace insert policy.
DROP POLICY IF EXISTS "Admin can insert roles" ON public.user_roles;
CREATE POLICY "Admin can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
CREATE POLICY "Admin can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

-- 4. archive_files: admin write policies (so service role isn't required client-side)
DROP POLICY IF EXISTS "Admins can insert archive files" ON public.archive_files;
CREATE POLICY "Admins can insert archive files"
  ON public.archive_files
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update archive files" ON public.archive_files;
CREATE POLICY "Admins can update archive files"
  ON public.archive_files
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete archive files" ON public.archive_files;
CREATE POLICY "Admins can delete archive files"
  ON public.archive_files
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5. Fix mutable search_path on pgmq wrapper functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 6. Revoke EXECUTE on server-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.verify_admin_credentials(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trim_activity_logs() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- 7. Tighten public storage bucket listing — remove broad SELECT policies.
-- Direct public file URLs (storage/v1/object/public/...) continue to work because they bypass RLS.
DROP POLICY IF EXISTS "Archive files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Event posters are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Team photos are publicly accessible" ON storage.objects;
