-- =====================================================================
-- Media & Communication and Operations: one recruiting intake.
-- ---------------------------------------------------------------------
-- The two divisions recruit together. A candidate applies once, is
-- screened once, is invited once and is interviewed once, by either Head;
-- which of the two they join is decided by the role they are offered.
-- The intake is stored as `media`, which is what the application form has
-- always written, so no application changes shape.
--
-- This migration does four things, all idempotent:
--
--   1. two helpers the reminder job needs: the intake's name, and the
--      "how to prepare" sentence of the interview emails;
--   2. folds `operations`, where it was used as a separate division to
--      EVALUATE or INTERVIEW a candidate, into the joint intake. Where an
--      offer PLACES somebody is not touched;
--   3. turns the preparation sentence in the four interview emails into a
--      variable, because for the joint intake it pointed at
--      /divisions/media - a page that does not exist;
--   4. re-creates process_offer_deadlines() exactly as it was, with the
--      two interview reminders naming the intake and carrying that
--      sentence.
--
-- Mirrors supabase/functions/_shared/recruiting.ts.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1a. The name of the intake a candidacy is in.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intake_division_label(_division public.org_division)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE
    WHEN _division IN ('media', 'operations') THEN 'Media & Communication and Operations'
    ELSE public.division_label(_division)
  END
$fn$;


-- ---------------------------------------------------------------------
-- 1b. The preparation sentence of the interview emails.
--
-- Research candidates receive, word for word and link for link, what
-- they received before. The joint intake is pointed at the About page,
-- because Media & Communication and Operations publish no research and
-- /divisions/media does not exist.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.interview_division_reading(_division public.org_division)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
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


-- ---------------------------------------------------------------------
-- 2. `operations` as a separate recruiting division becomes the intake.
--
-- Only the recruiting columns. `offer_division` is WHERE AN OFFER PLACES
-- somebody and is left exactly as it is.
-- ---------------------------------------------------------------------
UPDATE public.applications SET evaluation_division = 'media'
 WHERE evaluation_division = 'operations';
UPDATE public.applications SET evaluation_division_previous = 'media'
 WHERE evaluation_division_previous = 'operations';
UPDATE public.applications SET interview_division = 'media'
 WHERE interview_division = 'operations';

-- A candidacy moved between Media and Operations now has the same
-- division before and after the move. That is one intake, not two
-- processes, so the record of a "previous" division is cleared: it would
-- otherwise hold the candidate to a pair made of one division twice.
UPDATE public.applications SET evaluation_division_previous = NULL
 WHERE evaluation_division_previous IS NOT NULL
   AND evaluation_division_previous = evaluation_division;

-- Slots and bookings could only have been written for `operations` by a
-- direct request (the calendar never offered it), but if any exist they
-- join the intake's calendar. A slot identical to one the intake already
-- has for the same examiner is left where it is rather than collide.
UPDATE public.interview_slots s SET division = 'media'
 WHERE s.division = 'operations'
   AND NOT EXISTS (
     SELECT 1 FROM public.interview_slots m
      WHERE m.division = 'media'
        AND m.slot_date = s.slot_date
        AND m.start_time = s.start_time
        AND m.examiner_id IS NOT DISTINCT FROM s.examiner_id
   );
UPDATE public.interview_bookings SET division = 'media'
 WHERE division = 'operations';


-- ---------------------------------------------------------------------
-- 3. The preparation sentence becomes a variable in the four interview
--    emails. `replace` changes nothing where the sentence is not present
--    word for word, so this is safe to run twice.
--
--    The workspace's Auto emails page keeps these rows in step with the
--    templates in supabase/functions/_shared/transactional-emails.ts,
--    which carry the same change; this makes it true from the moment the
--    migration runs rather than from the next time that page is opened.
-- ---------------------------------------------------------------------
UPDATE public.auto_email_templates
   SET body = replace(
     body,
     'We also strongly recommend reading your division&rsquo;s latest reports at <a href="https://minervaims.org/divisions/{{division_slug}}" style="color:#1F0F4D;">minervaims.org/divisions/{{division_slug}}</a>.',
     '{{division_reading}}'
   )
 WHERE key IN (
   'interview_invitation',
   'interview_booking_reminder_24h',
   'interview_booking_reminder_48h',
   'interview_booking_confirmation'
 );


-- ---------------------------------------------------------------------
-- 4. process_offer_deadlines(), unchanged except for the two interview
--    reminders: they name the intake, and carry the preparation sentence.
--    Everything else is the definition from 20260912090318, verbatim.
-- ---------------------------------------------------------------------
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
