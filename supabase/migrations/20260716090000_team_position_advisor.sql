-- =====================================================================
-- Add the 'Advisor' value to the public team_position enum.
--
-- role_to_team_position() has always mapped the advisor role to
-- 'Advisor'::team_position, but the enum never contained that value, so
-- the members -> team_members projection trigger raised an error for any
-- public advisor. That is why advisors could not appear on the public
-- Members page (and why saving a member as advisor could fail outright).
--
-- ALTER TYPE ... ADD VALUE must not be used by the same transaction that
-- adds it, so this migration contains ONLY the enum change; everything
-- that uses the new value lives in the next migration file.
-- =====================================================================

ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Advisor';
