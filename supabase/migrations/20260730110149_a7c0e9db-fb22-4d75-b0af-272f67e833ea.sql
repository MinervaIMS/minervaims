DROP POLICY IF EXISTS "candidates read own division interview slots" ON public.interview_slots;

CREATE POLICY "candidates read own booked interview slot"
ON public.interview_slots FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_bookings b
    WHERE b.slot_id = interview_slots.id
      AND b.candidate_user_id = auth.uid()
  )
);