-- =====================================================================
-- STEP 91. Alumni calls are events.
-- ---------------------------------------------------------------------
-- Until now an alumni call lived in `alumni_calls` (with its alumni in
-- `alumni_call_participants`), and only a call with a poster and a date
-- was copied into `events` for the public site. From now on every alumni
-- call IS an event of type `alumni_call`, created from Events > Create
-- like any other, so "events held" and "alumni calls held" are counted
-- from one table.
--
-- What this migration does, in order:
--
--   1. `events.date_tbc`: "date to be confirmed". Only an alumni call
--      can carry it. Such a call is a plan: it has a provisional date (the
--      day it was planned) that nobody sees, and it stays off the website,
--      out of calendars, the Dashboard and Attendance, and out of every
--      count, until somebody sets the real date. A call that is still a
--      plan cannot collect registrations.
--   2. The exam-break and holiday guard ignores a provisional date.
--   3. The planning that only Alumni Calls had, now beside its event:
--        event_alumni_calls  one row per alumni call event: the status
--                            (planned, invited, accepted, completed,
--                            declined), the responsible person and the
--                            internal notes;
--        event_alumni        the alumni taking part: from the directory
--                            or typed by hand, with current company and
--                            position, former role and division at
--                            Minerva, and how they are introduced on the
--                            website.
--      Both are readable by staff only, like the old tables.
--   4. Every existing call becomes, or is joined to, its event:
--        - a call already published joins the event it was published as;
--        - otherwise it joins an alumni call event on the same date for
--          the same division that no other call has claimed;
--        - otherwise a new event is created, OFF the website (the call
--          was not public), with the date to be confirmed when it had
--          none.
--      Participants, posters, statuses, notes, the responsible person and
--      who added it are carried over. Nothing on the public site changes:
--      an event that existed keeps its title, guests and poster.
--      The counts before and after are compared, and the migration stops
--      (changing nothing) if they do not match. A NOTICE reports them.
--   5. Alumni call dates and times are internal (decided in Step 91): the
--      public description of an alumni call no longer says the time. The
--      five Spring 2026 descriptions read "An online meeting at 17:00
--      with alumni ...": the time is taken out, and the original text is
--      kept in `events_step91_description_backup`.
--   6. The old tables stay, read-only, as the backup: no application
--      role can write to them any more. Nothing is dropped.
--   7. Visitors (not signed in) can no longer read alumni call rows of
--      `events` through the API, where the date and time are. The public
--      pages read `public.website_events`, which carries every event they
--      showed before, with the date and time left empty for alumni calls.
--
-- Safe to run twice: a call already carried over is skipped, and every
-- object is created only if missing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Date to be confirmed.
-- ---------------------------------------------------------------------
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date_tbc boolean NOT NULL DEFAULT false;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_date_tbc_alumni_only;
ALTER TABLE public.events ADD CONSTRAINT events_date_tbc_alumni_only
  CHECK (NOT date_tbc OR event_type = 'alumni_call');
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_date_tbc_no_registration;
ALTER TABLE public.events ADD CONSTRAINT events_date_tbc_no_registration
  CHECK (NOT date_tbc OR (NOT registration_enabled AND NOT show_on_website));

-- ---------------------------------------------------------------------
-- 2. The exam-break and holiday guard: unchanged, except that a
--    provisional date (date_tbc) is not a date anybody will attend on.
-- ---------------------------------------------------------------------
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
    -- Step 91: an alumni call whose date is still to be confirmed.
    IF NEW.date_tbc THEN RETURN NEW; END IF;
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

