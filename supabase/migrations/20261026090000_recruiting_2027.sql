-- =====================================================================
-- STEP 97. Recruiting 2027: the phone call, the one-association
-- declaration and the semester commitment.
-- ---------------------------------------------------------------------
-- A. THE PHONE CALL, after the division interview and before the offer:
--    three statuses, the call slots (with a capacity and the caller's
--    phone number) and their bookings, and the reminders, the booking row
--    being the once-only marker of the reminder before the call
--    (AGENTS.md).
-- B. THE DECLARATION: three switches on Recruiting > Application Page
--    (all off until the President or the Vice President turns them on),
--    and every signature kept with the text it signed. No PDF and no
--    countersignature: the signature in the Workspace is the record.
-- C. THE SEMESTER COMMITMENT: a campaign per semester, launched when the
--    application window opens, one request per active member, one
--    reminder each, with a stored marker.
-- D. RETENTION, as the Privacy Policy (section 15) says: signatures and
--    commitments are kept while the person is a member and twelve months
--    after, then deleted.
--
-- Safe to run twice. It deletes nothing that exists today and overwrites
-- no stored value: it adds statuses, columns, tables, functions and three
-- scheduled jobs (call reminders, the commitment, the retention).
-- The emails are added by 20261026090100_recruiting_2027_emails.sql.
-- =====================================================================

-- =====================================================================
-- A. THE PHONE CALL
-- =====================================================================

-- A1. Three statuses, between the post-interview triage and "Accepted".
--     A status only moves forward, so their place decides what can follow:
--     Accepted (a pass) and Rejected (a decline) are both still ahead.
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY[
  'received', 'cv_opened', 'under_review', 'on_hold_pre_interview', 'to_be_contacted',
  'interview_invitation_sent', 'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed',
  'on_hold_post_interview', 'plausible_offer', 'to_be_rejected',
  'call_invitation_sent', 'call_confirmed', 'call_on_hold',
  'accepted', 'rejected', 'offer_accepted', 'offer_declined', 'joined', 'withdrawn'
]::text[]));

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_invited_at timestamptz;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- The once-only marker of the reminder to book a call.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_reminder_sent_at timestamptz;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_outcome text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_outcome_at timestamptz;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_outcome_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- The first booking and one change, as for the interview.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS call_bookings_made integer NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_call_outcome_check') THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_call_outcome_check
      CHECK (call_outcome IS NULL OR call_outcome IN ('pass', 'hold', 'decline'));
  END IF;
END $$;

-- A2. The call slots. Not a division's calendar: the President and the
--     Vice President call candidates of every division. Each slot carries
--     the caller's phone number, which the candidate receives, and how
--     many candidates it can take (one, unless the caller says otherwise).
CREATE TABLE IF NOT EXISTS public.call_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date     date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  caller_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  caller_name   text,
  caller_phone  text NOT NULL,
  capacity      integer NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 10),
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (slot_date, start_time, caller_id)
);
CREATE INDEX IF NOT EXISTS call_slots_date_idx ON public.call_slots (slot_date);

DROP TRIGGER IF EXISTS update_call_slots_updated_at ON public.call_slots;
CREATE TRIGGER update_call_slots_updated_at BEFORE UPDATE ON public.call_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A booking. Its row is the once-only marker of the reminder before the
-- call: a cancelled booking disappears, so an old reminder cannot follow
-- a candidate to a new slot (AGENTS.md).
CREATE TABLE IF NOT EXISTS public.call_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id           uuid NOT NULL REFERENCES public.call_slots(id) ON DELETE CASCADE,
  application_id    uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate_name    text NOT NULL,
  candidate_email   text NOT NULL,
  candidate_phone   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at  timestamptz
);
CREATE INDEX IF NOT EXISTS call_bookings_slot_idx ON public.call_bookings (slot_id);

