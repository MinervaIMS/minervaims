GRANT INSERT, UPDATE, DELETE ON public.calendar_entries TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_calendar(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT email FROM auth.users WHERE id = uid) = 'as.minerva@unibocconi.it'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = uid
        AND ur.role IN ('admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_calendar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_calendar(uuid) TO authenticated;

DROP POLICY IF EXISTS "calendar entries insertable by managers" ON public.calendar_entries;
CREATE POLICY "calendar entries insertable by managers" ON public.calendar_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_calendar(auth.uid()));

DROP POLICY IF EXISTS "calendar entries updatable by managers" ON public.calendar_entries;
CREATE POLICY "calendar entries updatable by managers" ON public.calendar_entries
  FOR UPDATE TO authenticated
  USING (public.can_manage_calendar(auth.uid()))
  WITH CHECK (public.can_manage_calendar(auth.uid()));

DROP POLICY IF EXISTS "calendar entries deletable by managers" ON public.calendar_entries;
CREATE POLICY "calendar entries deletable by managers" ON public.calendar_entries
  FOR DELETE TO authenticated
  USING (public.can_manage_calendar(auth.uid()));