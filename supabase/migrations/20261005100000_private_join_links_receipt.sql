-- =====================================================================
-- STEP 87. Safe to run twice.
-- ---------------------------------------------------------------------
-- 1. AN ONLINE EVENT'S MEETING LINK IS PRIVATE. It used to live in
--    events.place, which anybody can read (the events table is public,
--    for the website): the link reached people who had not registered,
--    and a link anyone can open is a reason not to register. It now
--    lives in event_join_links, which nobody reads from the browser:
--      * the emails that confirm a place carry it (the confirmation, a
--        place from the waiting list, and the day-before "See you
--        tomorrow" note, which did not);
--      * a member who is registered sees it on their Dashboard and in
--        Events > My events (my_event_registrations below);
--      * the organisers read and change it through admin-events.
--    events.place says "Online".
-- 2. The receipt of an internal form, rewritten to be read at a glance.
-- Every template body is the responsive output of transactional-emails.ts.
-- =====================================================================

-- ── 1. The links ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_join_links (
  event_id   uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  url        text NOT NULL CHECK (char_length(url) BETWEEN 1 AND 2000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_join_links ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only the service role (edge functions) and the
-- SECURITY DEFINER functions below read it.
REVOKE ALL ON public.event_join_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.event_join_links TO service_role;

-- Every link already saved as an event's place moves here, and the place
-- becomes "Online". An event whose place is a web address is online.
INSERT INTO public.event_join_links (event_id, url)
SELECT e.id, btrim(e.place)
  FROM public.events e
 WHERE btrim(coalesce(e.place, '')) ~* '^https?://[^\s<>"'']{3,}$'
   AND char_length(btrim(e.place)) <= 2000
ON CONFLICT (event_id) DO UPDATE SET url = EXCLUDED.url, updated_at = now();

UPDATE public.events
   SET place = 'Online', online = true
 WHERE btrim(coalesce(place, '')) ~* '^https?://[^\s<>"'']{3,}$'
   AND char_length(btrim(place)) <= 2000;

-- The link of an online event, for the functions that build its emails.
CREATE OR REPLACE FUNCTION public.event_join_url(p_event_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT l.url FROM public.event_join_links l
    JOIN public.events e ON e.id = l.event_id
   WHERE l.event_id = p_event_id AND coalesce(e.online, false);
$fn$;
REVOKE EXECUTE ON FUNCTION public.event_join_url(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_join_url(uuid) TO service_role;

-- The event as the emails read it: as in 20260929090000, plus its link.
CREATE OR REPLACE FUNCTION public.event_as_json(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT jsonb_build_object('id', e.id::text, 'title', e.title, 'start_at', e.start_at, 'end_at', e.end_at,
                            'date', e.date, 'place', e.place, 'online', e.online, 'description', e.description,
                            'join_url', public.event_join_url(e.id))
    FROM public.events e WHERE e.id = p_event_id;
$fn$;
REVOKE EXECUTE ON FUNCTION public.event_as_json(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_as_json(uuid) TO service_role;

-- The event emails: as in 20261002100000, with the link read from
-- event_join_links (an event not yet moved still works from its place).
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
  -- An online event's meeting link, in the box nobody can miss: only in
  -- the emails that confirm a place (the confirmation, and a place opened
  -- from the waiting list), never in the waiting-list or cancellation ones.
  v_join   text := CASE WHEN v_online
                        THEN public.event_join_block(coalesce(nullif(p_ev->>'join_url', ''), p_ev->>'place'))
                        ELSE '' END;
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
    'event_location', public.event_reminder_html(CASE WHEN v_online AND v_ticket AND v_join <> '' THEN 'Online, link below'
                        WHEN v_online THEN 'Online'
                        ELSE coalesce(nullif(btrim(coalesce(p_ev->>'place', '')), ''), 'To be confirmed') END),
    'description_block', CASE WHEN v_desc IS NULL THEN ''
      ELSE '<tr><td style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,''Segoe UI'',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">'
           || public.event_reminder_html(v_desc) || '</p></td></tr>' END,
    'register_url', CASE WHEN v_id = 'sample' THEN 'https://minervaims.org/events'
                         ELSE 'https://minervaims.org/events/' || v_id || '/register' END,
    'join_block', CASE WHEN v_ticket THEN v_join ELSE '' END,
    'checkin_block', CASE WHEN v_ticket AND NOT v_online THEN public.event_checkin_block(p_checkin) ELSE '' END,
    'calendar_block', CASE WHEN v_ticket THEN public.event_calendar_block(v_id) ELSE '' END,
    'cancel_block', CASE WHEN v_ticket THEN public.event_cancel_block(v_id, p_cancel, 'registration')
                         WHEN p_kind = 'waitlist_joined' THEN public.event_cancel_block(v_id, p_cancel, 'waitlist')
                         ELSE '' END,
    'waitlist_position', coalesce(p_position::text, '1')
  ));
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.event_notice_enqueue(text, jsonb, text, text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_notice_enqueue(text, jsonb, text, text, text, text, integer) TO service_role;

-- The reminders: as in 20260929090000, plus the join box in the
-- day-before note to the people registered ("See you tomorrow"), which
-- is where somebody looks for the link on the day. The 14, 7 and 3 day
-- reminders go to members who have NOT registered: they never carry it.
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
        v_vars || jsonb_build_object('first_name', public.event_reminder_html(rcpt.first_name), 'join_block', ''));
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.send_event_registration_reminder(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_event_registration_reminder(uuid, text, text) TO service_role;

-- ── 2. What the signed-in member is registered for ───────────────────
-- Their places and waiting-list entries for events from yesterday on,
-- by their account or by the address they registered with, and the link
-- of each online event they hold a PLACE at (never on the waiting list).
-- The Dashboard's event card asks this; nobody can ask it for somebody
-- else.
CREATE OR REPLACE FUNCTION public.my_event_registrations()
RETURNS TABLE (event_id uuid, status text, join_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH me AS (
    SELECT auth.uid() AS uid, lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) AS email
  ), since AS (
    SELECT ((now() AT TIME ZONE 'Europe/Rome')::date - 1) AS day
  ), mine AS (
    SELECT r.event_id, 'registered'::text AS status, 1 AS rank
      FROM public.event_registrations r, me
     WHERE me.uid IS NOT NULL
       AND (r.user_id = me.uid OR (me.email <> '' AND lower(btrim(coalesce(r.email, ''))) = me.email))
    UNION ALL
    SELECT w.event_id, 'waitlisted'::text, 2
      FROM public.event_waitlist w, me
     WHERE me.uid IS NOT NULL
       AND (w.user_id = me.uid OR (me.email <> '' AND lower(btrim(coalesce(w.email, ''))) = me.email))
  )
  SELECT DISTINCT ON (m.event_id) m.event_id, m.status,
         CASE WHEN m.status = 'registered' AND coalesce(e.online, false) THEN l.url END
    FROM mine m
    JOIN public.events e ON e.id = m.event_id
    LEFT JOIN public.event_join_links l ON l.event_id = m.event_id
   CROSS JOIN since
   WHERE coalesce(e.date, (e.start_at AT TIME ZONE 'Europe/Rome')::date) >= since.day
   ORDER BY m.event_id, m.rank;
$fn$;
REVOKE EXECUTE ON FUNCTION public.my_event_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_event_registrations() TO authenticated, service_role;

-- ── 3. The templates ─────────────────────────────────────────────────
INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES ('ws_event_reminder_24h_attending', $t$Workspace · event reminder, 24 hours before (registered)$t$, $t$See you tomorrow | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>See you tomorrow | Minerva IMS</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Tomorrow: {{event_title}}. You are registered.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Events · See you tomorrow</td></tr>
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
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">See you tomorrow</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;"><strong>{{event_title}}</strong> takes place tomorrow and your name is on the list. The details are set out below; we look forward to seeing you there.</p></td></tr>
          <tr><td class="mims-pad" style="padding:4px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;"><tr><td class="mims-xsmall" style="padding:11px 0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Event</td><td class="mims-body" style="padding:11px 0 11px 16px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_title}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Date</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_date}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Time</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_time}}</td></tr><tr><td class="mims-xsmall" style="padding:11px 0;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">Location</td><td class="mims-body" style="padding:11px 0 11px 16px;border-top:1px solid #E0E0E0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">{{event_location}}</td></tr></table></td></tr>
          {{join_block}}
          {{checkin_block}}
          {{description_block}}
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">You receive this reminder because you are registered for this event. If your plans have changed and you can no longer attend, please write to <a href="mailto:as.minerva@unibocconi.it" style="color:#1F0F4D;text-decoration:none;">as.minerva@unibocconi.it</a> so that your place can be offered to another member.</p></td></tr>
          <tr><td class="mims-pad" style="padding:8px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="https://minervaims.org/events" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Event details</a></td></tr></table></td></tr>
          {{cancel_block}}
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Operations Team</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
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
VALUES ('internal_form_receipt', $t$Internal form: answers received$t$, $t$Answers received | Minerva IMS$t$, $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Your answers are in | Minerva IMS</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F5F5F5;">Your answers to {{form_title}} have been received.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">
          <tr><td class="mims-eyebrow" style="background:#141414;padding:9px 40px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#FFFFFF;mso-line-height-rule:exactly;">Operations · Internal forms</td></tr>
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
          <tr><td class="mims-pad" style="padding:30px 40px 20px;"><h1 class="mims-h1" style="margin:0;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:29px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;color:#141414;">Your answers are in</h1></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 18px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Dear {{first_name}},</p></td></tr>
          <tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-body" style="margin:0 0 22px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Thank you for answering <strong>{{form_title}}</strong>. This email is your receipt: keep it. It shows what you sent and what happens next.</p></td></tr>
          {{summary_block}}
          {{order_block}}
          {{payment_block}}
          {{answers_block}}
          {{confirmation_block}}
          <tr><td class="mims-pad" style="padding:4px 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="{{form_url}}" style="display:inline-block;padding:15px 34px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">View your answers</a></td></tr></table></td></tr>
          <tr><td class="mims-pad" style="padding:14px 40px 4px;"><p class="mims-body" style="margin:0 0 4px;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#141414;">Kind regards,</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">The Operations Team</p><p class="mims-body" style="margin:0;font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141414;">Minerva Investment Management Society</p></td></tr>
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

