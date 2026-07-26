DROP POLICY IF EXISTS "read active interview slots" ON public.interview_slots;

CREATE POLICY "staff read interview slots"
ON public.interview_slots FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "candidates read own division interview slots"
ON public.interview_slots FOR SELECT TO authenticated
USING (
  is_active = true
  AND (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.user_id = auth.uid()
        AND (
          a.first_choice::text = interview_slots.division::text
          OR a.second_choice::text = interview_slots.division::text
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.interview_bookings b
      WHERE b.slot_id = interview_slots.id
        AND b.candidate_user_id = auth.uid()
    )
  )
);

REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.exam_break_on(date) FROM anon, authenticated;