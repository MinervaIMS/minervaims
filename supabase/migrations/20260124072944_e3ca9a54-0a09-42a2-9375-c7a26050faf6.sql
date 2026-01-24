-- Drop the existing policy for president
DROP POLICY IF EXISTS "President can view all profiles" ON public.profiles;

-- Create a new policy that allows admin (via is_admin function) to view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  is_admin(auth.uid())
);
