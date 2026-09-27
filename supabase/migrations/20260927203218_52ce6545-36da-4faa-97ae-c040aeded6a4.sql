CREATE OR REPLACE FUNCTION public.members_full_read(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','president','vice_president','head_of_asset_management',
                   'head_of_division','head_of_equity','head_of_investment','head_of_macro',
                   'head_of_portfolio','head_of_quant','head_of_media','head_of_operations',
                   'advisor','silent_advisor','media_analyst')
  )
$$;