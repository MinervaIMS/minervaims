ALTER TABLE public.fee_periods
  ADD COLUMN IF NOT EXISTS first_deadline  date,
  ADD COLUMN IF NOT EXISTS second_deadline date;

DROP POLICY IF EXISTS "members read own membership fee" ON public.membership_fees;
CREATE POLICY "members read own membership fee" ON public.membership_fees
  FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );