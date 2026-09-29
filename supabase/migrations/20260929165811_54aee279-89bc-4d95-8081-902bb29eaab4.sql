CREATE OR REPLACE FUNCTION public.clock12(p_time time)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT to_char(('2000-01-01'::date + p_time), 'FMHH12:MI') || ' ' || lower(to_char(('2000-01-01'::date + p_time), 'am'));
$fn$;

CREATE OR REPLACE FUNCTION public.rome_stamp12(p_at timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT to_char(p_at AT TIME ZONE 'Europe/Rome', 'FMDD Mon YYYY') || ', ' || public.event_clock(p_at);
$fn$;

CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  s RECORD;
BEGIN
  FOR r IN
    UPDATE public.applications
       SET offer_reminder_sent_at = now()
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_reminder_sent_at IS NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_sent_at + interval '2 days'
       AND now() < offer_deadline
    RETURNING id, first_name, email, offer_deadline
  LOOP
    PERFORM public.enqueue_app_email('offer_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'status_url', 'https://minervaims.org/admin',
      'deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET status = 'offer_declined'
     WHERE status = 'accepted'
       AND offer_sent_at IS NOT NULL
       AND offer_deadline IS NOT NULL
       AND now() >= offer_deadline
    RETURNING id, first_name, surname, email, offer_deadline, offer_role, offer_division
  LOOP
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object('first_name', r.first_name));

    FOR s IN
      SELECT DISTINCT p.email, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'colleague') AS first_name
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
       WHERE p.email IS NOT NULL
         AND (
           ur.role = 'president'
           OR (ur.role IN ('head_of_division', 'head_of_operations', 'head_of_media')
               AND ur.division = r.offer_division)
         )
    LOOP
      PERFORM public.enqueue_staff_email('staff_offer_expired', s.email, jsonb_build_object(
        'first_name', s.first_name,
        'candidate_name', r.first_name || ' ' || r.surname,
        'division_name', public.division_label(r.offer_division),
        'offer_role', coalesce(replace(r.offer_role::text, '_', ' '), 'the role offered'),
        'offer_deadline', to_char((r.offer_deadline AT TIME ZONE 'Europe/Rome'), 'DD Mon YYYY, HH24:MI')
      ), r.id::text || ':offer_expired');
    END LOOP;
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET interview_reminder_sent_at = now()
     WHERE status = 'interview_invitation_sent'
       AND interview_invited_at IS NOT NULL
       AND interview_reminder_sent_at IS NULL
       AND now() >= interview_invited_at + interval '24 hours'
       AND now() <  interview_invited_at + interval '3 days'
    RETURNING id, first_name, email, interview_division, interview_invited_at
  LOOP
    PERFORM public.enqueue_app_email('interview_booking_reminder_24h', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', public.intake_division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
      'division_reading', public.interview_division_reading(r.interview_division),
      'deadline', public.rome_stamp12(r.interview_invited_at + interval '3 days')
    ));
  END LOOP;

  FOR r IN
    UPDATE public.applications
       SET interview_reminder2_sent_at = now()
     WHERE status = 'interview_invitation_sent'
       AND interview_invited_at IS NOT NULL
       AND interview_reminder2_sent_at IS NULL
       AND interview_reminder_sent_at IS NOT NULL
       AND now() >= interview_reminder_sent_at + interval '12 hours'
       AND now() >= interview_invited_at + interval '48 hours'
       AND now() <  interview_invited_at + interval '3 days'
    RETURNING id, first_name, email, interview_division, interview_invited_at
  LOOP
    PERFORM public.enqueue_app_email('interview_booking_reminder_48h', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', public.intake_division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
      'division_reading', public.interview_division_reading(r.interview_division),
      'deadline', public.rome_stamp12(r.interview_invited_at + interval '3 days')
    ));
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;

CREATE OR REPLACE FUNCTION public.process_interview_30m_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  sent integer := 0;
  meeting text;
BEGIN
  FOR r IN
    SELECT b.id, b.application_id, b.candidate_email, a.first_name,
           s.slot_date, s.start_time, s.end_time, s.division, s.meeting_link
      FROM public.interview_bookings b
      JOIN public.interview_slots s ON s.id = b.slot_id
      JOIN public.applications a ON a.id = b.application_id
     WHERE b.reminder_30m_sent_at IS NULL
       AND a.status = 'interview_confirmed'
       AND s.is_active = true AND s.is_booked = true
       AND (s.slot_date + s.start_time) AT TIME ZONE 'Europe/Rome' > now() + interval '25 minutes'
       AND (s.slot_date + s.start_time) AT TIME ZONE 'Europe/Rome' <= now() + interval '30 minutes'
     ORDER BY s.slot_date, s.start_time
     LIMIT 100
     FOR UPDATE OF b SKIP LOCKED
  LOOP
    meeting := btrim(coalesce(r.meeting_link, ''));
    IF meeting !~* '^https://([a-z0-9-]+\.)*(teams\.microsoft\.com|teams\.live\.com|zoom\.us|zoom\.com)([:/?#]|$)' THEN CONTINUE; END IF;
    UPDATE public.interview_bookings SET reminder_30m_sent_at = now() WHERE id = r.id;
    PERFORM public.enqueue_app_email('interview_reminder_30m', r.candidate_email, jsonb_build_object(
      'first_name', replace(replace(replace(coalesce(r.first_name,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      'division_name', public.intake_division_label(r.division),
      'interview_date', to_char(r.slot_date, 'FMDay FMDD FMMonth YYYY'),
      'interview_time', public.clock12(r.start_time) || ' to ' || public.clock12(r.end_time) || ' ' || public.event_zone((r.slot_date + r.start_time) AT TIME ZONE 'Europe/Rome'),
      'meeting_link', replace(meeting, '&', '&amp;')
    ));
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_interview_30m_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_interview_30m_reminders() TO service_role;