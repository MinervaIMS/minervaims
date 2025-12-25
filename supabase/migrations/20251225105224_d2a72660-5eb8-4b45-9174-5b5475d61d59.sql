-- Fix #1: Add RLS policy for admin_users to allow service role access
CREATE POLICY "Service role can access admin_users"
ON public.admin_users
FOR SELECT
TO service_role
USING (true);

-- Fix #2: Update admin password to bcrypt hash
-- bcrypt hash of 'admin123' with cost factor 10
UPDATE public.admin_users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';