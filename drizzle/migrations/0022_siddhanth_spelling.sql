CREATE TABLE IF NOT EXISTS public.step105_name_fix_backup (
  table_name  text NOT NULL,
  row_id      uuid NOT NULL,
  column_name text NOT NULL,
  old_value   text,
  new_value   text,
  fixed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_name, row_id, column_name)
);
ALTER TABLE public.step105_name_fix_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.step105_name_fix_backup FROM anon, authenticated;
GRANT ALL ON public.step105_name_fix_backup TO service_role;

INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'team_members', id, 'name', name, 'Siddhanth' FROM public.team_members
 WHERE name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.team_members SET name = 'Siddhanth' WHERE name = 'Siddanth' AND surname ILIKE '%Achanta%';

INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'members', id, 'first_name', first_name, 'Siddhanth' FROM public.members
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.members SET first_name = 'Siddhanth' WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%';

INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'people', id, 'first_name', first_name, 'Siddhanth' FROM public.people
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.people
   SET first_name = 'Siddhanth', name_key = public.person_name_key('Siddhanth', surname), updated_at = now()
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%';