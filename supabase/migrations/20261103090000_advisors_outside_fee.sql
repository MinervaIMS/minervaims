-- =====================================================================
-- ADVISORS NEVER OWE THE MEMBERSHIP FEE, WHICHEVER WAY THE RECORD CHANGES
-- (Step 104).
-- ---------------------------------------------------------------------
-- The rule is not new (migration 20260905090000, src/lib/membership-fee.ts):
-- an advisor is an alumnus appointed to advise the association, not a
-- dues-paying member of it, so they are in no collection, no total, no
-- reminder and no semester register. It was kept by the edge functions,
-- each on its own path: opening a collection (admin-fees), appointing an
-- advisor (admin-members), granting the role (admin-users).
--
-- Two places did not keep it:
--
--   * the daily reminder after the first deadline (process_fee_reminders)
--     emailed every unpaid row of the open collection without asking who
--     it belonged to, so an advisor left with a row was told to pay;
--   * a role written by any other path (People > Members' plain update, a
--     direct edit of the table) made the person an advisor without taking
--     away the unpaid row they were given when the collection opened.
--
-- So the rule now lives in the database as well, where every path meets
-- it. Nothing here changes or deletes a row that exists today: the
-- triggers act on later writes only, and the reminder simply stops
-- choosing advisors. Idempotent: safe to run twice.
-- =====================================================================

-- The roles outside the fee. The same two as FEE_EXEMPT_ROLES in
-- src/lib/membership-fee.ts and in the edge functions.
CREATE OR REPLACE FUNCTION public.fee_exempt_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_role IN ('advisor', 'silent_advisor'), false)
$$;


-- ── 1. The fee status follows the advisory role, at the crossing ─────
-- Into an advisory role: 'exempt', always (a form or an edit can no longer
-- leave an advisor marked 'unpaid', the description of a member in
-- arrears). Out of one: an 'exempt' left over from the appointment becomes
-- 'unpaid', as admin-users already does, because the person is back in the
-- paying membership. A waiver given to a member for another reason is
-- untouched by any other change.
CREATE OR REPLACE FUNCTION public.members_fee_status_follows_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.fee_exempt_role(NEW.role::text) THEN
    NEW.fee_status := 'exempt';
  ELSIF TG_OP = 'UPDATE'
    AND public.fee_exempt_role(OLD.role::text)
    AND NEW.fee_status IS NOT DISTINCT FROM 'exempt' THEN
    NEW.fee_status := 'unpaid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_fee_status_follows_role ON public.members;
CREATE TRIGGER members_fee_status_follows_role
  BEFORE INSERT OR UPDATE OF role, fee_status ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_fee_status_follows_role();


-- ── 2. Becoming an advisor takes away the fee not yet paid ───────────
-- Only UNPAID rows, only in OPEN collections, exactly as admin-members and
-- admin-users do on their own paths. A payment already made is money the
-- association received: it is never deleted, and Treasury still records it
-- when the collection closes. A closed collection is never touched.
CREATE OR REPLACE FUNCTION public.members_leave_open_fee_when_exempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fee_exempt_role(NEW.role::text) AND NOT public.fee_exempt_role(OLD.role::text) THEN
    DELETE FROM public.membership_fees mf
     USING public.fee_periods fp
     WHERE mf.member_id = NEW.id
       AND mf.period_id = fp.id
       AND fp.closed = false
       AND mf.paid = false;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS members_leave_open_fee_when_exempt ON public.members;
CREATE TRIGGER members_leave_open_fee_when_exempt
  AFTER UPDATE OF role ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_leave_open_fee_when_exempt();


-- ── 3. No unpaid fee row is ever written for an advisor ──────────────
-- Opening a collection already leaves them out; this holds for every other
-- way a row could be written. A row recording a payment is kept: money
-- received is recorded whoever paid it.
CREATE OR REPLACE FUNCTION public.membership_fees_skip_exempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT coalesce(NEW.paid, false) AND EXISTS (
    SELECT 1 FROM public.members m
     WHERE m.id = NEW.member_id AND public.fee_exempt_role(m.role::text)
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS membership_fees_skip_exempt ON public.membership_fees;
CREATE TRIGGER membership_fees_skip_exempt
  BEFORE INSERT ON public.membership_fees
  FOR EACH ROW EXECUTE FUNCTION public.membership_fees_skip_exempt();


-- ── 4. The reminder after the first deadline asks who it is writing to ─
-- As in migration 20260906160228, with one condition added: the person is
-- still in the paying membership (the same roles admin-fees leaves out of a
-- collection: candidates, pending accounts, the admin account, alumni and
-- advisors). Everything else, the template and the once-per-collection
-- marker included, is unchanged.
CREATE OR REPLACE FUNCTION public.process_fee_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p record; r record; n integer := 0; pay text;
BEGIN
  SELECT * INTO p FROM public.fee_periods
   WHERE closed = false AND first_deadline IS NOT NULL AND first_deadline < current_date
   ORDER BY created_at DESC LIMIT 1;
  IF p.id IS NULL THEN RETURN 0; END IF;
  pay := public.fee_payment_block(p.id);

  FOR r IN
    UPDATE public.membership_fees f
       SET reminder_sent_at = now()
     WHERE f.period_id = p.id
       AND f.paid = false
       AND f.reminder_sent_at IS NULL
       AND EXISTS (SELECT 1 FROM public.members m
                    WHERE m.id = f.member_id AND m.email IS NOT NULL
                      AND m.membership_status = 'active'
                      AND m.role::text NOT IN ('candidate', 'pending', 'admin', 'alumni')
                      AND NOT public.fee_exempt_role(m.role::text))
     RETURNING f.member_id
  LOOP
    PERFORM public.enqueue_app_email('ws_membership_reminder',
      (SELECT email FROM public.members WHERE id = r.member_id),
      jsonb_build_object(
        'first_name', (SELECT first_name FROM public.members WHERE id = r.member_id),
        'semester_label', p.semester_label,
        'fee_amount', concat('EUR ', trim(to_char(p.fee_amount, 'FM999999.00'))),
        'fee_deadline', to_char(coalesce(p.second_deadline, p.first_deadline), 'DD Mon YYYY'),
        'payment_method', coalesce(pay, 'See the Workspace for payment details.'),
        'status_url', 'https://minervaims.org/workspace/dashboard'));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.process_fee_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fee_reminders() TO service_role;
REVOKE ALL ON FUNCTION public.members_leave_open_fee_when_exempt() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.membership_fees_skip_exempt() FROM PUBLIC, anon, authenticated;
