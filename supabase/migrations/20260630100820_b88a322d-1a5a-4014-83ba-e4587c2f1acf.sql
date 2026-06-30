ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_of_division';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'media_analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'silent_advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidate';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'alumni';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_division') THEN
    CREATE TYPE public.org_division AS ENUM (
      'equity',
      'investment',
      'macro',
      'portfolio',
      'quant',
      'media',
      'operations',
      'board',
      'none'
    );
  END IF;
END $$;