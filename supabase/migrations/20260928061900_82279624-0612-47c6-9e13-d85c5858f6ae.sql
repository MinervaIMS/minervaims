ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS capacity integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_capacity_positive') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
  END IF;
END $$;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS cancel_token text DEFAULT replace(gen_random_uuid()::text, '-', '');
UPDATE public.event_registrations
   SET cancel_token = replace(gen_random_uuid()::text, '-', '')
 WHERE cancel_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_cancel_token
  ON public.event_registrations (cancel_token);

CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  email         text NOT NULL,
  is_member     boolean NOT NULL DEFAULT false,
  is_external   boolean NOT NULL DEFAULT true,
  is_bocconi    boolean,
  programme     text,
  academic_year text,
  affiliation   text,
  token         text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_waitlist_person ON public.event_waitlist (event_id, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS event_waitlist_token ON public.event_waitlist (token);
CREATE INDEX IF NOT EXISTS event_waitlist_queue ON public.event_waitlist (event_id, created_at, id);

GRANT SELECT ON public.event_waitlist TO authenticated;
GRANT ALL ON public.event_waitlist TO service_role;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own waitlist places" ON public.event_waitlist;
CREATE POLICY "own waitlist places"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.event_registrations_capacity_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_cap   integer;
  v_taken integer;
BEGIN
  IF coalesce(NEW.attended, false) THEN RETURN NEW; END IF;
  SELECT capacity INTO v_cap FROM public.events WHERE id = NEW.event_id;
  IF v_cap IS NULL THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  SELECT count(*) INTO v_taken FROM public.event_registrations WHERE event_id = NEW.event_id;
  IF v_taken >= v_cap THEN
    RAISE EXCEPTION 'EVENT_FULL' USING HINT = 'The event has no places left.';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS event_registrations_capacity ON public.event_registrations;
CREATE TRIGGER event_registrations_capacity
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_registrations_capacity_guard();

CREATE OR REPLACE FUNCTION public.event_calendar_block(p_event text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE WHEN p_event IS NULL OR p_event !~ '^([0-9a-f-]{36}|sample)$' THEN ''
  ELSE '<tr><td class="mims-pad" style="padding:0 40px 24px;">'
    || '<p class="mims-xsmall" style="margin:0 0 6px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;">Add to your calendar</p>'
    || '<p class="mims-body" style="margin:0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.9;color:#141414;">'
    || '<a href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=' || p_event || '" style="color:#1F0F4D;text-decoration:underline;">Apple Calendar</a>'
    || '<span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span>'
    || '<a href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=' || p_event || '&amp;to=google" style="color:#1F0F4D;text-decoration:underline;">Google Calendar</a>'
    || '<span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span>'
    || '<a href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=' || p_event || '&amp;to=outlook" style="color:#1F0F4D;text-decoration:underline;">Outlook</a>'
    || '<span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span>'
    || '<a href="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/event-ics?e=' || p_event || '" style="color:#1F0F4D;text-decoration:underline;">Other apps (.ics)</a>'
    || '</p></td></tr>'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_cancel_block(p_event text, p_token text, p_kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE
    WHEN p_event IS NULL OR p_event !~ '^([0-9a-f-]{36}|sample)$'
      OR p_token IS NULL OR p_token !~ '^([a-f0-9]{32}|sample)$' THEN ''
    ELSE '<tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-small" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#737373;">'
      || CASE WHEN p_kind = 'waitlist'
           THEN 'No longer able to come? <a href="https://minervaims.org/events/' || p_event || '/cancel?t=' || p_token || '" style="color:#1F0F4D;text-decoration:underline;">Leave the waiting list</a>.'
           ELSE 'Can&rsquo;t make it? <a href="https://minervaims.org/events/' || p_event || '/cancel?t=' || p_token || '" style="color:#1F0F4D;text-decoration:underline;">Cancel your registration</a>, so that somebody else can take your place.'
         END
      || '</p></td></tr>'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_when_text(p_start timestamptz, p_end timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT CASE
    WHEN p_start IS NULL THEN 'To be confirmed'
    WHEN p_end IS NULL OR p_end <= p_start THEN public.event_clock(p_start)
    WHEN public.event_zone(p_start) = public.event_zone(p_end)
      THEN public.event_clock(p_start, false) || ' to ' || public.event_clock(p_end)
    ELSE public.event_clock(p_start) || ' to ' || public.event_clock(p_end)
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_notice_enqueue(
  p_kind text, p_ev jsonb, p_to text, p_first text,
  p_checkin text DEFAULT NULL, p_cancel text DEFAULT NULL, p_position integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_key    text;
  v_id     text := p_ev->>'id';
  v_start  timestamptz := nullif(p_ev->>'start_at', '')::timestamptz;
  v_end    timestamptz := nullif(p_ev->>'end_at', '')::timestamptz;
  v_date   date := nullif(p_ev->>'date', '')::date;
  v_online boolean := coalesce((p_ev->>'online')::boolean, false);
  v_desc   text := nullif(btrim(coalesce(p_ev->>'description', '')), '');
  v_ticket boolean := p_kind IN ('confirmation', 'waitlist_promoted');
BEGIN
  v_key := CASE p_kind
    WHEN 'confirmation' THEN 'event_registration_confirmation'
    WHEN 'waitlist_joined' THEN 'event_waitlist_joined'
    WHEN 'waitlist_promoted' THEN 'event_waitlist_promoted'
    WHEN 'cancelled' THEN 'event_registration_cancelled'
  END;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Unknown event email %', p_kind; END IF;
  IF nullif(btrim(coalesce(p_to, '')), '') IS NULL THEN RETURN; END IF;

  PERFORM public.enqueue_app_email(v_key, btrim(p_to), jsonb_build_object(
    'first_name', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_first, '')), ''), 'there')),
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(coalesce(p_ev->>'title', '')), ''), 'Minerva IMS event')),
    'event_date', coalesce(to_char(public.event_reminder_day(v_start, v_date), 'FMDay FMDD FMMonth YYYY'), 'To be confirmed'),
    'event_time', public.event_when_text(v_start, v_end),
    'event_location', public.event_reminder_html(CASE WHEN v_online THEN 'Online'
                        ELSE coalesce(nullif(btrim(coalesce(p_ev->>'place', '')), ''), 'To be confirmed') END),
    'description_block', CASE WHEN v_desc IS NULL THEN ''
      ELSE '<tr><td style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">'
           || public.event_reminder_html(v_desc) || '</p></td></tr>' END,
    'register_url', CASE WHEN v_id = 'sample' THEN 'https://minervaims.org/events'
                         ELSE 'https://minervaims.org/events/' || v_id || '/register' END,
    'checkin_block', CASE WHEN v_ticket AND NOT v_online THEN public.event_checkin_block(p_checkin) ELSE '' END,
    'calendar_block', CASE WHEN v_ticket THEN public.event_calendar_block(v_id) ELSE '' END,
    'cancel_block', CASE WHEN v_ticket THEN public.event_cancel_block(v_id, p_cancel, 'registration')
                         WHEN p_kind = 'waitlist_joined' THEN public.event_cancel_block(v_id, p_cancel, 'waitlist')
                         ELSE '' END,
    'waitlist_position', coalesce(p_position::text, '1')
  ));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_as_json(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT jsonb_build_object('id', e.id::text, 'title', e.title, 'start_at', e.start_at, 'end_at', e.end_at,
                            'date', e.date, 'place', e.place, 'online', e.online, 'description', e.description)
    FROM public.events e WHERE e.id = p_event_id;
$fn$;

CREATE OR REPLACE FUNCTION public.send_event_notice(p_kind text, p_event_id uuid, p_email text, p_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ev  jsonb := public.event_as_json(p_event_id);
  r     RECORD;
  v_pos integer;
BEGIN
  IF v_ev IS NULL OR nullif(btrim(coalesce(p_email, '')), '') IS NULL THEN RETURN; END IF;
  IF p_kind IN ('confirmation', 'waitlist_promoted') THEN
    SELECT name, email, checkin_token, cancel_token INTO r
      FROM public.event_registrations
     WHERE event_id = p_event_id AND lower(btrim(coalesce(email, ''))) = lower(btrim(p_email))
     LIMIT 1;
    IF NOT FOUND THEN RETURN; END IF;
    PERFORM public.event_notice_enqueue(p_kind, v_ev, r.email, split_part(btrim(coalesce(r.name, '')), ' ', 1), r.checkin_token, r.cancel_token);
  ELSIF p_kind = 'waitlist_joined' THEN
    SELECT w.name, w.email, w.token, w.created_at, w.id INTO r
      FROM public.event_waitlist w
     WHERE w.event_id = p_event_id AND lower(w.email) = lower(btrim(p_email));
    IF NOT FOUND THEN RETURN; END IF;
    SELECT count(*) INTO v_pos FROM public.event_waitlist w
     WHERE w.event_id = p_event_id AND (w.created_at, w.id) <= (r.created_at, r.id);
    PERFORM public.event_notice_enqueue(p_kind, v_ev, r.email, split_part(btrim(r.name), ' ', 1), NULL, r.token, v_pos);
  ELSIF p_kind = 'cancelled' THEN
    PERFORM public.event_notice_enqueue(p_kind, v_ev, btrim(p_email), split_part(btrim(coalesce(p_name, '')), ' ', 1));
  ELSE
    RAISE EXCEPTION 'Unknown event email %', p_kind;
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.send_event_notice_tests(p_to text, p_event_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ev    jsonb;
  v_first text;
  v_start timestamptz := (date_trunc('day', now() AT TIME ZONE 'Europe/Rome') + interval '7 days 18 hours 30 minutes') AT TIME ZONE 'Europe/Rome';
  k       text;
BEGIN
  IF nullif(btrim(coalesce(p_to, '')), '') IS NULL THEN RETURN 0; END IF;
  v_ev := CASE WHEN p_event_id IS NULL THEN NULL ELSE public.event_as_json(p_event_id) END;
  IF v_ev IS NULL THEN
    v_ev := jsonb_build_object('id', 'sample', 'title', 'Sample event', 'start_at', v_start,
      'end_at', v_start + interval '90 minutes', 'date', (v_start AT TIME ZONE 'Europe/Rome')::date,
      'place', 'Bocconi University, Milan', 'online', false,
      'description', 'This is a sample event from a test email.');
  END IF;
  SELECT nullif(btrim(m.first_name), '') INTO v_first
    FROM public.members m WHERE lower(btrim(m.email)) = lower(btrim(p_to)) LIMIT 1;
  v_first := coalesce(v_first, initcap(split_part(split_part(btrim(p_to), '@', 1), '.', 1)), 'there');
  FOREACH k IN ARRAY ARRAY['confirmation', 'waitlist_joined', 'waitlist_promoted', 'cancelled'] LOOP
    PERFORM public.event_notice_enqueue(k, v_ev, btrim(p_to), v_first, 'sample', 'sample', 3);
  END LOOP;
  RETURN 4;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.promote_event_waitlist(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  e       RECORD;
  w       RECORD;
  v_taken integer;
  v_n     integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_waitlist WHERE event_id = p_event_id) THEN RETURN 0; END IF;
  SELECT id, capacity, start_at, date INTO e FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF e.start_at IS NOT NULL AND e.start_at <= now() THEN RETURN 0; END IF;
  IF e.start_at IS NULL AND e.date IS NOT NULL AND e.date < (now() AT TIME ZONE 'Europe/Rome')::date THEN RETURN 0; END IF;
  LOOP
    IF e.capacity IS NOT NULL THEN
      SELECT count(*) INTO v_taken FROM public.event_registrations WHERE event_id = p_event_id;
      EXIT WHEN v_taken >= e.capacity;
    END IF;
    SELECT * INTO w FROM public.event_waitlist
     WHERE event_id = p_event_id ORDER BY created_at, id LIMIT 1 FOR UPDATE;
    EXIT WHEN NOT FOUND;
    DELETE FROM public.event_waitlist WHERE id = w.id;
    IF NOT EXISTS (SELECT 1 FROM public.event_registrations
                    WHERE event_id = p_event_id AND lower(coalesce(email, '')) = lower(w.email)) THEN
      INSERT INTO public.event_registrations
        (event_id, user_id, name, email, is_member, is_external, is_bocconi, programme, academic_year, affiliation)
      VALUES (p_event_id, w.user_id, w.name, w.email, w.is_member, w.is_external, w.is_bocconi, w.programme, w.academic_year, w.affiliation);
      PERFORM public.send_event_notice('waitlist_promoted', p_event_id, w.email);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_registrations_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.promote_event_waitlist(OLD.event_id);
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS event_registrations_promote ON public.event_registrations;
CREATE TRIGGER event_registrations_promote
  AFTER DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_registrations_after_delete();

CREATE OR REPLACE FUNCTION public.events_after_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.promote_event_waitlist(NEW.id);
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS events_capacity_promote ON public.events;
CREATE TRIGGER events_capacity_promote
  AFTER UPDATE OF capacity ON public.events
  FOR EACH ROW WHEN (NEW.capacity IS DISTINCT FROM OLD.capacity)
  EXECUTE FUNCTION public.events_after_capacity_change();

CREATE OR REPLACE FUNCTION public.event_places(p_event_id uuid)
RETURNS TABLE (capacity integer, taken integer, waiting integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT e.capacity,
         (SELECT count(*)::int FROM public.event_registrations r WHERE r.event_id = e.id),
         (SELECT count(*)::int FROM public.event_waitlist w WHERE w.event_id = e.id)
    FROM public.events e
   WHERE e.id = p_event_id AND e.registration_enabled AND e.capacity IS NOT NULL;
$fn$;

REVOKE EXECUTE ON FUNCTION public.event_notice_enqueue(text, jsonb, text, text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.event_as_json(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_event_notice(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_event_notice_tests(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_event_waitlist(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_notice_enqueue(text, jsonb, text, text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_as_json(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_event_notice(text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_event_notice_tests(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_event_waitlist(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_places(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.event_attendance_recipients(uuid);
CREATE FUNCTION public.event_attendance_recipients(p_event_id uuid)
RETURNS TABLE (email text, first_name text, checkin_token text, cancel_token text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT DISTINCT ON (lower(btrim(addr)))
         btrim(addr) AS email,
         coalesce(nullif(btrim(fname), ''), 'member') AS first_name,
         token AS checkin_token,
         ctoken AS cancel_token
    FROM (
      SELECT coalesce(nullif(btrim(r.email), ''), nullif(btrim(m.email), '')) AS addr,
             coalesce(nullif(split_part(btrim(r.name), ' ', 1), ''), m.first_name) AS fname,
             r.checkin_token AS token,
             r.cancel_token AS ctoken,
             r.registered_at
        FROM public.event_registrations r
        LEFT JOIN public.members m ON m.user_id = r.user_id
       WHERE r.event_id = p_event_id
    ) s
   WHERE addr IS NOT NULL
     AND addr LIKE '%@%'
   ORDER BY lower(btrim(addr)), registered_at;
$fn$;
REVOKE EXECUTE ON FUNCTION public.event_attendance_recipients(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_attendance_recipients(uuid) TO service_role;

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
BEGIN
  IF p_stage NOT IN ('2w','1w','3d','24h_attending','thank_you') THEN
    RAISE EXCEPTION 'Unknown reminder stage %', p_stage;
  END IF;
  v_key := CASE WHEN p_stage = 'thank_you' THEN 'ws_event_thank_you'
                ELSE 'ws_event_reminder_' || p_stage END;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_when := public.event_when_text(e.start_at, e.end_at);

  v_vars := jsonb_build_object(
    'event_title', public.event_reminder_html(coalesce(nullif(btrim(e.title), ''), 'Minerva IMS event')),
    'event_date', to_char(public.event_reminder_day(e.start_at, e.date), 'FMDay FMDD FMMonth YYYY'),
    'event_time', v_when,
    'event_location', public.event_reminder_html(CASE WHEN coalesce(e.online, false) THEN 'Online'
                                                      ELSE coalesce(nullif(btrim(e.place), ''), 'To be confirmed') END),
    'register_url', 'https://minervaims.org/events/' || e.id::text || '/register',
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
        'cancel_block', CASE WHEN p_stage = '24h_attending' AND e.aod_day_id IS NULL
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
          'cancel_block', CASE WHEN e.aod_day_id IS NULL
                               THEN public.event_cancel_block(e.id::text, rcpt.cancel_token, 'registration') ELSE '' END));
      v_count := v_count + 1;
    END LOOP;
  ELSE
    FOR rcpt IN SELECT * FROM public.event_reminder_recipients(p_event_id) LOOP
      PERFORM public.enqueue_app_email(v_key, rcpt.email,
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name)));
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$fn$;