-- ---------------------------------------------------------------------
-- 3. The planning, beside the event.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_alumni_calls (
  event_id           uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned','invited','accepted','completed','declined')),
  responsible_person text CHECK (responsible_person IS NULL OR char_length(responsible_person) <= 200),
  notes              text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  -- Who added the call (the old "organiser_name"); the organiser itself
  -- is the event's division, or the Board.
  added_by_name      text CHECK (added_by_name IS NULL OR char_length(added_by_name) <= 200),
  -- The `alumni_calls` row this came from, for calls planned before Step 91.
  legacy_call_id     uuid UNIQUE,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_alumni (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id               uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  -- The alumnus in the directory, or empty for somebody typed by hand.
  alumni_id              uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  name                   text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  company                text CHECK (company IS NULL OR char_length(company) <= 200),
  position               text CHECK (position IS NULL OR char_length(position) <= 200),
  former_role            text CHECK (former_role IS NULL OR char_length(former_role) <= 200),
  former_division        public.org_division,
  -- How they are introduced on the website, after their name: "Rates
  -- Option Trader at Barclays, former Head of Investment Research".
  headline               text CHECK (headline IS NULL OR char_length(headline) <= 300),
  sort_order             integer NOT NULL DEFAULT 0,
  legacy_participant_id  uuid UNIQUE,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_alumni_event_idx ON public.event_alumni (event_id, sort_order);

ALTER TABLE public.event_alumni_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_alumni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alumni call planning readable by staff" ON public.event_alumni_calls;
CREATE POLICY "alumni call planning readable by staff" ON public.event_alumni_calls
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "alumni call guests readable by staff" ON public.event_alumni;
CREATE POLICY "alumni call guests readable by staff" ON public.event_alumni
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
REVOKE ALL ON public.event_alumni_calls, public.event_alumni FROM anon;
GRANT SELECT ON public.event_alumni_calls, public.event_alumni TO authenticated;
GRANT ALL ON public.event_alumni_calls, public.event_alumni TO service_role;

DROP TRIGGER IF EXISTS update_event_alumni_calls_updated_at ON public.event_alumni_calls;
CREATE TRIGGER update_event_alumni_calls_updated_at
  BEFORE UPDATE ON public.event_alumni_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The original public text of any alumni call description changed below.
CREATE TABLE IF NOT EXISTS public.events_step91_description_backup (
  event_id    uuid PRIMARY KEY,
  description text,
  saved_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events_step91_description_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events_step91_description_backup FROM anon, authenticated;
GRANT ALL ON public.events_step91_description_backup TO service_role;

-- ---------------------------------------------------------------------
-- 4. Every call into its event.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  c               record;
  v_event         uuid;
  v_guest         text[];
  v_has_trigger   boolean;
  n_calls_before  integer;
  n_parts_before  integer;
  n_ev_before     integer;
  n_total_before  integer;
  n_skipped       integer := 0;
  n_own           integer := 0;
  n_matched       integer := 0;
  n_created       integer := 0;
  n_created_tbc   integer := 0;
  n_orphans       integer := 0;
  n_calls_after   integer;
  n_parts_after   integer;
  n_ev_after      integer;
  n_total_after   integer;
  n_desc          integer := 0;
BEGIN
  SELECT count(*) INTO n_calls_before FROM public.alumni_calls;
  SELECT count(*) INTO n_parts_before FROM public.alumni_call_participants;
  SELECT count(*) INTO n_ev_before FROM public.events WHERE event_type = 'alumni_call';
  SELECT count(*) INTO n_total_before FROM public.events;

  -- History is history: a call already held on a day that later became an
  -- exam break or a holiday is still recorded. The guard is off for the
  -- copy only, inside this one statement.
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_exam_break_trg'
                  AND tgrelid = 'public.events'::regclass AND NOT tgisinternal)
    INTO v_has_trigger;
  IF v_has_trigger THEN
    EXECUTE 'ALTER TABLE public.events DISABLE TRIGGER block_exam_break_trg';
  END IF;

  FOR c IN SELECT * FROM public.alumni_calls ORDER BY created_at, id LOOP
    IF EXISTS (SELECT 1 FROM public.event_alumni_calls WHERE legacy_call_id = c.id) THEN
      n_skipped := n_skipped + 1;
      CONTINUE;
    END IF;

    -- The guest lines the call would have been published with: the
    -- company in the directory, or the role written on the call.
    SELECT COALESCE(array_agg(p.alumnus_name || COALESCE(' - ' || COALESCE(NULLIF(btrim(a.company), ''), NULLIF(btrim(p.former_role), '')), '')
                              ORDER BY p.created_at, p.id), ARRAY[]::text[])
      INTO v_guest
      FROM public.alumni_call_participants p
      LEFT JOIN public.alumni a ON a.id = p.alumni_id
     WHERE p.call_id = c.id;

    v_event := NULL;
    -- a) The event it was published as.
    IF c.event_id IS NOT NULL THEN
      SELECT e.id INTO v_event FROM public.events e
       WHERE e.id = c.event_id
         AND NOT EXISTS (SELECT 1 FROM public.event_alumni_calls d WHERE d.event_id = e.id);
      IF v_event IS NOT NULL THEN n_own := n_own + 1; END IF;
    END IF;
    -- b) An alumni call event on the same day for the same division that
    --    no other call has claimed: the same call, recorded twice.
    IF v_event IS NULL AND c.planned_date IS NOT NULL THEN
      SELECT e.id INTO v_event FROM public.events e
       WHERE e.event_type = 'alumni_call' AND e.date = c.planned_date
         AND e.division IS NOT DISTINCT FROM NULLIF(c.division, 'none')
         AND NOT EXISTS (SELECT 1 FROM public.event_alumni_calls d WHERE d.event_id = e.id)
         AND NOT EXISTS (SELECT 1 FROM public.alumni_calls o WHERE o.event_id = e.id AND o.id <> c.id)
       ORDER BY e.created_at
       LIMIT 1;
      IF v_event IS NOT NULL THEN n_matched := n_matched + 1; END IF;
    END IF;

    IF v_event IS NOT NULL THEN
      -- Fill what the event is missing; never overwrite what it shows.
      UPDATE public.events
         SET poster_url = COALESCE(poster_url, NULLIF(c.poster_url, '')),
             division   = COALESCE(division, NULLIF(c.division, 'none')),
             guest      = CASE WHEN COALESCE(cardinality(guest), 0) = 0 AND cardinality(v_guest) > 0 THEN v_guest ELSE guest END
       WHERE id = v_event
         AND ((poster_url IS NULL AND NULLIF(c.poster_url, '') IS NOT NULL)
              OR (division IS NULL AND NULLIF(c.division, 'none') IS NOT NULL)
              OR (COALESCE(cardinality(guest), 0) = 0 AND cardinality(v_guest) > 0));
    ELSE
      -- c) A new event, as the call would have been published: same
      --    title, same guest lines (the company in the directory, or
      --    the role written on the call). Off the website, because it was not
      --    public, and with the date to be confirmed when it had none.
      INSERT INTO public.events (
        title, date, date_tbc, place, online, event_type, division, guest,
        description, poster_url, show_on_website, registration_enabled, in_archive, created_by
      ) VALUES (
        CASE NULLIF(c.division, 'none')
          WHEN 'equity' THEN 'Alumni Call: Equity Research'
          WHEN 'investment' THEN 'Alumni Call: Investment Research'
          WHEN 'macro' THEN 'Alumni Call: Macro Research'
          WHEN 'portfolio' THEN 'Alumni Call: Portfolio Management'
          WHEN 'quant' THEN 'Alumni Call: Quantitative Research'
          WHEN 'media' THEN 'Alumni Call: Media and Communication'
          WHEN 'operations' THEN 'Alumni Call: Operations'
          WHEN 'board' THEN 'Alumni Call: Board'
          ELSE 'Alumni Call'
        END,
        COALESCE(c.planned_date, (c.created_at AT TIME ZONE 'Europe/Rome')::date),
        c.planned_date IS NULL,
        'Online', true, 'alumni_call', NULLIF(c.division, 'none'), v_guest,
        NULL, NULLIF(c.poster_url, ''), false, false, true, c.created_by
      )
      RETURNING id INTO v_event;
      n_created := n_created + 1;
      IF c.planned_date IS NULL THEN n_created_tbc := n_created_tbc + 1; END IF;
    END IF;

    INSERT INTO public.event_alumni_calls (event_id, status, responsible_person, notes, added_by_name, legacy_call_id, created_by, created_at)
    VALUES (v_event, c.status, NULLIF(btrim(c.responsible_person), ''), NULLIF(btrim(c.notes), ''),
            NULLIF(btrim(c.organiser_name), ''), c.id, c.created_by, c.created_at);

    -- The alumni, in the order the event lists them. How each is
    -- introduced is taken from the guest line the event already prints
    -- for them, so the public text stays word for word; failing that, as
    -- the old tracker would have published them: the company in the
    -- directory, then the role written on the call.
    INSERT INTO public.event_alumni (event_id, alumni_id, name, company, headline, sort_order, legacy_participant_id, created_at)
    SELECT v_event, x.alumni_id, x.alumnus_name, x.company, x.headline,
           (row_number() OVER (ORDER BY x.pos NULLS LAST, x.created_at, x.id))::integer - 1,
           x.id, x.created_at
      FROM (
        SELECT p.id, p.alumni_id, p.alumnus_name, p.created_at, a.company,
               g.pos,
               COALESCE(NULLIF(btrim(substr(g.line, length(p.alumnus_name) + 4)), ''),
                        NULLIF(btrim(a.company), ''),
                        NULLIF(btrim(p.former_role), '')) AS headline
          FROM public.alumni_call_participants p
          LEFT JOIN public.alumni a ON a.id = p.alumni_id
          LEFT JOIN LATERAL (
            SELECT l.line, l.pos
              FROM public.events e, unnest(e.guest) WITH ORDINALITY AS l(line, pos)
             WHERE e.id = v_event
               AND (l.line = p.alumnus_name OR l.line LIKE p.alumnus_name || ' - %')
             ORDER BY l.pos
             LIMIT 1
          ) g ON true
         WHERE p.call_id = c.id
      ) x
    ON CONFLICT (legacy_participant_id) DO NOTHING;
  END LOOP;

  -- An alumni call event with no call behind it (made by hand before the
  -- tracker existed) gets its planning row too, so every alumni call has
  -- a status: completed if it has happened, planned otherwise.
  INSERT INTO public.event_alumni_calls (event_id, status)
  SELECT e.id, CASE WHEN e.date < (now() AT TIME ZONE 'Europe/Rome')::date THEN 'completed' ELSE 'planned' END
    FROM public.events e
   WHERE e.event_type = 'alumni_call'
     AND NOT EXISTS (SELECT 1 FROM public.event_alumni_calls d WHERE d.event_id = e.id);
  GET DIAGNOSTICS n_orphans = ROW_COUNT;

  IF v_has_trigger THEN
    EXECUTE 'ALTER TABLE public.events ENABLE TRIGGER block_exam_break_trg';
  END IF;

  -- The check: one planning row per call, one guest row per participant.
  SELECT count(*) INTO n_calls_after FROM public.event_alumni_calls WHERE legacy_call_id IS NOT NULL;
  SELECT count(*) INTO n_parts_after FROM public.event_alumni WHERE legacy_participant_id IS NOT NULL;
  SELECT count(*) INTO n_ev_after FROM public.events WHERE event_type = 'alumni_call';
  SELECT count(*) INTO n_total_after FROM public.events;
  IF n_calls_after <> n_calls_before OR n_parts_after <> n_parts_before
     OR n_ev_after <> n_ev_before + n_created OR n_total_after <> n_total_before + n_created THEN
    RAISE EXCEPTION 'Alumni calls into events: the counts do not match (calls % before, % after; participants % before, % after; alumni call events % before, % after with % created). Nothing was changed.',
      n_calls_before, n_calls_after, n_parts_before, n_parts_after, n_ev_before, n_ev_after, n_created;
  END IF;

  RAISE NOTICE 'Alumni calls into events. Before: % calls with % participants, % alumni call events (% events in all). After: % calls carried over (% already done before this run), % participants carried over; % calls joined the event they were published as, % joined an alumni call event on the same day, % became new events off the website (% of them with the date to be confirmed); % alumni call events had no call and were given a status; % alumni call events now (% events in all).',
    n_calls_before, n_parts_before, n_ev_before, n_total_before,
    n_calls_after, n_skipped, n_parts_after,
    n_own, n_matched, n_created, n_created_tbc, n_orphans, n_ev_after, n_total_after;

  -- ---------------------------------------------------------------------
  -- 5. The time out of public alumni call descriptions.
  -- ---------------------------------------------------------------------
  INSERT INTO public.events_step91_description_backup (event_id, description)
  SELECT id, description FROM public.events
   WHERE event_type = 'alumni_call'
     AND description ~* '\s+at\s+[0-9]{1,2}[:.][0-9]{2}(\s*[ap]\.?m\.?)?'
  ON CONFLICT (event_id) DO NOTHING;
  UPDATE public.events
     SET description = regexp_replace(description, '\s+at\s+[0-9]{1,2}[:.][0-9]{2}(\s*[ap]\.?m\.?)?', '', 'gi')
   WHERE event_type = 'alumni_call'
     AND description ~* '\s+at\s+[0-9]{1,2}[:.][0-9]{2}(\s*[ap]\.?m\.?)?';
  GET DIAGNOSTICS n_desc = ROW_COUNT;
  RAISE NOTICE 'Alumni call descriptions: the time was taken out of % (originals kept in events_step91_description_backup).', n_desc;
