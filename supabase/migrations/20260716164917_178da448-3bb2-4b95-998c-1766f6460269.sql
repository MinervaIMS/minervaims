
-- Italian Easter Sunday (Meeus/Jones/Butcher algorithm)
CREATE OR REPLACE FUNCTION public.italian_easter(y integer)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  a int; b int; c int; d int; e int; f int; g int; h int;
  i int; k int; l int; m int; mo int; da int;
BEGIN
  a := y % 19;
  b := y / 100;
  c := y % 100;
  d := b / 4;
  e := b % 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19*a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2*e + 2*i - h - k) % 7;
  m := (a + 11*h + 22*l) / 451;
  mo := (h + l - 7*m + 114) / 31;
  da := ((h + l - 7*m + 114) % 31) + 1;
  RETURN make_date(y, mo, da);
END;
$$;

-- Returns the holiday label if the given date is an Italian public holiday
CREATE OR REPLACE FUNCTION public.italian_holiday_on(d date)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  m int := extract(month from d)::int;
  dy int := extract(day from d)::int;
  y int := extract(year from d)::int;
  easter date := public.italian_easter(y);
BEGIN
  IF m = 1  AND dy = 1  THEN RETURN 'New Year''s Day'; END IF;
  IF m = 1  AND dy = 6  THEN RETURN 'Epiphany'; END IF;
  IF d = easter THEN RETURN 'Easter Sunday'; END IF;
  IF d = easter + 1 THEN RETURN 'Easter Monday'; END IF;
  IF m = 4  AND dy = 25 THEN RETURN 'Liberation Day'; END IF;
  IF m = 5  AND dy = 1  THEN RETURN 'Labour Day'; END IF;
  IF m = 6  AND dy = 2  THEN RETURN 'Republic Day'; END IF;
  IF m = 8  AND dy = 15 THEN RETURN 'Assumption of Mary'; END IF;
  IF m = 11 AND dy = 1  THEN RETURN 'All Saints'' Day'; END IF;
  IF m = 12 AND dy = 8  THEN RETURN 'Immaculate Conception'; END IF;
  IF m = 12 AND dy = 25 THEN RETURN 'Christmas Day'; END IF;
  IF m = 12 AND dy = 26 THEN RETURN 'St. Stephen''s Day'; END IF;
  RETURN NULL;
END;
$$;

-- Extend the exam-break trigger to also block Italian public holidays
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

  v_label := public.italian_holiday_on(v_date);
  IF v_label IS NOT NULL THEN
    RAISE EXCEPTION 'This date is an Italian public holiday (%). Please pick another day so members are not asked to work on a national holiday.', v_label
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- Rename existing CASA deadline entries
UPDATE public.calendar_entries
   SET title = 'Deadline: CASA Committee request submission'
 WHERE entry_type = 'casa_deadline'
   AND title = 'CASA Committee — request submission deadline';
