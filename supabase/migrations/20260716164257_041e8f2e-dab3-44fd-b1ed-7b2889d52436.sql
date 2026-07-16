
-- Rewrite block_exam_break to avoid cross-table field references
CREATE OR REPLACE FUNCTION public.block_exam_break()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date  date;
  v_label text;
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    v_date := COALESCE(NEW.start_at::date, NEW.date::date);
  ELSIF TG_TABLE_NAME = 'interview_slots' THEN
    v_date := NEW.slot_date::date;
  ELSIF TG_TABLE_NAME = 'aod_days' THEN
    v_date := NEW.event_date::date;
  ELSIF TG_TABLE_NAME = 'alumni_calls' THEN
    v_date := NEW.planned_date::date;
  ELSIF TG_TABLE_NAME = 'calendar_entries' THEN
    IF NEW.entry_type IN ('meeting','social') THEN
      v_date := NEW.entry_date::date;
    END IF;
  END IF;
  IF v_date IS NULL THEN RETURN NEW; END IF;
  v_label := public.exam_break_on(v_date);
  IF v_label IS NOT NULL THEN
    RAISE EXCEPTION 'This date falls inside the exam session break "%". The calendar does not accept events during exam breaks, so the community can focus on exams and attend when events resume.', v_label
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

-- Extend allowed entry types
ALTER TABLE public.calendar_entries DROP CONSTRAINT IF EXISTS calendar_entries_entry_type_check;
ALTER TABLE public.calendar_entries ADD CONSTRAINT calendar_entries_entry_type_check
  CHECK (entry_type = ANY (ARRAY['meeting','deadline','reminder','social','other','casa_committee','casa_deadline']));

-- Board-only visibility for both CASA types
DROP POLICY IF EXISTS "calendar entries readable by staff" ON public.calendar_entries;
CREATE POLICY "calendar entries readable by staff" ON public.calendar_entries
FOR SELECT USING (
  is_staff(auth.uid())
  AND (entry_type NOT IN ('casa_committee','casa_deadline') OR is_board_member(auth.uid()))
);

-- Pre-populate CASA schedule
INSERT INTO public.calendar_entries (title, entry_date, entry_type, author_name) VALUES
  ('CASA Committee meeting', '2026-09-23', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2026-10-14', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2026-11-11', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-01-27', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-02-17', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-03-22', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-04-14', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-05-19', 'casa_committee', 'System'),
  ('CASA Committee meeting', '2027-07-07', 'casa_committee', 'System'),
  ('CASA Committee — request submission deadline', '2026-09-16', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2026-10-07', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2026-11-04', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-01-20', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-02-10', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-03-15', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-04-07', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-05-12', 'casa_deadline', 'System'),
  ('CASA Committee — request submission deadline', '2027-06-30', 'casa_deadline', 'System');
