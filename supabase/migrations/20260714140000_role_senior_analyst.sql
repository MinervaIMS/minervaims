-- =====================================================================
-- New role: Senior Analyst.
--
-- Senior Analyst is a role of its own, sitting just below Team Leader /
-- Portfolio Manager. It was previously conflated with Team Leader; it now
-- exists separately so it can carry its own permissions. Existing people
-- keep their current role; Senior Analyst starts empty and is assigned in
-- Settings → Users.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block that then
-- uses the new value, so this migration only adds the enum value.
-- =====================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'senior_analyst';
