-- lovable-cron-fallback-reviewed: No delayed-workflow provider is configured; five-minute checks are necessary for a half-hour-before interview reminder.
ALTER TABLE public.interview_bookings ADD COLUMN IF NOT EXISTS reminder_30m_sent_at timestamptz;

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
      'interview_time', to_char(r.start_time, 'HH24:MI') || '–' || to_char(r.end_time, 'HH24:MI') || ' (Rome time)',
      'meeting_link', replace(meeting, '&', '&amp;')
    ));
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_interview_30m_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_interview_30m_reminders() TO service_role;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
SELECT cron.schedule('interview-30m-reminders', '*/5 * * * *', $$ SELECT public.process_interview_30m_reminders(); $$);