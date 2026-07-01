-- =====================================================================
-- Members -> Alumni transition, with privacy-safe contact retention.
-- ---------------------------------------------------------------------
-- When a member leaves, they are usually moving on to become an alumnus.
-- The public `alumni` table stays free of personal contact data (it is
-- world-readable). Their phone and email are instead retained in a
-- separate, staff-only table so the association keeps in touch without
-- ever exposing that data publicly.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.alumni_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id   uuid NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  phone       text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alumni_id)
);

ALTER TABLE public.alumni_contacts ENABLE ROW LEVEL SECURITY;

-- Staff only. No grant to anon: this table is never reachable publicly.
DROP POLICY IF EXISTS "alumni contacts readable by staff" ON public.alumni_contacts;
CREATE POLICY "alumni contacts readable by staff"
  ON public.alumni_contacts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

GRANT SELECT ON public.alumni_contacts TO authenticated;
GRANT ALL ON public.alumni_contacts TO service_role;
