-- Update is_admin function to also check for 'president' role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND email = 'as.minerva@unibocconi.it'
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'president')
  )
$function$;

-- Update handle_new_user trigger to assign 'president' role to admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- If admin email, assign president role; otherwise assign pending
  IF NEW.email = 'as.minerva@unibocconi.it' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'president');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
  END IF;
  
  RETURN NEW;
END;
$function$;