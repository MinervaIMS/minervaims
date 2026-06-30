
ALTER TABLE public.archive_files
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'blocked')),
  ADD COLUMN IF NOT EXISTS project text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Archive files are publicly readable" ON public.archive_files;
DROP POLICY IF EXISTS "archive files visibility" ON public.archive_files;
CREATE POLICY "archive files visibility"
  ON public.archive_files FOR SELECT
  USING (status = 'published' OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.workspace_resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL,
  division     public.org_division NOT NULL DEFAULT 'none',
  type         text NOT NULL DEFAULT 'note'
                 CHECK (type IN ('drive_link','code_repo','ppt','excel','word','pdf','file','note','other')),
  title        text NOT NULL,
  description  text,
  reason       text,
  file_url     text,
  link_url     text,
  body         text,
  author_id    uuid REFERENCES auth.users(id),
  author_name  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_resources_category_idx ON public.workspace_resources(category);
CREATE INDEX IF NOT EXISTS workspace_resources_division_idx ON public.workspace_resources(division);

DROP TRIGGER IF EXISTS update_workspace_resources_updated_at ON public.workspace_resources;
CREATE TRIGGER update_workspace_resources_updated_at
  BEFORE UPDATE ON public.workspace_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.workspace_resources TO authenticated;
GRANT ALL ON public.workspace_resources TO service_role;

ALTER TABLE public.workspace_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources readable by staff" ON public.workspace_resources;
CREATE POLICY "resources readable by staff"
  ON public.workspace_resources FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.fund_performances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund            text NOT NULL CHECK (fund IN ('long-short', 'multi-asset')),
  period_month    date NOT NULL,
  nav             numeric,
  monthly_return  numeric,
  ytd_return      numeric,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund, period_month)
);

CREATE INDEX IF NOT EXISTS fund_performances_fund_idx ON public.fund_performances(fund, period_month);

DROP TRIGGER IF EXISTS update_fund_performances_updated_at ON public.fund_performances;
CREATE TRIGGER update_fund_performances_updated_at
  BEFORE UPDATE ON public.fund_performances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.fund_performances TO anon, authenticated;
GRANT ALL ON public.fund_performances TO service_role;

ALTER TABLE public.fund_performances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fund performances are public" ON public.fund_performances;
CREATE POLICY "fund performances are public"
  ON public.fund_performances FOR SELECT
  USING (true);
