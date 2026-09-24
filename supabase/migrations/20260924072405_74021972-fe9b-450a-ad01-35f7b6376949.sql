CREATE OR REPLACE FUNCTION public.intake_division_label(_division public.org_division)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE WHEN _division IN ('media', 'operations') THEN 'Media & Communication and Operations' ELSE public.division_label(_division) END
$fn$;

CREATE OR REPLACE FUNCTION public.interview_division_reading(_division public.org_division)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE
    WHEN _division IN ('equity', 'investment', 'macro', 'portfolio', 'quant') THEN
      'We also strongly recommend reading your division&rsquo;s latest reports at <a href="https://minervaims.org/divisions/'
      || _division::text || '" style="color:#1F0F4D;">minervaims.org/divisions/' || _division::text || '</a>.'
    ELSE
      'We also recommend reading about the association, its divisions and the work of Media &amp; Communication and Operations at <a href="https://minervaims.org/about" style="color:#1F0F4D;">minervaims.org/about</a>.'
  END
$fn$;

REVOKE EXECUTE ON FUNCTION public.intake_division_label(public.org_division) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.interview_division_reading(public.org_division) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intake_division_label(public.org_division) TO service_role;
GRANT EXECUTE ON FUNCTION public.interview_division_reading(public.org_division) TO service_role;

UPDATE public.applications SET evaluation_division = 'media' WHERE evaluation_division = 'operations';
UPDATE public.applications SET evaluation_division_previous = 'media' WHERE evaluation_division_previous = 'operations';
UPDATE public.applications SET interview_division = 'media' WHERE interview_division = 'operations';
UPDATE public.applications SET evaluation_division_previous = NULL
 WHERE evaluation_division_previous IS NOT NULL AND evaluation_division_previous = evaluation_division;

UPDATE public.interview_slots s SET division = 'media'
 WHERE s.division = 'operations'
   AND NOT EXISTS (
     SELECT 1 FROM public.interview_slots m
      WHERE m.division = 'media' AND m.slot_date = s.slot_date AND m.start_time = s.start_time
        AND m.examiner_id IS NOT DISTINCT FROM s.examiner_id);
UPDATE public.interview_bookings SET division = 'media' WHERE division = 'operations';

UPDATE public.auto_email_templates
   SET body = replace(body,
     'We also strongly recommend reading your division&rsquo;s latest reports at <a href="https://minervaims.org/divisions/{{division_slug}}" style="color:#1F0F4D;">minervaims.org/divisions/{{division_slug}}</a>.',
     '{{division_reading}}')
 WHERE key IN ('interview_invitation','interview_booking_reminder_24h','interview_booking_reminder_48h','interview_booking_confirmation');

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
      'deadline', to_char(((r.interview_invited_at + interval '3 days') AT TIME ZONE 'Europe/Rome'), 'DD Mon YYYY, HH24:MI')
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
      'deadline', to_char(((r.interview_invited_at + interval '3 days') AT TIME ZONE 'Europe/Rome'), 'DD Mon YYYY, HH24:MI')
    ));
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;