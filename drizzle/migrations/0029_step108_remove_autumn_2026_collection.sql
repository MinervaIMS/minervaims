-- =====================================================================
-- STEP 108: REMOVE THE "AUTUMN 2026" FEE COLLECTION, OPENED BY MISTAKE.
-- ---------------------------------------------------------------------
-- The collections run Spring 2026, then Fall 2026 (the current one). A
-- collection labelled "Autumn 2026" was opened beside them by mistake:
-- the label was typed by hand, and the field suggested "e.g. Autumn
-- 2026". The President asked for it to be removed entirely, with what
-- hangs on it, and for Fall 2026 to stay exactly as it is.
--
-- WHAT IS REMOVED, and only if a collection labelled "Autumn 2026" (in
-- any capitals or spacing) exists, and only that one:
--   1. its rows in the frozen register (semester_members whose
--      fee_period_id is its id), if it was ever closed; the existing
--      trigger roster_from_register then removes the Time Machine
--      entries those rows created (roster_entries with source
--      'register'), and nothing else;
--   2. its register count (semester_snapshots whose fee_period_id is its
--      id), if it was ever closed;
--   3. the collection itself (fee_periods), and with it, through the
--      existing ON DELETE CASCADE, its payment rows (membership_fees);
--   4. its Treasury entry, if it was closed and the entry is still the
--      automatic "Membership fees" one that nothing else points at.
-- Fall 2026, Spring 2026 and every other collection, payment, register
-- and Treasury entry are not touched: every statement is limited to the
-- one collection's id.
--
-- NO EMAIL IS SENT. Fee emails are queued only by the BEFORE INSERT OR
-- UPDATE trigger on membership_fees (membership_fee_email_transition)
-- and by the daily job process_fee_reminders, which reads open
-- collections. This file inserts and updates nothing in membership_fees:
-- it only deletes, and a delete fires no email trigger. Once the
-- collection is gone, the daily job has nothing of it left to remind.
--
-- BACKUP FIRST. Every row is copied, whole, into public.data_backup
-- (reason 'step108_autumn_2026') before anything is deleted, in the same
-- transaction. To see what was removed:
--   SELECT source, row_data FROM public.data_backup
--    WHERE reason = 'step108_autumn_2026' ORDER BY source;
-- To put the collection back, insert the rows from row_data in this
-- order: treasury_entries, fee_periods, membership_fees,
-- semester_snapshots, semester_members (the trigger rebuilds the
-- roster entries), e.g.
--   INSERT INTO public.fee_periods
--   SELECT (jsonb_populate_record(NULL::public.fee_periods, row_data)).*
--     FROM public.data_backup
--    WHERE reason = 'step108_autumn_2026' AND source = 'fee_periods';
-- (restoring membership_fees this way would queue payment receipts for
-- the paid rows; disable the trigger membership_fee_email_transition
-- around that one insert if it is ever needed).
--
-- SAFE TO RUN TWICE: the second run finds no Autumn 2026 collection and
-- changes nothing; the backup keeps its first copy.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.data_backup (
  source   text        NOT NULL,
  row_id   text        NOT NULL,
  reason   text        NOT NULL,
  row_data jsonb       NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, row_id, reason)
);
ALTER TABLE public.data_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.data_backup TO service_role;
COMMENT ON TABLE public.data_backup IS
  'Rows copied whole before a migration changed or removed them (Step 108 onwards). Read by the service role only.';

DO $step108_autumn$
DECLARE
  v_count  integer;
  v_id     uuid;
  v_entry  uuid;
  v_reason constant text := 'step108_autumn_2026';
BEGIN
  SELECT count(*) INTO v_count
    FROM public.fee_periods
   WHERE lower(regexp_replace(btrim(semester_label), '\s+', ' ', 'g')) = 'autumn 2026';

  IF v_count = 0 THEN
    RAISE NOTICE 'Step 108: no Autumn 2026 collection found; nothing removed.';
    RETURN;
  END IF;
  IF v_count > 1 THEN
    -- Never guess between two: stop, change nothing, and say so.
    RAISE NOTICE 'Step 108: % collections are labelled Autumn 2026; nothing removed. Remove the wrong one by hand.', v_count;
    RETURN;
  END IF;

  SELECT id, treasury_entry_id INTO v_id, v_entry
    FROM public.fee_periods
   WHERE lower(regexp_replace(btrim(semester_label), '\s+', ' ', 'g')) = 'autumn 2026';

  -- 1. Backups, whole rows, before any delete.
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'fee_periods', p.id::text, v_reason, to_jsonb(p) FROM public.fee_periods p WHERE p.id = v_id
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'membership_fees', f.id::text, v_reason, to_jsonb(f) FROM public.membership_fees f WHERE f.period_id = v_id
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'semester_members', sm.id::text, v_reason, to_jsonb(sm) FROM public.semester_members sm WHERE sm.fee_period_id = v_id
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'semester_snapshots', ss.id::text, v_reason, to_jsonb(ss) FROM public.semester_snapshots ss WHERE ss.fee_period_id = v_id
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  -- The Time Machine entries the register rows created, which the
  -- register trigger removes with them.
  INSERT INTO public.data_backup (source, row_id, reason, row_data)
  SELECT 'roster_entries', e.id::text, v_reason, to_jsonb(e)
    FROM public.semester_members sm
    JOIN public.person_records r ON r.record_type = 'member' AND r.record_id = sm.member_id
    JOIN public.roster_entries e ON e.person_id = r.person_id AND e.semester_key = sm.semester_key AND e.source = 'register'
   WHERE sm.fee_period_id = v_id
  ON CONFLICT (source, row_id, reason) DO NOTHING;

  IF v_entry IS NOT NULL THEN
    INSERT INTO public.data_backup (source, row_id, reason, row_data)
    SELECT 'treasury_entries', t.id::text, v_reason, to_jsonb(t) FROM public.treasury_entries t WHERE t.id = v_entry
    ON CONFLICT (source, row_id, reason) DO NOTHING;
  END IF;

  -- 2. The removal, each step limited to this one collection.
  DELETE FROM public.semester_members   WHERE fee_period_id = v_id;
  DELETE FROM public.semester_snapshots WHERE fee_period_id = v_id;
  DELETE FROM public.fee_periods        WHERE id = v_id;   -- its membership_fees go with it (ON DELETE CASCADE)

  IF v_entry IS NOT NULL THEN
    DELETE FROM public.treasury_entries t
     WHERE t.id = v_entry
       AND t.source = 'membership_fees'
       AND NOT EXISTS (SELECT 1 FROM public.fee_periods p WHERE p.treasury_entry_id = t.id)
       AND NOT EXISTS (SELECT 1 FROM public.ads_spending a WHERE a.treasury_entry_id = t.id);
  END IF;

  RAISE NOTICE 'Step 108: the Autumn 2026 collection (%) was removed; its rows are in public.data_backup.', v_id;
END
$step108_autumn$;