END $$;

-- ---------------------------------------------------------------------
-- 6. The old tables: a read-only backup.
-- ---------------------------------------------------------------------
-- No application role writes to them any more; the database's own
-- housekeeping (a deleted event or alumnus, an erased account) still can,
-- because it runs as the owner.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.alumni_calls, public.alumni_call_participants
  FROM anon, authenticated, service_role;
COMMENT ON TABLE public.alumni_calls IS
  'Read-only backup since Step 91. Alumni calls are events of type alumni_call; their planning is in event_alumni_calls and their alumni in event_alumni.';
COMMENT ON TABLE public.alumni_call_participants IS
  'Read-only backup since Step 91. See event_alumni.';

-- ---------------------------------------------------------------------
-- 7. Alumni call dates and times stay internal.
-- ---------------------------------------------------------------------
-- Signed-in users read every event as before (the workspace needs the
-- dates). Visitors read every event as before EXCEPT alumni calls, whose
-- row carries the date and time.
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;
DROP POLICY IF EXISTS "Events readable when signed in" ON public.events;
CREATE POLICY "Events readable when signed in" ON public.events
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Events readable by visitors, except alumni calls" ON public.events;
CREATE POLICY "Events readable by visitors, except alumni calls" ON public.events
  FOR SELECT TO anon USING (event_type <> 'alumni_call');

