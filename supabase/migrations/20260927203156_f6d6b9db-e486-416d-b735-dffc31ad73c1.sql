ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS checkin_token text DEFAULT replace(gen_random_uuid()::text, '-', '');
UPDATE public.event_registrations
   SET checkin_token = replace(gen_random_uuid()::text, '-', '')
 WHERE checkin_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_checkin_token
  ON public.event_registrations (checkin_token);
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE OR REPLACE FUNCTION public.event_checkin_block(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE WHEN p_token IS NULL OR NOT (p_token ~ '^[a-f0-9]{32}$' OR p_token = 'sample') THEN ''
  ELSE '<tr><td align="center" style="padding:4px 40px 26px;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E0E0E0;background:#FFFFFF;"><tr><td align="center" style="padding:18px 24px 16px;">'
    || '<img src="https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/checkin-qr?t=' || p_token || '" width="168" height="168" alt="Your entry code" style="display:block;width:168px;height:168px;border:0;" />'
    || '<p style="margin:12px 0 0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;">Your entry code</p>'
    || '<p style="margin:4px 0 0;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#141414;">Show it at the entrance to be checked in.</p>'
    || '</td></tr></table></td></tr>'
  END;
$fn$;

DROP FUNCTION IF EXISTS public.event_attendance_recipients(uuid);
CREATE FUNCTION public.event_attendance_recipients(p_event_id uuid)
RETURNS TABLE (email text, first_name text, checkin_token text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT DISTINCT ON (lower(btrim(addr)))
         btrim(addr) AS email,
         coalesce(nullif(btrim(fname), ''), 'member') AS first_name,
         token AS checkin_token
    FROM (
      SELECT coalesce(nullif(btrim(r.email), ''), nullif(btrim(m.email), '')) AS addr,
             coalesce(nullif(split_part(btrim(r.name), ' ', 1), ''), m.first_name) AS fname,
             r.checkin_token AS token,
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

CREATE OR REPLACE FUNCTION public.event_zone(p_at timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT CASE WHEN (p_at AT TIME ZONE 'Europe/Rome') - (p_at AT TIME ZONE 'UTC') >= interval '2 hours'
              THEN 'CEST' ELSE 'CET' END;
$fn$;

CREATE OR REPLACE FUNCTION public.event_clock(p_at timestamptz, p_zone boolean DEFAULT true)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT to_char(p_at AT TIME ZONE 'Europe/Rome', 'FMHH12:MI') || ' '
      || lower(to_char(p_at AT TIME ZONE 'Europe/Rome', 'am'))
      || CASE WHEN p_zone THEN ' ' || public.event_zone(p_at) ELSE '' END;
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
BEGIN
  IF p_stage NOT IN ('2w','1w','3d','24h_attending','thank_you') THEN
    RAISE EXCEPTION 'Unknown reminder stage %', p_stage;
  END IF;
  v_key := CASE WHEN p_stage = 'thank_you' THEN 'ws_event_thank_you'
                ELSE 'ws_event_reminder_' || p_stage END;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_when := CASE
    WHEN e.start_at IS NULL THEN 'To be confirmed'
    WHEN e.end_at IS NULL THEN public.event_clock(e.start_at)
    WHEN public.event_zone(e.start_at) = public.event_zone(e.end_at)
      THEN public.event_clock(e.start_at, false) || ' to ' || public.event_clock(e.end_at)
    ELSE public.event_clock(e.start_at) || ' to ' || public.event_clock(e.end_at)
  END;

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
                              THEN public.event_checkin_block('sample') ELSE '' END));
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
                                ELSE public.event_checkin_block(rcpt.checkin_token) END));
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