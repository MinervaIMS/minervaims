-- =====================================================================
-- STEP 105, TO RUN ONLY ONCE THE PRESIDENT HAS CONFIRMED IT.
-- "Siddanth" -> "Siddhanth" for Siddhanth Narayana Achanta.
-- ---------------------------------------------------------------------
-- This is NOT a migration and is not applied automatically: it corrects
-- existing rows, which the project's rule allows only with a backup AND
-- the President's confirmation. Run it by hand in the SQL editor once
-- confirmed.
--
-- What it does: the member register, the public members list and the
-- People record carry the first name "Siddanth"; his report covers carry
-- "Siddhanth", so the two never matched and his reports linked nowhere
-- (since Step 105 they link to the archive filtered to his reports).
-- After this, his reports link to his profile on the Members page again.
--
-- Every value it changes is copied first into
-- public.step105_name_fix_backup (table, row, column, old and new value).
-- It changes only rows whose first name is exactly "Siddanth" and whose
-- surname contains "Achanta". Safe to run twice: the second run finds
-- nothing to change.
--
-- To undo, run the block at the end of this file.
-- =====================================================================
BEGIN;

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

-- The public members list.
INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'team_members', id, 'name', name, 'Siddhanth' FROM public.team_members
 WHERE name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.team_members SET name = 'Siddhanth' WHERE name = 'Siddanth' AND surname ILIKE '%Achanta%';

-- The member register.
INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'members', id, 'first_name', first_name, 'Siddhanth' FROM public.members
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.members SET first_name = 'Siddhanth' WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%';

-- The People record (Time Machine), with the key it is matched by.
INSERT INTO public.step105_name_fix_backup (table_name, row_id, column_name, old_value, new_value)
SELECT 'people', id, 'first_name', first_name, 'Siddhanth' FROM public.people
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%'
ON CONFLICT DO NOTHING;
UPDATE public.people
   SET first_name = 'Siddhanth', name_key = public.person_name_key('Siddhanth', surname), updated_at = now()
 WHERE first_name = 'Siddanth' AND surname ILIKE '%Achanta%';

COMMIT;

-- ---------------------------------------------------------------------
-- UNDO (only if needed): puts every value back from the backup.
-- ---------------------------------------------------------------------
-- BEGIN;
-- UPDATE public.team_members t SET name = b.old_value FROM public.step105_name_fix_backup b
--  WHERE b.table_name = 'team_members' AND b.column_name = 'name' AND b.row_id = t.id;
-- UPDATE public.members m SET first_name = b.old_value FROM public.step105_name_fix_backup b
--  WHERE b.table_name = 'members' AND b.column_name = 'first_name' AND b.row_id = m.id;
-- UPDATE public.people p SET first_name = b.old_value, name_key = public.person_name_key(b.old_value, p.surname) FROM public.step105_name_fix_backup b
--  WHERE b.table_name = 'people' AND b.column_name = 'first_name' AND b.row_id = p.id;
-- COMMIT;
