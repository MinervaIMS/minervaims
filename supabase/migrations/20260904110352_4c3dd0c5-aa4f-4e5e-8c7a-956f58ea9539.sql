-- ── 1. An advisor's fee status describes an exemption, not a debt ────
UPDATE public.members
   SET fee_status = 'exempt'
 WHERE role IN ('advisor', 'silent_advisor')
   AND fee_status IS DISTINCT FROM 'exempt';

-- ── 2. Unpaid fee rows for advisors, in collections still open ───────
DELETE FROM public.membership_fees mf
 USING public.members m, public.fee_periods fp
 WHERE mf.member_id = m.id
   AND mf.period_id = fp.id
   AND fp.closed = false
   AND mf.paid = false
   AND m.role IN ('advisor', 'silent_advisor');

-- ── 3. Advisors in frozen semester registers ─────────────────────────
DELETE FROM public.semester_members sm
 USING public.members m
 WHERE sm.member_id = m.id
   AND m.role IN ('advisor', 'silent_advisor');

UPDATE public.semester_snapshots s
   SET members_count = COALESCE((
         SELECT count(*) FROM public.semester_members sm
          WHERE sm.semester_key = s.semester_key
       ), 0);