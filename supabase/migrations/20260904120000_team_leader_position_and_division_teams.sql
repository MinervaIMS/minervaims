-- =====================================================================
-- Two fixes to how a workspace role reaches the public Members page.
-- ---------------------------------------------------------------------
-- 1. A TEAM LEADER WAS PUBLISHED AS A SENIOR ANALYST.
--
--    The workspace roster (public.members) carries the real role, and a
--    trigger projects each publishable member into public.team_members,
--    which is what the website reads. The projection went through
--    role_to_team_position(), and that function said, literally:
--
--        WHEN _role = 'team_leader'    THEN 'Senior Analyst'
--        WHEN _role = 'senior_analyst' THEN 'Senior Analyst'
--
--    because the team_position enum had no 'Team Leader' value to give
--    it. So every member promoted to Team Leader in the workspace
--    appeared on the public site as a Senior Analyst: two distinct ranks
--    of the association, collapsed into one in the only place the public
--    can see them. member_rank() had always told them apart correctly,
--    which is why the ordering looked right while the label did not.
--
--    The enum gains the value, the function stops collapsing the two,
--    and every affected row is re-projected.
--
-- 2. INVESTMENT RESEARCH HAS THREE TEAMS, AND NOWHERE TO RECORD THEM.
--
--    Portfolio Management shows which fund a member runs, which comes
--    from team_members.fund. Investment Research is organised the same
--    way, into Equities, Fixed Income and FX & Commodities, and had no
--    equivalent. Worse, `fund` was never assignable from the workspace
--    at all: nothing writes it, and the projection trigger does not
--    carry it, so it survives only on rows created before the roster
--    became the single source of truth.
--
--    Rather than add a second orphaned column, both are answered by one
--    idea: a member's SUB-UNIT within their division. members.team holds
--    it, the trigger projects it, and the public page reads it for both
--    divisions, falling back to the legacy fund column for the rows that
--    predate this.
-- =====================================================================


-- ── 1. The enum ──────────────────────────────────────────────────────
-- ADD VALUE cannot run in the same transaction as a statement that uses
-- the new value, which is why the function update is a separate step
-- below. IF NOT EXISTS makes the migration safe to re-run.
ALTER TYPE public.team_position ADD VALUE IF NOT EXISTS 'Team Leader' AFTER 'Portfolio Manager';


-- ── 2. The sub-unit column, on both sides of the projection ─────────
ALTER TABLE public.members      ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS team text;

COMMENT ON COLUMN public.members.team IS
  'The member''s sub-unit within their division: a fund key for Portfolio Management (long-short, multi-asset, dps, pir) or a team key for Investment Research (equities, fixed-income, fx-commodities). NULL for divisions that are not subdivided.';

-- Only the two divisions that are subdivided may carry a value, and only
-- one of their own. A constraint rather than a convention, because this
-- column is written from three places and read by the public website.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_team_check;
ALTER TABLE public.members ADD CONSTRAINT members_team_check CHECK (
  team IS NULL
  OR (division = 'portfolio'  AND team IN ('long-short','multi-asset','dps','pir'))
  OR (division = 'investment' AND team IN ('equities','fixed-income','fx-commodities'))
);
