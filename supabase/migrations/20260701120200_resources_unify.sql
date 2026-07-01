-- =====================================================================
-- Unify the resource pages (Templates & Code Repos, SMM, Design/Brand,
-- External Relations, Statute & Important Documents).
-- ---------------------------------------------------------------------
--   * A simpler type set: text / file / link / code / other.
--   * Up to five starred favourites per category (replaces the single
--     "main reference" is_primary flag).
--   * Record the uploader's role at the time of upload (author_role) next
--     to their name and the date.
-- =====================================================================

ALTER TABLE public.workspace_resources
  ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_role  text;

-- Carry the old single "main reference" over to a favourite.
UPDATE public.workspace_resources SET is_favourite = true WHERE is_primary = true;

-- Remap the old, format-specific types onto the new simple set.
ALTER TABLE public.workspace_resources DROP CONSTRAINT IF EXISTS workspace_resources_type_check;
UPDATE public.workspace_resources SET type = CASE
  WHEN type = 'drive_link' THEN 'link'
  WHEN type = 'code_repo'  THEN 'code'
  WHEN type = 'note'       THEN 'text'
  WHEN type IN ('ppt','excel','word','pdf','file') THEN 'file'
  ELSE 'other' END;
ALTER TABLE public.workspace_resources ALTER COLUMN type SET DEFAULT 'text';
ALTER TABLE public.workspace_resources
  ADD CONSTRAINT workspace_resources_type_check CHECK (type IN ('text','file','link','code','other'));
