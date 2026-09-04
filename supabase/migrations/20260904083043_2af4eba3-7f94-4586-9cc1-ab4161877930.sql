ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Team Leader' AFTER 'Portfolio Manager';
ALTER TABLE public.members      ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS team text;
COMMENT ON COLUMN public.members.team IS
  'The member''s sub-unit within their division: a fund key for Portfolio Management (long-short, multi-asset, dps, pir) or a team key for Investment Research (equities, fixed-income, fx-commodities). NULL for divisions that are not subdivided.';
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_team_check;
ALTER TABLE public.members ADD CONSTRAINT members_team_check CHECK (
  team IS NULL
  OR (division = 'portfolio'  AND team IN ('long-short','multi-asset','dps','pir'))
  OR (division = 'investment' AND team IN ('equities','fixed-income','fx-commodities'))
);