CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- INTERVIEW SLOT NOT BOOKED YET: remind at 24h, then again at 48h.
  -- Booking advances the status away from 'interview_invitation_sent'.
  -- The 48h reminder additionally requires the 24h one to have gone out
  -- at least 12 hours earlier, so no candidate gets both at once.
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
      'division_name', public.division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
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
      'division_name', public.division_label(r.interview_division),
      'division_slug', coalesce(r.interview_division::text, ''),
      'deadline', to_char(((r.interview_invited_at + interval '3 days') AT TIME ZONE 'Europe/Rome'), 'DD Mon YYYY, HH24:MI')
    ));
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;