-- =====================================================================
-- Advisors are outside the membership fee, retroactively as well.
-- ---------------------------------------------------------------------
-- The rule is not new: the function that opens and closes a collection
-- has excluded advisors from both the fee list and the semester register
-- since July. What this migration does is repair the records written
-- before that, and the records the rule could not reach:
--
--   1. an advisor's own fee_status, which said 'unpaid' - the description
--      of a member in arrears - on somebody who owes nothing;
--   2. fee rows belonging to advisors in collections that are still open,
--      which is what a member appointed advisor part way through a
--      semester left behind: invisible in the list, still counted in the
--      total;
--   3. advisors sitting in a frozen semester register from before the
--      exclusion existed, and the member counts derived from those
--      registers.
--
-- (3) rewrites a record that is meant to be frozen, which deserves to be
-- said plainly rather than buried: the register is frozen so that it
-- cannot be edited to say something different about who belonged to the
-- association. Removing somebody who was never a dues-paying member of it
-- corrects what the register was always meant to say. Nothing else in any
-- register is touched, and no payment record is deleted anywhere.
-- =====================================================================


-- ── 1. An advisor's fee status describes an exemption, not a debt ────
UPDATE public.members
   SET fee_status = 'exempt'
 WHERE role IN ('advisor', 'silent_advisor')
   AND fee_status IS DISTINCT FROM 'exempt';


-- ── 2. Unpaid fee rows for advisors, in collections still open ───────
-- Only UNPAID, and only OPEN. A payment already banked stays exactly
-- where it is: it is money the association received, Treasury records it
-- when the collection closes, and deleting it here would lose it.
-- A closed collection is history and is never rewritten.
DELETE FROM public.membership_fees mf
 USING public.members m, public.fee_periods fp
 WHERE mf.member_id = m.id
   AND mf.period_id = fp.id
   AND fp.closed = false
   AND mf.paid = false
   AND m.role IN ('advisor', 'silent_advisor');


-- ── 3. Advisors in frozen semester registers ─────────────────────────
-- Matched on member_id where the roster row still exists. A register row
-- whose member_id is null, or whose member has since been deleted, is
-- left alone: there is nothing to prove it was an advisor's, and guessing
-- from a name would be worse than leaving a correct row in place.
DELETE FROM public.semester_members sm
 USING public.members m
 WHERE sm.member_id = m.id
   AND m.role IN ('advisor', 'silent_advisor');

-- The headline count on the Dashboard is derived from those registers, so
-- it is recomputed rather than left describing rows that are gone.
UPDATE public.semester_snapshots s
   SET members_count = COALESCE((
         SELECT count(*) FROM public.semester_members sm
          WHERE sm.semester_key = s.semester_key
       ), 0);
