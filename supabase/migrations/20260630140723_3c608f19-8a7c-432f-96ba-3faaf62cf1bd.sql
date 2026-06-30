ALTER TABLE public.treasury_entries ADD COLUMN IF NOT EXISTS division public.org_division;
CREATE INDEX IF NOT EXISTS treasury_entries_division_idx ON public.treasury_entries(division);
CREATE INDEX IF NOT EXISTS treasury_entries_semester_idx ON public.treasury_entries(academic_semester);