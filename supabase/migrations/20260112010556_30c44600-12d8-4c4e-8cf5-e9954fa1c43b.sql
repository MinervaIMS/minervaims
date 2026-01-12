-- Add portfolio_manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'portfolio_manager';

-- Add Advisor to team_position enum
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Advisor';