-- Create activity_logs table for tracking dashboard actions
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'reorder')),
  entity_type text NOT NULL CHECK (entity_type IN ('event', 'alumni', 'file', 'team_member', 'reading')),
  entity_id uuid,
  entity_name text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only leadership roles can view logs
CREATE POLICY "Activity logs viewable by leadership"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'president', 'vice_president', 'head_of_asset_management')
  )
  OR (SELECT email FROM public.profiles WHERE id = auth.uid()) = 'as.minerva@unibocconi.it'
);

-- Indexes for efficient querying
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);