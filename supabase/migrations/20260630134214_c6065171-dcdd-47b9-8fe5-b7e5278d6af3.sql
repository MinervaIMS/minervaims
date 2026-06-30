
CREATE TABLE public.report_deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  division org_division,
  due_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_deadlines TO authenticated;
GRANT ALL ON public.report_deadlines TO service_role;

ALTER TABLE public.report_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view report deadlines"
  ON public.report_deadlines FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Full access can manage all report deadlines"
  ON public.report_deadlines FOR ALL TO authenticated
  USING (public.is_full_access(auth.uid()))
  WITH CHECK (public.is_full_access(auth.uid()));

CREATE POLICY "Heads can manage their division deadlines"
  ON public.report_deadlines FOR ALL TO authenticated
  USING (
    division IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('head_of_division','head_of_asset_management')
        AND (ur.role = 'head_of_asset_management' OR ur.division = report_deadlines.division)
    )
  )
  WITH CHECK (
    division IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('head_of_division','head_of_asset_management')
        AND (ur.role = 'head_of_asset_management' OR ur.division = report_deadlines.division)
    )
  );

CREATE TRIGGER update_report_deadlines_updated_at
  BEFORE UPDATE ON public.report_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_report_deadlines_due_date ON public.report_deadlines(due_date);
CREATE INDEX idx_report_deadlines_division ON public.report_deadlines(division);
