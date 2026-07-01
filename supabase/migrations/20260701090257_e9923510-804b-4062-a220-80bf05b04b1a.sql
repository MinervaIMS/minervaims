ALTER TABLE public.workspace_resources
  ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_role  text;

UPDATE public.workspace_resources SET is_favourite = true WHERE is_primary = true;

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