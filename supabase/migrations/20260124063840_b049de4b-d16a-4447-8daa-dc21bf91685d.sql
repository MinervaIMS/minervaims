-- Drop the overly permissive admin policy
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Create a more restrictive policy that only allows president to view all profiles
-- This prevents lower-level admins from harvesting user emails
CREATE POLICY "President can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow president role only (not general admin)
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'president'
  )
  OR 
  -- Allow the specific admin email
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'as.minerva@unibocconi.it'
  )
);