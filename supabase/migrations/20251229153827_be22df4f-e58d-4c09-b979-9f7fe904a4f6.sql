-- First, update any pending users to member
UPDATE public.user_roles SET role = 'member' WHERE role = 'pending';

-- Update co-heads to their head equivalents
UPDATE public.user_roles SET role = 'head_of_equity' WHERE role = 'co_head_of_equity';
UPDATE public.user_roles SET role = 'head_of_investment' WHERE role = 'co_head_of_investment';
UPDATE public.user_roles SET role = 'head_of_macro' WHERE role = 'co_head_of_macro';
UPDATE public.user_roles SET role = 'head_of_portfolio' WHERE role = 'co_head_of_portfolio';
UPDATE public.user_roles SET role = 'head_of_quant' WHERE role = 'co_head_of_quant';
UPDATE public.user_roles SET role = 'head_of_operations' WHERE role = 'co_head_of_operations';
UPDATE public.user_roles SET role = 'head_of_media' WHERE role = 'co_head_of_media';

-- Drop the has_role function that depends on app_role
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Create new enum type without co-heads and pending
CREATE TYPE public.app_role_v2 AS ENUM (
  'admin',
  'president',
  'vice_president',
  'head_of_asset_management',
  'head_of_equity',
  'head_of_investment',
  'head_of_macro',
  'head_of_portfolio',
  'head_of_quant',
  'head_of_operations',
  'head_of_media',
  'member'
);

-- Drop the default first
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Update the column to use the new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_v2 
  USING role::text::public.app_role_v2;

-- Set new default
ALTER TABLE public.user_roles 
  ALTER COLUMN role SET DEFAULT 'member'::public.app_role_v2;

-- Drop the old enum and rename new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_v2 RENAME TO app_role;

-- Recreate the has_role function with the new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update the handle_new_user function to use 'member' instead of 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  IF NEW.email = 'as.minerva@unibocconi.it' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'president');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$;