-- A slot takes as many bookings as its capacity, and no more, however
-- many candidates press Book at the same moment: the slot row is locked
-- while the count is read.
CREATE OR REPLACE FUNCTION public.call_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_taken    integer;
BEGIN
  SELECT capacity INTO v_capacity FROM public.call_slots WHERE id = NEW.slot_id AND is_active FOR UPDATE;
  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'call slot not available' USING ERRCODE = 'P0002';
  END IF;
  SELECT count(*) INTO v_taken FROM public.call_bookings WHERE slot_id = NEW.slot_id;
  IF v_taken >= v_capacity THEN
    RAISE EXCEPTION 'call slot full' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS call_booking_capacity ON public.call_bookings;
CREATE TRIGGER call_booking_capacity BEFORE INSERT ON public.call_bookings
  FOR EACH ROW EXECUTE FUNCTION public.call_booking_capacity();

-- Everything goes through the recruiting-calls function (service role).
-- A candidate may read their own booking and its slot, nothing else.
ALTER TABLE public.call_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate reads own call booking" ON public.call_bookings;
CREATE POLICY "candidate reads own call booking" ON public.call_bookings
  FOR SELECT TO authenticated USING (candidate_user_id = auth.uid());
DROP POLICY IF EXISTS "candidate reads own call slot" ON public.call_slots;
CREATE POLICY "candidate reads own call slot" ON public.call_slots
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.call_bookings b WHERE b.slot_id = call_slots.id AND b.candidate_user_id = auth.uid()));
REVOKE ALL ON public.call_slots, public.call_bookings FROM anon;

-- A3. Calls keep the exam breaks and the public holidays, as interviews
--     do. The guard is re-created as it is, with one more table.
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
  ELSIF TG_TABLE_NAME = 'call_slots' THEN
    -- Step 97: the phone calls.
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
DROP TRIGGER IF EXISTS block_exam_break_trg ON public.call_slots;
CREATE TRIGGER block_exam_break_trg BEFORE INSERT OR UPDATE OF slot_date ON public.call_slots
  FOR EACH ROW EXECUTE FUNCTION public.block_exam_break();

