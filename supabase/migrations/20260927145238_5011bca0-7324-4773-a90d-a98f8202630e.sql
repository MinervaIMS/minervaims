CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id      uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items        jsonb NOT NULL DEFAULT '{}'::jsonb
               CHECK (jsonb_typeof(items) = 'object' AND pg_column_size(items) <= 4096),
  hidden_at    timestamptz,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.onboarding_progress FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own onboarding: read" ON public.onboarding_progress;
CREATE POLICY "own onboarding: read" ON public.onboarding_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own onboarding: add" ON public.onboarding_progress;
CREATE POLICY "own onboarding: add" ON public.onboarding_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own onboarding: change" ON public.onboarding_progress;
CREATE POLICY "own onboarding: change" ON public.onboarding_progress
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.my_onboarding_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH me AS (
    SELECT m.*
      FROM public.members m
     WHERE auth.uid() IS NOT NULL
       AND m.user_id = auth.uid()
     LIMIT 1
  )
  SELECT coalesce((
    SELECT jsonb_build_object(
      'eligible', me.membership_status = 'active'
                  AND me.role::text IN ('analyst', 'senior_analyst', 'media_analyst', 'team_leader', 'portfolio_manager'),
      'division', me.division::text,
      'has_photo', nullif(btrim(coalesce(me.photo_url, '')), '') IS NOT NULL,
      'has_phone', nullif(btrim(coalesce(me.phone, '')), '') IS NOT NULL,
      'has_linkedin', nullif(btrim(coalesce(me.linkedin_url, '')), '') IS NOT NULL,
      'heads', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'name', btrim(h.first_name || ' ' || h.surname),
                 'email', nullif(btrim(coalesce(h.email, '')), ''),
                 'phone', nullif(btrim(coalesce(h.phone, '')), ''))
               ORDER BY h.surname, h.first_name)
          FROM public.members h
         WHERE h.membership_status = 'active'
           AND h.id <> me.id
           AND lower(coalesce(btrim(h.email), '')) <> 'as.minerva@unibocconi.it'
           AND (
             (h.role::text = 'head_of_division' AND h.division = me.division)
             OR (h.role::text = 'head_of_media' AND me.division::text = 'media')
             OR (h.role::text = 'head_of_operations' AND me.division::text = 'operations')
           )
      ), '[]'::jsonb)
    )
    FROM me
  ), jsonb_build_object('eligible', false));
$fn$;

REVOKE ALL ON FUNCTION public.my_onboarding_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_onboarding_context() TO authenticated;