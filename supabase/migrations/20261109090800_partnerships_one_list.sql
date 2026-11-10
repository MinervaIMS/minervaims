-- =====================================================================
-- PARTNERSHIPS, ONE LIST OF STUDENT ASSOCIATIONS (Step 105 follow-up).
-- ---------------------------------------------------------------------
-- The President asked to drop the "Service providers" group and keep the
-- Partnerships page simple: one list of the other student associations
-- the Society has an agreement or a joint initiative with. Migration
-- 20261109090500 created the table with a `kind` column (service
-- provider or student association); the page, the editor and the
-- admin-partnerships function no longer know of it.
--
-- WHAT THIS DOES, AND WHEN IT DOES NOTHING.
--   * Every row a student association (or no row at all): the column, its
--     check and the index built on it go, and the index is rebuilt on the
--     order alone. Nothing is lost, because every row said the same thing.
--   * Any row that is NOT a student association: nothing is dropped and
--     no row is changed. The column only gains a default, so the editor
--     can still add partners, and a notice names how many rows wait for
--     the President's decision (hide or remove them in Website >
--     Partnerships, then run this file again).
--
-- Safe to run twice: once the column is gone there is nothing to do.
-- =====================================================================

DO $$
DECLARE
  others integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'partnerships' AND column_name = 'kind'
  ) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO others FROM public.partnerships WHERE kind IS DISTINCT FROM 'student_association';

  IF others > 0 THEN
    ALTER TABLE public.partnerships ALTER COLUMN kind SET DEFAULT 'student_association';
    RAISE NOTICE 'partnerships: % row(s) are not student associations; kind is kept until the President decides', others;
  ELSE
    ALTER TABLE public.partnerships DROP CONSTRAINT IF EXISTS partnerships_kind_check;
    DROP INDEX IF EXISTS public.partnerships_order_idx;
    ALTER TABLE public.partnerships DROP COLUMN kind;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS partnerships_order_idx ON public.partnerships (display_order);