-- A4. The reminders, every five minutes.
--   * To book: 24 hours after the invitation, once, while the candidate
--     has not booked. The marker is on the application.
--   * Before the call: between 30 and 25 minutes before it starts, once.
--     The marker is the booking row itself.
CREATE OR REPLACE FUNCTION public.process_call_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  sent integer := 0;
BEGIN
  FOR r IN
    UPDATE public.applications
       SET call_reminder_sent_at = now()
     WHERE status = 'call_invitation_sent'
       AND call_invited_at IS NOT NULL
       AND call_reminder_sent_at IS NULL
       AND now() >= call_invited_at + interval '24 hours'
       AND now() <  call_invited_at + interval '3 days'
       AND NOT EXISTS (SELECT 1 FROM public.call_bookings b WHERE b.application_id = applications.id)
    RETURNING id, first_name, email, call_invited_at
  LOOP
    PERFORM public.enqueue_app_email('call_booking_reminder', r.email, jsonb_build_object(
      'first_name', replace(replace(replace(coalesce(r.first_name, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'book_by', public.rome_stamp12(r.call_invited_at + interval '3 days')
    ));
    sent := sent + 1;
  END LOOP;

  FOR r IN
    SELECT b.id, b.candidate_email, b.candidate_phone, a.first_name,
           s.slot_date, s.start_time, s.end_time, s.caller_name, s.caller_phone
      FROM public.call_bookings b
      JOIN public.call_slots s ON s.id = b.slot_id
      JOIN public.applications a ON a.id = b.application_id
     WHERE b.reminder_sent_at IS NULL
       AND a.status = 'call_confirmed'
       AND s.is_active
       AND (s.slot_date + s.start_time) AT TIME ZONE 'Europe/Rome' > now() + interval '25 minutes'
       AND (s.slot_date + s.start_time) AT TIME ZONE 'Europe/Rome' <= now() + interval '30 minutes'
     ORDER BY s.slot_date, s.start_time
     LIMIT 100
     FOR UPDATE OF b SKIP LOCKED
  LOOP
    UPDATE public.call_bookings SET reminder_sent_at = now() WHERE id = r.id;
    PERFORM public.enqueue_app_email('call_reminder_30m', r.candidate_email, jsonb_build_object(
      'first_name', replace(replace(replace(coalesce(r.first_name, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'call_date', to_char(r.slot_date, 'FMDay FMDD FMMonth YYYY'),
      'call_time', public.clock12(r.start_time) || ' to ' || public.clock12(r.end_time) || ' ' || public.event_zone((r.slot_date + r.start_time) AT TIME ZONE 'Europe/Rome'),
      'caller_name', replace(replace(replace(coalesce(r.caller_name, 'A member of the Board'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'caller_phone', replace(replace(replace(coalesce(r.caller_phone, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'candidate_phone', replace(replace(replace(coalesce(r.candidate_phone, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
    ));
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_call_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_call_reminders() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('call_reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'call_reminders');
    PERFORM cron.schedule('call_reminders', '*/5 * * * *', $cron$SELECT public.process_call_reminders()$cron$);
  END IF;
END $$;

-- A5. A call still to come is released when the candidacy moves on
--     without it: a withdrawal, a move to another division, or a decision
--     taken in Candidates Screening. One rule here, whichever path moved
--     the status, so the slot goes back to the other candidates and the
--     caller no longer sees a call nobody will answer. A call whose
--     outcome is recorded, or whose time has passed, stays as the record
--     of the call held. The candidate's moving their own call deletes the
--     booking first, so it never reaches this.
CREATE OR REPLACE FUNCTION public.release_call_booking_on_exit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    DELETE FROM public.call_bookings b
     USING public.call_slots s
     WHERE b.application_id = NEW.id
       AND s.id = b.slot_id
       AND (s.slot_date + s.start_time) AT TIME ZONE 'Europe/Rome' > now()
    RETURNING s.slot_date, s.start_time
  LOOP
    INSERT INTO public.application_notes (application_id, author_id, author_name, body, kind)
    VALUES (NEW.id, NULL, 'Minerva Workspace',
            'Phone call of ' || to_char(r.slot_date, 'FMDay FMDD FMMonth YYYY') || ' at ' || public.clock12(r.start_time)
              || ' released: the candidacy moved on before the call.', 'system');
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.release_call_booking_on_exit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS release_call_booking_on_exit ON public.applications;
CREATE TRIGGER release_call_booking_on_exit
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (OLD.status = 'call_confirmed' AND NEW.status IS DISTINCT FROM 'call_confirmed' AND NEW.call_outcome IS NULL)
  EXECUTE FUNCTION public.release_call_booking_on_exit();

-- =====================================================================
-- B. THE ONE-ASSOCIATION DECLARATION
-- =====================================================================

-- B1. Three switches, kept with the application settings (Recruiting >
--     Application Page), all OFF until the President or the Vice
--     President turns them on. While the first two are off nobody is asked
--     to sign, and accepting an offer works exactly as before.
--       declaration_at_offer       a candidate signs it to accept an offer
--       declaration_at_commitment  members sign it with the semester commitment
--       declaration_on_join        the Join page explains it
--     The Join page already reads this table without signing in, and these
--     are booleans only.
ALTER TABLE public.application_settings ADD COLUMN IF NOT EXISTS declaration_at_offer boolean NOT NULL DEFAULT false;
ALTER TABLE public.application_settings ADD COLUMN IF NOT EXISTS declaration_at_commitment boolean NOT NULL DEFAULT false;
ALTER TABLE public.application_settings ADD COLUMN IF NOT EXISTS declaration_on_join boolean NOT NULL DEFAULT false;
-- Whether the declaration was asked when this candidate joined, so Offers
-- can tell a missing declaration from one that was never asked.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS declaration_asked boolean NOT NULL DEFAULT false;

-- B2. Every signature: who, what text (its version and its SHA-256), the
--     typed name, the box ticked and when. The signature in the Workspace
--     is the whole record: nothing is printed and nobody countersigns. A
--     declaration is signed once per person and semester.
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                text NOT NULL CHECK (kind IN ('one_association', 'commitment')),
  context             text NOT NULL CHECK (context IN ('offer', 'semester')),
  semester_label      text NOT NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_id           uuid REFERENCES public.members(id) ON DELETE SET NULL,
  application_id      uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  person_name         text NOT NULL,
  person_email        text NOT NULL,
  division            text,
  decision            text NOT NULL DEFAULT 'signed' CHECK (decision IN ('signed', 'confirmed', 'declined')),
  text_version        text NOT NULL,
  text_sha256         text NOT NULL,
  typed_name          text NOT NULL,
  agreed              boolean NOT NULL CHECK (agreed),
  signed_at           timestamptz NOT NULL DEFAULT now(),
  -- When the signer stopped being a member: the clock of the retention (D).
  membership_ended_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signed_documents ADD COLUMN IF NOT EXISTS membership_ended_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS signed_documents_once
  ON public.signed_documents (kind, user_id, semester_label) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS signed_documents_semester_idx ON public.signed_documents (semester_label, kind);
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signers read their own documents" ON public.signed_documents;
CREATE POLICY "signers read their own documents" ON public.signed_documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.signed_documents FROM anon;

-- =====================================================================
-- C. THE SEMESTER COMMITMENT
-- =====================================================================

-- C1. When the commitment starts and when its one reminder goes, set in
--     Settings > Declarations.
CREATE TABLE IF NOT EXISTS public.commitment_settings (
  id                         boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- The first semester whose application window launches the commitment
  -- campaign by itself; earlier windows never do.
  commitment_first_semester  text NOT NULL DEFAULT 'Spring 2027',
  -- Days after the launch at which the one reminder goes.
  commitment_reminder_days   integer NOT NULL DEFAULT 5 CHECK (commitment_reminder_days BETWEEN 1 AND 30),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  updated_by                 uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.commitment_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.commitment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signed-in users read commitment settings" ON public.commitment_settings;
CREATE POLICY "signed-in users read commitment settings" ON public.commitment_settings
  FOR SELECT TO authenticated USING (true);

-- C2. The campaigns and the requests.
CREATE TABLE IF NOT EXISTS public.commitment_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_label  text NOT NULL UNIQUE,
  launched_at     timestamptz NOT NULL DEFAULT now(),
  launched_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  launch_kind     text NOT NULL DEFAULT 'auto' CHECK (launch_kind IN ('auto', 'manual')),
  -- Copied from the settings at launch, so a later change cannot send a
  -- second reminder or move the first.
  reminder_after  interval NOT NULL DEFAULT interval '5 days',
  closed_at       timestamptz
);

CREATE TABLE IF NOT EXISTS public.commitment_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES public.commitment_campaigns(id) ON DELETE CASCADE,
  member_id         uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email             text NOT NULL,
  first_name        text,
  division          text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  responded_at      timestamptz,
  -- The once-only markers: the request, and the one reminder.
  request_sent_at   timestamptz,
  reminder_sent_at  timestamptz,
  -- When the member stopped being a member: the clock of the retention (D).
  membership_ended_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, member_id)
);
ALTER TABLE public.commitment_requests ADD COLUMN IF NOT EXISTS membership_ended_at timestamptz;
CREATE INDEX IF NOT EXISTS commitment_requests_user_idx ON public.commitment_requests (user_id);

ALTER TABLE public.commitment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read their own commitment" ON public.commitment_requests;
CREATE POLICY "members read their own commitment" ON public.commitment_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "signed-in users read campaigns" ON public.commitment_campaigns;
CREATE POLICY "signed-in users read campaigns" ON public.commitment_campaigns
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.commitment_campaigns, public.commitment_requests FROM anon;

-- "Spring 2027" -> "2027-spring", the key every semester function reads.
CREATE OR REPLACE FUNCTION public.semester_key_of_label(p_label text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN p_label ~* '^\s*(spring|fall)\s+\d{4}\s*$'
    THEN split_part(btrim(p_label), ' ', 2) || '-' || lower(split_part(btrim(p_label), ' ', 1))
    ELSE NULL END
$$;

-- Who is asked: every active member with an address, except Advisors
-- and the Society's own admin account (which is not a person).
CREATE OR REPLACE FUNCTION public.commitment_launch(p_label text, p_kind text, p_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_days integer;
BEGIN
  IF public.semester_key_of_label(p_label) IS NULL THEN
    RAISE EXCEPTION 'Not a semester: %', p_label USING ERRCODE = '22023';
  END IF;
  SELECT commitment_reminder_days INTO v_days FROM public.commitment_settings WHERE id;
  INSERT INTO public.commitment_campaigns (semester_label, launched_by, launch_kind, reminder_after)
  VALUES (btrim(p_label), p_by, CASE WHEN p_kind = 'manual' THEN 'manual' ELSE 'auto' END, make_interval(days => coalesce(v_days, 5)))
  ON CONFLICT (semester_label) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.commitment_campaigns WHERE semester_label = btrim(p_label);
    RETURN v_id;
  END IF;
  INSERT INTO public.commitment_requests (campaign_id, member_id, user_id, email, first_name, division)
  SELECT v_id, m.id, m.user_id, lower(btrim(m.email)), m.first_name, m.division::text
    FROM public.members m
   WHERE m.membership_status = 'active'
     AND m.role::text <> 'advisor'
     AND m.email IS NOT NULL AND btrim(m.email) <> ''
     AND lower(btrim(m.email)) <> 'as.minerva@unibocconi.it'
  ON CONFLICT (campaign_id, member_id) DO NOTHING;
  RETURN v_id;
END;
$$;

-- The emails of the open campaigns: each request once, then the one
-- reminder to those still pending, each marked as it goes.
CREATE OR REPLACE FUNCTION public.commitment_send()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  sent integer := 0;
  v_url constant text := 'https://minervaims.org/workspace/my-profile?commitment=1';
  -- While members sign the declaration with the commitment (Recruiting >
  -- Application Page), the emails say so.
  v_clause text := CASE WHEN (SELECT bool_or(declaration_at_commitment) FROM public.application_settings)
                        THEN ', and sign the one-association declaration' ELSE '' END;
BEGIN
  FOR r IN
    UPDATE public.commitment_requests q
       SET request_sent_at = now()
      FROM public.commitment_campaigns c
     WHERE c.id = q.campaign_id AND c.closed_at IS NULL
       AND q.request_sent_at IS NULL AND q.status = 'pending'
       AND q.id IN (SELECT q2.id FROM public.commitment_requests q2
                      JOIN public.commitment_campaigns c2 ON c2.id = q2.campaign_id
                     WHERE c2.closed_at IS NULL AND q2.request_sent_at IS NULL AND q2.status = 'pending'
                     LIMIT 300)
    RETURNING q.email, q.first_name, c.semester_label
  LOOP
    PERFORM public.enqueue_app_email('commitment_request', r.email, jsonb_build_object(
      'first_name', replace(replace(replace(coalesce(r.first_name, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'semester_label', r.semester_label,
      'declaration_clause', v_clause,
      'confirm_url', v_url));
    sent := sent + 1;
  END LOOP;

  FOR r IN
    UPDATE public.commitment_requests q
       SET reminder_sent_at = now()
      FROM public.commitment_campaigns c
     WHERE c.id = q.campaign_id AND c.closed_at IS NULL
       AND q.status = 'pending'
       AND q.request_sent_at IS NOT NULL
       AND q.reminder_sent_at IS NULL
       AND now() >= c.launched_at + c.reminder_after
    RETURNING q.email, q.first_name, c.semester_label
  LOOP
    PERFORM public.enqueue_app_email('commitment_reminder', r.email, jsonb_build_object(
      'first_name', replace(replace(replace(coalesce(r.first_name, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'semester_label', r.semester_label,
      'declaration_clause', v_clause,
      'confirm_url', v_url));
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;

-- Every hour: launch the campaign of a semester whose application window
-- has opened (from the first semester in the settings on), then send.
CREATE OR REPLACE FUNCTION public.commitment_tick()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_first text;
BEGIN
  SELECT commitment_first_semester INTO v_first FROM public.commitment_settings WHERE id;
  FOR s IN
    SELECT btrim(semester_label) AS label FROM public.application_settings
     WHERE start_date IS NOT NULL AND end_date IS NOT NULL
       AND now() >= start_date AND now() <= end_date
  LOOP
    IF public.semester_key_of_label(s.label) IS NOT NULL
       AND public.semester_key_of_label(v_first) IS NOT NULL
       AND public.semester_ordinal(public.semester_key_of_label(s.label)) >= public.semester_ordinal(public.semester_key_of_label(v_first))
       AND NOT EXISTS (SELECT 1 FROM public.commitment_campaigns WHERE semester_label = s.label) THEN
      PERFORM public.commitment_launch(s.label, 'auto', NULL);
    END IF;
  END LOOP;
  RETURN public.commitment_send();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.commitment_launch(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.commitment_send() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.commitment_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commitment_launch(text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.commitment_send() TO service_role;
GRANT EXECUTE ON FUNCTION public.commitment_tick() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('commitment_tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'commitment_tick');
    PERFORM cron.schedule('commitment_tick', '25 * * * *', $cron$SELECT public.commitment_tick()$cron$);
  END IF;
END $$;

-- =====================================================================
-- D. RETENTION (Privacy Policy, section 15)
-- ---------------------------------------------------------------------
-- Signed declarations and semester commitments are kept for the duration
-- of membership and twelve months after it ends, then deleted. A
-- declaration signed by a candidate who never joined goes with their
-- application file. The phone call's booking and notes already go with
-- the application file (ON DELETE CASCADE).
--
-- Membership ends when the status becomes Alumni or Expelled, or when
-- the member record is deleted; a semester on exchange or on a pause is
-- still membership. The moment is stamped on the person's signatures and
-- requests, and cleared if they become a member again.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.mark_membership_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- The requests go with the member record (ON DELETE CASCADE); the
    -- signatures stay, so they keep their twelve months.
    UPDATE public.signed_documents SET membership_ended_at = coalesce(membership_ended_at, now())
     WHERE member_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.membership_status IN ('alumni', 'expelled') AND OLD.membership_status NOT IN ('alumni', 'expelled') THEN
    UPDATE public.signed_documents SET membership_ended_at = now() WHERE member_id = NEW.id AND membership_ended_at IS NULL;
    UPDATE public.commitment_requests SET membership_ended_at = now() WHERE member_id = NEW.id AND membership_ended_at IS NULL;
  ELSIF NEW.membership_status NOT IN ('alumni', 'expelled') AND OLD.membership_status IN ('alumni', 'expelled') THEN
    UPDATE public.signed_documents SET membership_ended_at = NULL WHERE member_id = NEW.id;
    UPDATE public.commitment_requests SET membership_ended_at = NULL WHERE member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_membership_end() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mark_membership_end_status ON public.members;
CREATE TRIGGER mark_membership_end_status
  AFTER UPDATE OF membership_status ON public.members
  FOR EACH ROW WHEN (OLD.membership_status IS DISTINCT FROM NEW.membership_status)
  EXECUTE FUNCTION public.mark_membership_end();
DROP TRIGGER IF EXISTS mark_membership_end_delete ON public.members;
CREATE TRIGGER mark_membership_end_delete
  BEFORE DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.mark_membership_end();

-- A declaration signed by somebody who never became a member leaves with
-- their application file.
CREATE OR REPLACE FUNCTION public.delete_unjoined_signatures()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.signed_documents WHERE application_id = OLD.id AND member_id IS NULL;
  RETURN OLD;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_unjoined_signatures() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS delete_unjoined_signatures ON public.applications;
CREATE TRIGGER delete_unjoined_signatures
  BEFORE DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.delete_unjoined_signatures();

-- Every night: what has passed its twelve months goes.
CREATE OR REPLACE FUNCTION public.declaration_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n1 integer;
  n2 integer;
BEGIN
  DELETE FROM public.signed_documents WHERE membership_ended_at < now() - interval '12 months';
  GET DIAGNOSTICS n1 = ROW_COUNT;
  DELETE FROM public.commitment_requests WHERE membership_ended_at < now() - interval '12 months';
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.declaration_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.declaration_retention() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('declaration_retention') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'declaration_retention');
    PERFORM cron.schedule('declaration_retention', '40 3 * * *', $cron$SELECT public.declaration_retention()$cron$);
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Step 97: phone call statuses and slots, declaration switches (off), commitment campaign and retention ready.'; END $$;
