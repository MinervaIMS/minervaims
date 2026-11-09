CREATE OR REPLACE FUNCTION public.sees_event_places(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT uid IS NOT NULL AND (
    lower(coalesce((SELECT email FROM auth.users WHERE id = uid), '')) = 'as.minerva@unibocconi.it'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = uid
         AND ur.role::text IN (
           'admin', 'president', 'vice_president',
           'head_of_asset_management', 'head_of_division',
           'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant',
           'head_of_media', 'media_analyst',
           'head_of_operations', 'operations_analyst',
           'advisor', 'silent_advisor'
         )
    )
  );
$fn$;

REVOKE EXECUTE ON FUNCTION public.sees_event_places(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sees_event_places(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sees_event_places(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.event_places(uuid);

CREATE FUNCTION public.event_places(p_event_id uuid)
RETURNS TABLE (capacity integer, taken integer, waiting integer, is_full boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH e AS (
    SELECT ev.id, ev.capacity,
           (SELECT count(*)::int FROM public.event_registrations r WHERE r.event_id = ev.id) AS taken,
           (SELECT count(*)::int FROM public.event_waitlist w WHERE w.event_id = ev.id) AS waiting
      FROM public.events ev
     WHERE ev.id = p_event_id AND ev.registration_enabled AND ev.capacity IS NOT NULL
  ), who AS (
    SELECT public.sees_event_places(auth.uid()) AS organiser
  )
  SELECT CASE WHEN who.organiser THEN e.capacity END,
         CASE WHEN who.organiser THEN e.taken END,
         CASE WHEN who.organiser THEN e.waiting END,
         e.taken >= e.capacity
    FROM e, who;
$fn$;

REVOKE EXECUTE ON FUNCTION public.event_places(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_places(uuid) TO anon, authenticated, service_role;