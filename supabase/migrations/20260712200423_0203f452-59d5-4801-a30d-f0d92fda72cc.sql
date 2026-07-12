CREATE TABLE IF NOT EXISTS public.semester_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_key  text NOT NULL,
  semester_label text NOT NULL,
  member_id     uuid,
  first_name    text NOT NULL,
  surname       text NOT NULL,
  email         text,
  division      text,
  role          text,
  fee_paid      boolean NOT NULL DEFAULT true,
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  fee_period_id uuid
);
CREATE INDEX IF NOT EXISTS semester_members_key_idx ON public.semester_members(semester_key);

GRANT SELECT ON public.semester_members TO authenticated;
GRANT ALL ON public.semester_members TO service_role;

CREATE TABLE IF NOT EXISTS public.semester_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_key  text NOT NULL UNIQUE,
  semester_label text NOT NULL,
  members_count integer NOT NULL DEFAULT 0,
  alumni_count  integer NOT NULL DEFAULT 0,
  fee_period_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.semester_snapshots TO authenticated;
GRANT ALL ON public.semester_snapshots TO service_role;

ALTER TABLE public.semester_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS semester_members_read ON public.semester_members;
CREATE POLICY semester_members_read ON public.semester_members
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS semester_snapshots_read ON public.semester_snapshots;
CREATE POLICY semester_snapshots_read ON public.semester_snapshots
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS section    text;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS subsection text;

DROP POLICY IF EXISTS activity_logs_self_insert ON public.activity_logs;
CREATE POLICY activity_logs_self_insert ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS page_count integer;