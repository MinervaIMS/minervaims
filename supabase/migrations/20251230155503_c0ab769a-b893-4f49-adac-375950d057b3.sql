-- Drop existing policy
DROP POLICY IF EXISTS "Service role can access admin_users" ON public.admin_users;

-- Create a secure function to verify admin credentials
-- This function runs with definer privileges and doesn't expose the password hash
CREATE OR REPLACE FUNCTION public.verify_admin_credentials(
  _username TEXT,
  _password TEXT
)
RETURNS TABLE (
  admin_id UUID,
  admin_username TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_username TEXT;
  v_password_hash TEXT;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- Fetch the admin user
  SELECT id, username, password_hash 
  INTO v_admin_id, v_admin_username, v_password_hash
  FROM public.admin_users
  WHERE admin_users.username = _username;
  
  -- If user found, verify password using crypt (pgcrypto)
  IF v_admin_id IS NOT NULL THEN
    v_is_valid := (v_password_hash = crypt(_password, v_password_hash));
  END IF;
  
  RETURN QUERY SELECT v_admin_id, v_admin_username, v_is_valid;
END;
$$;

-- Revoke direct access to the function from anon/authenticated
REVOKE ALL ON FUNCTION public.verify_admin_credentials(TEXT, TEXT) FROM anon, authenticated;

-- Grant execute only to service_role (for edge functions)
GRANT EXECUTE ON FUNCTION public.verify_admin_credentials(TEXT, TEXT) TO service_role;

-- No RLS policies needed - the table is completely inaccessible via API
-- Only the verify_admin_credentials function can access it (with SECURITY DEFINER)