-- =====================================================================
-- Alumni calls become a grouping of 2-5 alumni.
-- ---------------------------------------------------------------------
-- A call is now an initiative organised by a division on a date, grouping
-- several alumni (each verified against the alumni directory). The person
-- who adds the call is recorded automatically as its organiser (the old
-- free-text "responsible person" is dropped from the UI).
-- =====================================================================

-- The call header no longer needs a single alumnus name.
ALTER TABLE public.alumni_calls ALTER COLUMN alumnus_name DROP NOT NULL;
ALTER TABLE public.alumni_calls ADD COLUMN IF NOT EXISTS organiser_name text;

CREATE TABLE IF NOT EXISTS public.alumni_call_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      uuid NOT NULL REFERENCES public.alumni_calls(id) ON DELETE CASCADE,
  alumni_id    uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  alumnus_name text NOT NULL,
  former_role  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alumni_call_participants_call_idx ON public.alumni_call_participants(call_id);

ALTER TABLE public.alumni_call_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alumni call participants readable by staff" ON public.alumni_call_participants;
CREATE POLICY "alumni call participants readable by staff"
  ON public.alumni_call_participants FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
GRANT SELECT ON public.alumni_call_participants TO authenticated;
GRANT ALL ON public.alumni_call_participants TO service_role;
