-- Add co-head positions to the team_position enum
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Equity Research';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Investment Research';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Macro Research';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Portfolio Management';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Quantitative Research';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Operations';
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Co-Head of Media';