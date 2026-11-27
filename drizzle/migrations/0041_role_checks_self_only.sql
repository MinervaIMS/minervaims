CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'president')
  )
$function$;

CREATE OR REPLACE FUNCTION public.member_division_read(_user_id uuid, _division org_division)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('portfolio_manager','team_leader','senior_analyst','analyst','media_analyst','operations_analyst')
      AND division = _division
  )
$function$;