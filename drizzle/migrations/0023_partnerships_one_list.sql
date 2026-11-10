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