-- What the public pages read: the events they always showed, with the
-- date, start and end left empty for an alumni call. `is_past` and
-- `listing_order` let a page place an alumni call among the others
-- without knowing its date. An alumni call is included only when it is
-- on the website or open to registration beyond members; one still to be
-- confirmed never is.
CREATE OR REPLACE VIEW public.website_events WITH (security_barrier = true) AS
SELECT
  e.id, e.title,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.date END     AS date,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.start_at END AS start_at,
  CASE WHEN e.event_type = 'alumni_call' THEN NULL ELSE e.end_at END   AS end_at,
  e.place, e.online, e.moderator, e.guest, e.description, e.poster_url,
  e.event_type, e.division, e.registration_enabled, e.registration_audience,
  e.capacity, e.show_on_website, e.in_archive, e.aod_day_id,
  -- The same rule the Events page uses: past once its day has begun (UTC).
  (e.date::timestamp AT TIME ZONE 'UTC') < now() AS is_past,
  row_number() OVER (ORDER BY e.date DESC, e.start_at DESC NULLS LAST, e.id) AS listing_order
FROM public.events e
WHERE NOT e.date_tbc
  AND (e.event_type <> 'alumni_call'
       OR e.show_on_website
       OR (e.registration_enabled AND e.registration_audience <> 'members'));
REVOKE ALL ON public.website_events FROM anon, authenticated;
GRANT SELECT ON public.website_events TO anon, authenticated, service_role;
COMMENT ON VIEW public.website_events IS
  'Events as the public site shows them. Alumni call dates and times are internal (Step 91) and read as empty here.';
