
CREATE TABLE public.page_visibility (
  page_key TEXT PRIMARY KEY,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_visibility TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_visibility TO authenticated;
GRANT ALL ON public.page_visibility TO service_role;

ALTER TABLE public.page_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read page visibility"
  ON public.page_visibility FOR SELECT
  USING (true);

CREATE POLICY "Full-access roles can insert page visibility"
  ON public.page_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'vice_president'::app_role)
    OR public.has_role(auth.uid(), 'head_of_asset_management'::app_role)
  );

CREATE POLICY "Full-access roles can update page visibility"
  ON public.page_visibility FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'vice_president'::app_role)
    OR public.has_role(auth.uid(), 'head_of_asset_management'::app_role)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'vice_president'::app_role)
    OR public.has_role(auth.uid(), 'head_of_asset_management'::app_role)
  );

CREATE POLICY "Full-access roles can delete page visibility"
  ON public.page_visibility FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'vice_president'::app_role)
    OR public.has_role(auth.uid(), 'head_of_asset_management'::app_role)
  );

CREATE TRIGGER page_visibility_updated_at
  BEFORE UPDATE ON public.page_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
