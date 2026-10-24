import postgres from 'npm:postgres@3'

const MIGRATION_SQL = `-- =====================================================================
-- STEP 93B. The €STR fills itself, and company visits select their
-- participants.
-- ---------------------------------------------------------------------
--   1. The €STR: every month from January 2018 to September 2026 from the
--      ECB Data Portal (monthly average of the daily €STR; EONIA less 8.5
--      basis points before October 2019), then a daily job that asks the
--      key-numbers function to add each new month, so the Sharpe ratios
--      on the website compute themselves. A value already typed by the
--      PM team is never replaced.
--   2. Company visits with a closing date: interest with a CV (private
--      bucket event-cvs), the participation record the President and the
--      Vice President select on, the four emails, the CVs deleted six
--      months after the visit, and website_events with the closing date.
--   3. The four company visit emails, stored as transactional-emails.ts
--      writes them.
--   4. The reminders: no "register now" reminders and no "Can't make it"
--      link for a visit that selects.
--   5. The key numbers recomputed with the €STR.
--
-- The two daily jobs read no secret: each calls its edge function with
-- the public key and a token of its own (public.scheduled_job_tokens),
-- because Lovable Cloud does not let a migration read a stored secret.
--
-- Nothing existing is deleted or overwritten: new columns, new tables,
-- new functions, CREATE OR REPLACE of the two reminder functions and of
-- the website_events view (unchanged, with one column added at the end),
-- and template rows upserted by key. Safe to run twice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The scheduled jobs' own tokens.
-- ---------------------------------------------------------------------
-- A daily job proves who it is to its edge function with a random token
-- of its own, kept here (supabase/functions/_shared/job-token.ts). Row
-- level security is on with no policies and nothing is granted to anon or
-- authenticated: only the database itself and the service role read it.
-- A token is made once and kept on a second run.
CREATE TABLE IF NOT EXISTS public.scheduled_job_tokens (
  job        text PRIMARY KEY,
  token      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_job_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_job_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scheduled_job_tokens TO service_role;
INSERT INTO public.scheduled_job_tokens (job, token)
SELECT j, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  FROM unnest(ARRAY['estr_fill', 'company_visit_cv_cleanup']) AS j
ON CONFLICT (job) DO NOTHING;

-- The headers a job sends: the project's public key (the one every page
-- of the website carries; it opens the gateway and nothing more) and the
-- job's token.
CREATE OR REPLACE FUNCTION public.scheduled_job_headers(p_job text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzanVkemRnc2NjYWNwamJ6c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDM5MTQsImV4cCI6MjA4MjIxOTkxNH0.9sYXmhFfiqID-8XFxc83vbEuTilWiUSnmiU6xzqyRdg',
    'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzanVkemRnc2NjYWNwamJ6c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDM5MTQsImV4cCI6MjA4MjIxOTkxNH0.9sYXmhFfiqID-8XFxc83vbEuTilWiUSnmiU6xzqyRdg',
    'x-job-token', (SELECT token FROM public.scheduled_job_tokens WHERE job = p_job))
$$;
REVOKE ALL ON FUNCTION public.scheduled_job_headers(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scheduled_job_headers(text) TO service_role;

-- ---------------------------------------------------------------------
-- 1. The €STR, so the Sharpe ratios compute themselves.
-- ---------------------------------------------------------------------
-- The €STR of every month from January 2018 to September 2026, as the
-- ECB Data Portal gave it on 23 October 2026 and computed by
-- supabase/functions/_shared/ecb.ts (the monthly average of the daily
-- €STR; before October 2019, the EONIA monthly average minus 8.5 basis
-- points, the ECB's own bridge). A month that already has a value (one
-- the PM team typed) is left as it is. From now on the database fills
-- each new month by itself (estr_fill_tick below).
WITH src(month, value, kind) AS (VALUES
  ('2018-01-01', -0.4474, 'e'),
  ('2018-02-01', -0.4497, 'e'),
  ('2018-03-01', -0.4489, 'e'),
  ('2018-04-01', -0.4507, 'e'),
  ('2018-05-01', -0.4475, 'e'),
  ('2018-06-01', -0.4468, 'e'),
  ('2018-07-01', -0.4486, 'e'),
  ('2018-08-01', -0.4441, 'e'),
  ('2018-09-01', -0.4477, 'e'),
  ('2018-10-01', -0.4510, 'e'),
  ('2018-11-01', -0.4463, 'e'),
  ('2018-12-01', -0.4455, 'e'),
  ('2019-01-01', -0.4520, 'e'),
  ('2019-02-01', -0.4520, 'e'),
  ('2019-03-01', -0.4529, 'e'),
  ('2019-04-01', -0.4520, 'e'),
  ('2019-05-01', -0.4516, 'e'),
  ('2019-06-01', -0.4466, 'e'),
  ('2019-07-01', -0.4518, 'e'),
  ('2019-08-01', -0.4462, 'e'),
  ('2019-09-01', -0.4882, 'e'),
  ('2019-10-01', -0.5492, 's'),
  ('2019-11-01', -0.5363, 's'),
  ('2019-12-01', -0.5412, 's'),
  ('2020-01-01', -0.5377, 's'),
  ('2020-02-01', -0.5383, 's'),
  ('2020-03-01', -0.5338, 's'),
  ('2020-04-01', -0.5365, 's'),
  ('2020-05-01', -0.5418, 's'),
  ('2020-06-01', -0.5457, 's'),
  ('2020-07-01', -0.5499, 's'),
  ('2020-08-01', -0.5527, 's'),
  ('2020-09-01', -0.5540, 's'),
  ('2020-10-01', -0.5544, 's'),
  ('2020-11-01', -0.5563, 's'),
  ('2020-12-01', -0.5575, 's'),
  ('2021-01-01', -0.5633, 's'),
  ('2021-02-01', -0.5637, 's'),
  ('2021-03-01', -0.5643, 's'),
  ('2021-04-01', -0.5658, 's'),
  ('2021-05-01', -0.5647, 's'),
  ('2021-06-01', -0.5646, 's'),
  ('2021-07-01', -0.5662, 's'),
  ('2021-08-01', -0.5679, 's'),
  ('2021-09-01', -0.5700, 's'),
  ('2021-10-01', -0.5706, 's'),
  ('2021-11-01', -0.5730, 's'),
  ('2021-12-01', -0.5772, 's'),
  ('2022-01-01', -0.5779, 's'),
  ('2022-02-01', -0.5765, 's'),
  ('2022-03-01', -0.5787, 's'),
  ('2022-04-01', -0.5837, 's'),
  ('2022-05-01', -0.5850, 's'),
  ('2022-06-01', -0.5820, 's'),
  ('2022-07-01', -0.5106, 's'),
  ('2022-08-01', -0.0848, 's'),
  ('2022-09-01', 0.3553, 's'),
  ('2022-10-01', 0.6560, 's'),
  ('2022-11-01', 1.3680, 's'),
  ('2022-12-01', 1.5684, 's'),
  ('2023-01-01', 1.9019, 's'),
  ('2023-02-01', 2.2745, 's'),
  ('2023-03-01', 2.5721, 's'),
  ('2023-04-01', 2.8998, 's'),
  ('2023-05-01', 3.0796, 's'),
  ('2023-06-01', 3.2380, 's'),
  ('2023-07-01', 3.4022, 's'),
  ('2023-08-01', 3.6419, 's'),
  ('2023-09-01', 3.7466, 's'),
  ('2023-10-01', 3.9007, 's'),
  ('2023-11-01', 3.9017, 's'),
  ('2023-12-01', 3.9015, 's'),
  ('2024-01-01', 3.9040, 's'),
  ('2024-02-01', 3.9071, 's'),
  ('2024-03-01', 3.9066, 's'),
  ('2024-04-01', 3.9077, 's'),
  ('2024-05-01', 3.9069, 's'),
  ('2024-06-01', 3.7494, 's'),
  ('2024-07-01', 3.6626, 's'),
  ('2024-08-01', 3.6634, 's'),
  ('2024-09-01', 3.5565, 's'),
  ('2024-10-01', 3.3375, 's'),
  ('2024-11-01', 3.1644, 's'),
  ('2024-12-01', 3.0641, 's'),
  ('2025-01-01', 2.9195, 's'),
  ('2025-02-01', 2.6906, 's'),
  ('2025-03-01', 2.4989, 's'),
  ('2025-04-01', 2.3411, 's'),
  ('2025-05-01', 2.1691, 's'),
  ('2025-06-01', 2.0069, 's'),
  ('2025-07-01', 1.9223, 's'),
  ('2025-08-01', 1.9240, 's'),
  ('2025-09-01', 1.9245, 's'),
  ('2025-10-01', 1.9268, 's'),
  ('2025-11-01', 1.9289, 's'),
  ('2025-12-01', 1.9295, 's'),
  ('2026-01-01', 1.9320, 's'),
  ('2026-02-01', 1.9312, 's'),
  ('2026-03-01', 1.9321, 's'),
  ('2026-04-01', 1.9316, 's'),
  ('2026-05-01', 1.9307, 's'),
  ('2026-06-01', 2.0449, 's'),
  ('2026-07-01', 2.1838, 's'),
  ('2026-08-01', 2.1870, 's'),
  ('2026-09-01', 2.3143, 's')
)
INSERT INTO public.fund_reference_series (series, month, value, source, as_of)
SELECT 'estr', month::date, value,
       CASE kind WHEN 's' THEN 'ECB Data Portal, €STR (EST.B.EU000A2X2A25.WT), monthly average of daily rates' ELSE 'ECB Data Portal, EONIA monthly average (FM.M.U2.EUR.4F.MM.EONIA.HSTA) minus 8.5 basis points' END,
       DATE '2026-10-23'
  FROM src
ON CONFLICT (series, month) DO NOTHING;

-- Every morning the database asks the key-numbers function to fill the
-- €STR from the ECB, but only while the last complete month has none (a
-- month counts as complete from the 4th of the next one: its last rate is
-- published the following business day) and some fund has returns. The
-- function fills every month still missing, never one the PM team typed,
-- then recomputes the key numbers. See supabase/functions/_shared/ecb.ts.
CREATE OR REPLACE FUNCTION public.estr_fill_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date := (date_trunc('month', now() AT TIME ZONE 'UTC')
                  - CASE WHEN extract(day FROM now() AT TIME ZONE 'UTC') >= 4 THEN interval '1 month' ELSE interval '2 months' END)::date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fund_performance_years) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.fund_reference_series WHERE series = 'estr' AND month = v_last) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN RETURN; END IF;
  EXECUTE $q$SELECT net.http_post(url := $1, headers := $2, body := $3)$q$
    USING 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/key-numbers',
          public.scheduled_job_headers('estr_fill'),
          jsonb_build_object('action', 'fill-estr');
END;
$$;
REVOKE ALL ON FUNCTION public.estr_fill_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estr_fill_tick() TO service_role;

-- At 07:20 UTC (09:20 in Rome in summer, 08:20 in winter), after the ECB
-- has published the previous business day's rate.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('estr_fill') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'estr_fill');
    PERFORM cron.schedule('estr_fill', '20 7 * * *', $cron$SELECT public.estr_fill_tick()$cron$);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Company visits: interest, selection, invitations.
-- ---------------------------------------------------------------------
-- A company visit with a closing date selects its participants instead
-- of taking registrations: members and alumni register their interest
-- with their CV until the closing date; the President and the Vice
-- President mark each one Invite or Not this time and send the decisions
-- together. An invited member becomes an ordinary registration (the door
-- list, the QR check-in and the day-before reminder work as for any
-- event); the others are told kindly and kept as reserves, and one of
-- them can be offered a place that opens up. Participants are chosen on
-- their participation in the Society's activities and their interest in
-- the topic of the visit; the CV plays no part in the selection.
--
-- A company visit created before this step, without a closing date, keeps
-- taking registrations exactly as before.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS interest_closes_at timestamptz;
COMMENT ON COLUMN public.events.interest_closes_at IS
  'Company visits only: when the interest form closes. Set, the visit selects its participants (Step 93B).';

CREATE TABLE IF NOT EXISTS public.event_interest (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id        uuid REFERENCES public.members(id) ON DELETE SET NULL,
  kind             text NOT NULL DEFAULT 'member' CHECK (kind IN ('member', 'alumni')),
  name             text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  email            text NOT NULL CHECK (length(email) BETWEEN 3 AND 255),
  cv_path          text,
  cv_name          text CHECK (cv_name IS NULL OR length(cv_name) <= 200),
  cv_size          integer CHECK (cv_size IS NULL OR cv_size > 0),
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- The selectors' draft: nothing reaches the member until it is sent.
  decision         text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'invite', 'not_selected')),
  decided_by       uuid,
  decided_at       timestamptz,
  -- What the member has been told, and when.
  notified         text CHECK (notified IN ('invited', 'not_selected')),
  notified_at      timestamptz,
  spot_opened_at   timestamptz,
  registration_id  uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  withdrawn_at     timestamptz,
  withdrawn_by     uuid,
  cv_deleted_at    timestamptz,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_interest_event_idx ON public.event_interest (event_id);
ALTER TABLE public.event_interest ENABLE ROW LEVEL SECURITY;
-- No policies: read and written only by the company-visits function.
REVOKE ALL ON public.event_interest FROM anon, authenticated;
GRANT ALL ON public.event_interest TO service_role;

-- The CVs: a private bucket, read and written only by the function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('event-cvs', 'event-cvs', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- What the selectors weigh: each candidate's participation, counted as
-- People > Members counts it (events up to today where attendance was
-- taken; a registration is the candidate's by their account, their
-- address, or the member it resolves to in event_registration_members).
CREATE OR REPLACE FUNCTION public.company_visit_candidates(p_event_id uuid)
RETURNS TABLE (
  interest_id uuid, events_attended_year integer, events_attended_total integer,
  visits_attended integer, missed_year integer, visits_missed integer, last_attended date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Europe/Rome')::date AS d
  ), year_start AS (
    SELECT make_date(CASE WHEN extract(month FROM d) >= 9 THEN extract(year FROM d)::int
                          ELSE extract(year FROM d)::int - 1 END, 9, 1) AS d
      FROM today
  ), me AS (
    SELECT i.id AS interest_id, coalesce(i.member_id, m.id) AS member_id, i.user_id, lower(btrim(i.email)) AS email
      FROM public.event_interest i
      LEFT JOIN public.members m ON m.user_id = i.user_id
     WHERE i.event_id = p_event_id
  ), held AS (
    SELECT e.id, e.event_type, coalesce(e.date, (e.start_at AT TIME ZONE 'Europe/Rome')::date) AS day
      FROM public.events e, today
     WHERE e.id <> p_event_id
       AND coalesce(e.date, (e.start_at AT TIME ZONE 'Europe/Rome')::date) <= today.d
       AND EXISTS (SELECT 1 FROM public.event_registrations r WHERE r.event_id = e.id AND r.attended)
  ), cand AS (
    SELECT me.interest_id, r.id AS rid FROM me JOIN public.event_registrations r ON r.user_id = me.user_id
    UNION
    SELECT me.interest_id, r.id FROM me JOIN public.event_registrations r
        ON r.email IS NOT NULL AND lower(btrim(r.email)) = me.email
    UNION
    SELECT me.interest_id, v.registration_id FROM me JOIN public.event_registration_members v
        ON me.member_id IS NOT NULL AND v.member_id = me.member_id
  ), regs AS (
    SELECT c.interest_id, h.id AS event_id, h.event_type, h.day, bool_or(r.attended) AS attended
      FROM cand c
      JOIN public.event_registrations r ON r.id = c.rid
      JOIN held h ON h.id = r.event_id
     GROUP BY c.interest_id, h.id, h.event_type, h.day
  )
  SELECT me.interest_id,
         (count(*) FILTER (WHERE regs.attended AND regs.day >= ys.d))::int,
         (count(*) FILTER (WHERE regs.attended))::int,
         (count(*) FILTER (WHERE regs.attended AND regs.event_type = 'company_visit'))::int,
         (count(*) FILTER (WHERE regs.event_id IS NOT NULL AND NOT regs.attended AND regs.day >= ys.d))::int,
         (count(*) FILTER (WHERE regs.event_id IS NOT NULL AND NOT regs.attended AND regs.event_type = 'company_visit'))::int,
         max(regs.day) FILTER (WHERE regs.attended)
    FROM me
    CROSS JOIN year_start ys
    LEFT JOIN regs ON regs.interest_id = me.interest_id
   GROUP BY me.interest_id;
$$;
REVOKE ALL ON FUNCTION public.company_visit_candidates(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_visit_candidates(uuid) TO service_role;

-- The four emails, built like every other event email (the same blocks:
-- ticket, Add to calendar, meeting link), from transactional-emails.ts.
--   received      the interest and the CV have arrived
--   invited       a place, with the ticket and the commitment it carries
--   not_selected  not this time, kept as a reserve
--   spot_opened   a reserve is offered a place that opened up
-- company_visit_enqueue builds one for an address; company_visit_notice
-- sends it to the person behind an interest, with their own ticket, and
-- company_visit_notice_tests sends all four to one address with a sample
-- ticket (Registration Forms, "Send a test").
CREATE OR REPLACE FUNCTION public.company_visit_enqueue(p_kind text, p_event_id uuid, p_email text, p_first text, p_checkin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  e        RECORD;
  v_key    text;
  v_ticket boolean := p_kind IN ('invited', 'spot_opened');
  v_join   text := '';
  v_desc   text;
BEGIN
  v_key := CASE p_kind
    WHEN 'received' THEN 'company_visit_interest_received'
    WHEN 'invited' THEN 'company_visit_invited'
    WHEN 'not_selected' THEN 'company_visit_not_selected'
    WHEN 'spot_opened' THEN 'company_visit_spot_opened'
  END;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Unknown company visit email %', p_kind; END IF;
  IF nullif(btrim(coalesce(p_email, '')), '') IS NULL THEN RETURN; END IF;
  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_ticket AND coalesce(e.online, false) THEN
    v_join := public.event_join_block(coalesce(public.event_join_url(e.id), e.place));
  END IF;
  v_desc := nullif(btrim(coalesce(e.description, '')), '');

  PERFORM public.enqueue_app_email(v_key, btrim(p_email), jsonb_build_object(
    'first_name', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_first, '')), ''), 'there')),
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Company visit')),
    'event_date', coalesce(to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'), 'To be confirmed'),
    'event_time', public.event_when_text(e.start_at, e.end_at),
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) AND v_join <> '' THEN 'Online, link below'
                        WHEN coalesce(e.online, false) THEN 'Online'
                        ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'closes_at', CASE WHEN e.interest_closes_at IS NULL THEN 'the closing date'
                      ELSE to_char(e.interest_closes_at AT TIME ZONE 'Europe/Rome', 'FMDay FMDD FMMonth YYYY')
                           || ', ' || public.event_when_text(e.interest_closes_at, NULL) END,
    'description_block', CASE WHEN v_desc IS NULL OR p_kind <> 'received' THEN ''
      ELSE '<tr><td style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">'
           || public.event_reminder_html(v_desc) || '</p></td></tr>' END,
    'join_block', v_join,
    'checkin_block', CASE WHEN v_ticket AND NOT coalesce(e.online, false) AND p_checkin IS NOT NULL
                          THEN public.event_checkin_block(p_checkin) ELSE '' END,
    'calendar_block', CASE WHEN v_ticket THEN public.event_calendar_block(e.id::text) ELSE '' END
  ));
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.company_visit_enqueue(text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_visit_enqueue(text, uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.company_visit_notice(p_interest_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  i       RECORD;
  v_token text;
BEGIN
  SELECT * INTO i FROM public.event_interest WHERE id = p_interest_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_kind IN ('invited', 'spot_opened') AND i.registration_id IS NOT NULL THEN
    SELECT checkin_token INTO v_token FROM public.event_registrations WHERE id = i.registration_id;
  END IF;
  PERFORM public.company_visit_enqueue(p_kind, i.event_id, i.email, split_part(btrim(i.name), ' ', 1), v_token);
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.company_visit_notice(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_visit_notice(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.company_visit_notice_tests(p_to text, p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_first text;
  k       text;
BEGIN
  IF nullif(btrim(coalesce(p_to, '')), '') IS NULL THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN RETURN 0; END IF;
  SELECT nullif(btrim(m.first_name), '') INTO v_first
    FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_to)) LIMIT 1;
  v_first := coalesce(v_first, initcap(split_part(split_part(btrim(p_to), '@', 1), '.', 1)), 'there');
  FOREACH k IN ARRAY ARRAY['received', 'invited', 'not_selected', 'spot_opened'] LOOP
    PERFORM public.company_visit_enqueue(k, p_event_id, btrim(p_to), v_first, 'sample');
  END LOOP;
  RETURN 4;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.company_visit_notice_tests(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_visit_notice_tests(text, uuid) TO service_role;

-- The CVs are deleted six months after the visit (Privacy Policy, section
-- 15). Every morning the database asks the company-visits function to do
-- it when there is any to delete; files can only be removed through
-- storage, not from SQL. The rest of the record stays with the event.
-- Also when a deleted visit left files behind (its folder in the bucket).
CREATE OR REPLACE FUNCTION public.company_visit_cv_cleanup_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_files boolean := false;
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1 FROM storage.objects o
          LEFT JOIN public.events e ON e.id::text = split_part(o.name, '/', 1)
         WHERE o.bucket_id = 'event-cvs'
           AND (e.id IS NULL OR e.date < (now() AT TIME ZONE 'Europe/Rome')::date - interval '6 months'))$q$
      INTO v_files;
  END IF;
  IF NOT v_files AND NOT EXISTS (
    SELECT 1 FROM public.event_interest i
      JOIN public.events e ON e.id = i.event_id
     WHERE i.cv_path IS NOT NULL
       AND coalesce(e.date, (e.start_at AT TIME ZONE 'Europe/Rome')::date) < (now() AT TIME ZONE 'Europe/Rome')::date - interval '6 months') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN RETURN; END IF;
  EXECUTE $q$SELECT net.http_post(url := $1, headers := $2, body := $3)$q$
    USING 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/company-visits',
          public.scheduled_job_headers('company_visit_cv_cleanup'),
          jsonb_build_object('action', 'cleanup');
END;
$$;
REVOKE ALL ON FUNCTION public.company_visit_cv_cleanup_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_visit_cv_cleanup_tick() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('company_visit_cv_cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'company_visit_cv_cleanup');
    PERFORM cron.schedule('company_visit_cv_cleanup', '40 4 * * *', $cron$SELECT public.company_visit_cv_cleanup_tick()$cron$);
  END IF;
END $$;

-- The public Events page and the registration page read website_events:
-- they need the closing date to show "Register your interest" for a visit
-- that selects (and when the form closes). Its definition is unchanged
-- (20261022120000_alumni_calls_into_events.sql) with the column added at
-- the end, which is all CREATE OR REPLACE VIEW allows.
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
  row_number() OVER (ORDER BY e.date DESC, e.start_at DESC NULLS LAST, e.id) AS listing_order,
  CASE WHEN e.event_type = 'company_visit' THEN e.interest_closes_at END AS interest_closes_at
FROM public.events e
WHERE NOT e.date_tbc
  AND (e.event_type <> 'alumni_call'
       OR e.show_on_website
       OR (e.registration_enabled AND e.registration_audience <> 'members'));
REVOKE ALL ON public.website_events FROM anon, authenticated;
GRANT SELECT ON public.website_events TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. The four company visit emails.
-- ---------------------------------------------------------------------
-- The four emails of a company visit, as transactional-emails.ts writes
-- them: interest received, the invitation, not this time, and a place has
-- opened up. The body is the responsive output of that file (the source
-- of the application's email HTML), stored because the database enqueue
-- function sends the stored copy. Safe to run twice.
INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('company_visit_interest_received', $t$Company visit: interest received$t$, $t$We have received your interest | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>We have received your interest | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>
<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Your interest in {{event_title}} has been received. The decision comes by email after the form closes.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Company visit</td></tr>
          <tr>
            <td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]--></td>
                  <td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">We have received your interest</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Thank you for registering your interest in <strong>{{event_title}}</strong>. Your request and your CV have arrived. Places are limited, so the President and the Vice President select the participants after the interest form closes, and everyone who asked to take part hears the decision by email at the same time.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Interest closes</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{closes_at}}</td></tr></table></td></tr>
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4FA;border-left:3px solid #1F0F4D;"><tr><td style="padding:14px 18px;"><p class="mims-xsmall" style="margin:0 0 6px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1F0F4D;">How participants are selected</p><p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#141414;">Participants are selected solely on their active participation in the Society&rsquo;s activities and their demonstrated interest in the topic of the visit, as the Society&rsquo;s own records show. <strong>Your CV does not count towards the selection.</strong></p></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Only the CVs of the members invited may be shared with the host company, and only if the host asks for them. All CVs are deleted automatically six months after the visit. You can replace your CV from the visit&rsquo;s page while the form is open.</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">There is nothing else to do for now.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Discover Minerva</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Board of Directors</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
              <p class="mims-xsmall" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p class="mims-xsmall" style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p class="mims-xsmall" style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p class="mims-xsmall" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$tpl$, true)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('company_visit_invited', $t$Company visit: invitation$t$, $t$You are invited to the company visit | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>You are invited to the company visit | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>
<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">You have a place at {{event_title}}. Your entry code is inside.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Company visit</td></tr>
          <tr>
            <td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]--></td>
                  <td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">You are invited</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">We are pleased to invite you to <strong>{{event_title}}</strong>. You have been selected among the members who asked to take part, and your place is confirmed. The details are set out below.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{join_block}}
          {{checkin_block}}
          {{calendar_block}}
          <tr><td class="mims-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4FA;border-left:3px solid #1F0F4D;"><tr><td style="padding:14px 18px;"><p class="mims-xsmall" style="margin:0 0 6px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1F0F4D;">A commitment to the other members</p><p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#141414;">Places are limited and other members asked to come. <strong>Forfeiting your place and not attending is a severe offence towards the other interested members.</strong> If you can no longer attend, write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a> as soon as possible, so that your place can go to a member on the reserve list.</p></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">If the host company asks for them, we will send it the CVs of the members invited, yours included, for this visit only. Please arrive a few minutes early so that we can welcome you and begin on time.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Discover Minerva</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Board of Directors</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
              <p class="mims-xsmall" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p class="mims-xsmall" style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p class="mims-xsmall" style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p class="mims-xsmall" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$tpl$, true)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('company_visit_not_selected', $t$Company visit: not selected this time$t$, $t$Your interest in the company visit | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Your interest in the company visit | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>
<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Not this time for {{event_title}}: you are on the reserve list.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Company visit</td></tr>
          <tr>
            <td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]--></td>
                  <td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Not this time</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Thank you for your interest in <strong>{{event_title}}</strong>. There were more requests than places, and this time you have not been selected.</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">You remain on the reserve list: if a place opens up before the visit, we will write to you at once.</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">The selection looks at participation in the Society&rsquo;s activities through the year and at interest in the topic of the visit. We hope to see you at our next events, and at the next company visit.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Discover Minerva</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Board of Directors</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
              <p class="mims-xsmall" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p class="mims-xsmall" style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p class="mims-xsmall" style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p class="mims-xsmall" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$tpl$, true)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('company_visit_spot_opened', $t$Company visit: a place has opened up$t$, $t$A place has opened up | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>A place has opened up | Minerva IMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
  <!--[if mso]><style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style><![endif]-->
<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>
<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">A place has opened up at {{event_title}}, and it is yours.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · Company visit</td></tr>
          <tr>
            <td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;"><img class="mims-logo-light" src="https://minervaims.org/email/minerva-logo-light.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /><!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;"><img src="https://minervaims.org/email/minerva-logo-dark.png" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" /></div><!--<![endif]--></td>
                  <td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">
                    <div class="mims-hero-title mims-brand" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment<br />Management Society</div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">A place has opened up</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Good news: a place has opened up at <strong>{{event_title}}</strong>, and it is yours. You were on the reserve list, and your place is now confirmed. The details are set out below.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{join_block}}
          {{checkin_block}}
          {{calendar_block}}
          <tr><td class="mims-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4FA;border-left:3px solid #1F0F4D;"><tr><td style="padding:14px 18px;"><p class="mims-xsmall" style="margin:0 0 6px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1F0F4D;">A commitment to the other members</p><p style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#141414;">Places are limited and other members asked to come. <strong>Forfeiting your place and not attending is a severe offence towards the other interested members.</strong> If you can no longer attend, write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a> as soon as possible, so that your place can go to a member on the reserve list.</p></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">If the host company asks for them, we will send it the CVs of the members invited, yours included, for this visit only. Please arrive a few minutes early so that we can welcome you and begin on time.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Discover Minerva</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Board of Directors</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
          <tr><td class="mims-pad" style="padding:30px 40px 0;"><div style="border-top:1px solid #E0E0E0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td class="mims-pad" style="padding:22px 40px 30px;">
              <p class="mims-small" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#737373;">Follow our work on <a href="https://it.linkedin.com/company/minerva-investment-management" style="color:#1F0F4D;text-decoration:none;">LinkedIn</a> and <a href="https://www.instagram.com/minerva.ims/" style="color:#1F0F4D;text-decoration:none;">Instagram</a>, and join us at our public events throughout the semester.</p>
              
              <p class="mims-xsmall" style="margin:0 0 14px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#737373;">This message was sent from an unmonitored address (noreply@minervaims.org). For any enquiry, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a>, stating the matter in the subject line.</p>
              <p class="mims-xsmall" style="margin:0 0 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="https://minervaims.org/terms-of-use" style="color:#737373;text-decoration:none;">Terms of Use</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/privacy-policy" style="color:#737373;text-decoration:none;">Privacy Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/cookie-policy" style="color:#737373;text-decoration:none;">Cookie Policy</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/disclaimer" style="color:#737373;text-decoration:none;">Disclaimer</a><span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span><a href="https://minervaims.org/statute" style="color:#737373;text-decoration:none;">Society Statute</a></p>
              <p class="mims-xsmall" style="margin:0 0 12px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#737373;text-align:justify;">Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.</p>
              <p class="mims-xsmall" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5px;color:#737373;">&copy; 2026 Minerva Investment Management Society. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$tpl$, true)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body;

-- ---------------------------------------------------------------------
-- 4. The reminders, as deployed (20260927145419 and 20261005100000), with two
-- changes for company visits that select their participants: no "register
-- now" reminders 14, 7 and 3 days before (members register their interest
-- instead, and after the closing date there is nothing to register for),
-- and no "Can't make it" link in the day-before reminder to the members
-- invited (they write to the organisers instead; see the invitation email).
CREATE OR REPLACE FUNCTION public.process_event_registration_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_now_rome timestamp := now() AT TIME ZONE 'Europe/Rome';
  v_today    date := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_morning  boolean := extract(hour FROM (now() AT TIME ZONE 'Europe/Rome')) < 12;
  due        RECORD;
  v_sent     integer;
BEGIN
  IF extract(hour FROM v_now_rome) < 9 OR extract(hour FROM v_now_rome) >= 21 THEN
    RETURN 0;
  END IF;

  SELECT ev.id, s.stage, s.days
    INTO due
    FROM public.events ev
    CROSS JOIN (VALUES ('2w', 14), ('1w', 7), ('3d', 3), ('24h_attending', 1), ('thank_you', -1)) AS s(stage, days)
   WHERE ev.aod_day_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.event_reminder_log l WHERE l.event_id = ev.id AND l.stage = s.stage)
     AND (
       (s.stage <> 'thank_you'
         AND ev.registration_enabled = true
         AND ev.reminders_paused = false
         -- A company visit that selects its participants (Step 93B) sends no
         -- "register now" reminders: members register their interest instead.
         AND NOT (s.stage IN ('2w', '1w', '3d') AND ev.event_type = 'company_visit' AND ev.interest_closes_at IS NOT NULL)
         AND (ev.start_at IS NULL OR ev.start_at > now())
         AND (
           (s.stage <> '24h_attending'
             AND public.event_reminder_day(ev.start_at, ev.date) - v_today BETWEEN s.days - 1 AND s.days)
           OR (s.stage = '24h_attending'
             AND public.event_reminder_day(ev.start_at, ev.date) - v_today = 1)
         ))
       OR (s.stage = 'thank_you'
         AND v_morning
         AND v_today - public.event_reminder_day(ev.start_at, ev.date) BETWEEN 1 AND 2
         AND EXISTS (SELECT 1 FROM public.event_registrations r WHERE r.event_id = ev.id AND r.attended = true))
     )
   ORDER BY public.event_reminder_day(ev.start_at, ev.date) - v_today - s.days, ev.start_at NULLS LAST, ev.id
   LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  INSERT INTO public.event_reminder_log (event_id, stage) VALUES (due.id, due.stage)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_sent := public.send_event_registration_reminder(due.id, due.stage);
  UPDATE public.event_reminder_log SET recipients = v_sent WHERE event_id = due.id AND stage = due.stage;
  RETURN v_sent;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.send_event_registration_reminder(
  p_event_id uuid, p_stage text, p_test_to text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  e       RECORD;
  rcpt    RECORD;
  v_key   text;
  v_vars  jsonb;
  v_when  text;
  v_count integer := 0;
  v_first text;
  v_pres  text;
  v_join  text := '';
BEGIN
  IF p_stage NOT IN ('2w','1w','3d','24h_attending','thank_you') THEN
    RAISE EXCEPTION 'Unknown reminder stage %', p_stage;
  END IF;
  v_key := CASE WHEN p_stage = 'thank_you' THEN 'ws_event_thank_you'
                ELSE 'ws_event_reminder_' || p_stage END;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF p_stage = '24h_attending' AND coalesce(e.online, false) THEN
    v_join := public.event_join_block(coalesce(public.event_join_url(e.id), e.place));
  END IF;

  v_when := public.event_when_text(e.start_at, e.end_at);

  v_vars := jsonb_build_object(
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Minerva IMS event')),
    'event_date', to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'),
    'event_time', v_when,
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) AND v_join <> '' THEN 'Online, link below'
                                                      WHEN coalesce(e.online, false) THEN 'Online'
                                                      ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'register_url', 'https://minervaims.org/events/' || e.id::text || '/register',
    'join_block', v_join,
    'description_block', CASE WHEN nullif(btrim(e.description), '') IS NULL THEN ''
      ELSE '<tr><td style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">'
           || public.event_reminder_html(btrim(e.description)) || '</p></td></tr>' END
  );

  IF p_stage = 'thank_you' THEN
    SELECT nullif(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.surname, '')), '')
      INTO v_pres
      FROM public.members m
     WHERE m.role::text = 'president'
       AND m.membership_status = 'active'
       AND lower(coalesce(btrim(m.email), '')) <> 'as.minerva@unibocconi.it'
     ORDER BY m.created_at DESC
     LIMIT 1;
    v_vars := v_vars || jsonb_build_object(
      'president_name', public.event_reminder_html(coalesce(v_pres, 'The Board of Directors')),
      'signature_title', CASE WHEN v_pres IS NULL THEN '' ELSE 'President, on behalf of the Board of Directors' END);
  END IF;

  IF p_test_to IS NOT NULL THEN
    IF nullif(btrim(p_test_to), '') IS NULL THEN RETURN 0; END IF;
    SELECT nullif(btrim(m.first_name), '') INTO v_first
      FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_test_to)) LIMIT 1;
    v_first := coalesce(v_first, initcap(split_part(split_part(btrim(p_test_to), '@', 1), '.', 1)), 'member');
    PERFORM public.enqueue_app_email(v_key, btrim(p_test_to),
      v_vars || jsonb_build_object('first_name', public.event_reminder_html(v_first),
        'checkin_block', CASE WHEN p_stage = '24h_attending' AND NOT coalesce(e.online, false)
                              THEN public.event_checkin_block('sample') ELSE '' END,
        'cancel_block', CASE WHEN p_stage = '24h_attending' AND e.aod_day_id IS NULL AND NOT (e.event_type = 'company_visit' AND e.interest_closes_at IS NOT NULL)
                             THEN public.event_cancel_block(e.id::text, 'sample', 'registration') ELSE '' END));
    RETURN 1;
  END IF;

  IF p_stage = 'thank_you' THEN
    FOR rcpt IN SELECT * FROM public.event_thank_you_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
      v_count := v_count + 1;
    END LOOP;
  ELSIF p_stage = '24h_attending' THEN
    FOR rcpt IN SELECT * FROM public.event_attendance_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name),
          'checkin_block', CASE WHEN coalesce(e.online, false) THEN ''
                                ELSE public.event_checkin_block(rcpt.checkin_token) END,
          'cancel_block', CASE WHEN e.aod_day_id IS NULL AND NOT (e.event_type = 'company_visit' AND e.interest_closes_at IS NOT NULL)
                               THEN public.event_cancel_block(e.id::text, rcpt.cancel_token, 'registration') ELSE '' END));
      v_count := v_count + 1;
    END LOOP;
  ELSE
    FOR rcpt IN SELECT * FROM public.event_reminder_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name), 'join_block', ''));
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 5. The key numbers, recomputed now that the €STR is there.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.refresh_key_numbers();
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'refresh_key_numbers is missing; the nightly job will compute the key numbers';
END $$;
`

Deno.serve(async (req) => {
  const key = Deno.env.get('TMP_MIGRATE_93B_TOKEN')!
  if (req.headers.get('authorization') !== `Bearer ${key}`) return new Response('no', { status: 401 })
  const notices: string[] = []
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, onnotice: (n) => notices.push(n.message) })
  try {
    await sql.unsafe(MIGRATION_SQL).simple()
    return new Response(JSON.stringify({ ok: true, notices }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
