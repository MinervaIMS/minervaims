CREATE OR REPLACE FUNCTION public.process_offer_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
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
    RETURNING id, first_name, email, offer_deadline, offer_division,
              evaluation_division, interview_division, first_choice
  LOOP
    PERFORM public.enqueue_app_email('acceptance_reminder', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', CASE coalesce(r.offer_division, r.evaluation_division, r.interview_division, r.first_choice)
        WHEN 'equity' THEN 'Equity Research'
        WHEN 'investment' THEN 'Investment Research'
        WHEN 'macro' THEN 'Macro Research'
        WHEN 'portfolio' THEN 'Portfolio Management'
        WHEN 'quant' THEN 'Quantitative Research'
        WHEN 'media' THEN 'Media & Communication'
        WHEN 'operations' THEN 'Operations'
        ELSE '' END,
      'acceptance_deadline', to_char(r.offer_deadline, 'DD Mon YYYY'),
      'status_url', 'https://minervaims.org/workspace',
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
    RETURNING id, first_name, email, offer_deadline, offer_division,
              evaluation_division, interview_division, first_choice
  LOOP
    PERFORM public.enqueue_app_email('offer_expired', r.email, jsonb_build_object(
      'first_name', r.first_name,
      'division_name', CASE coalesce(r.offer_division, r.evaluation_division, r.interview_division, r.first_choice)
        WHEN 'equity' THEN 'Equity Research'
        WHEN 'investment' THEN 'Investment Research'
        WHEN 'macro' THEN 'Macro Research'
        WHEN 'portfolio' THEN 'Portfolio Management'
        WHEN 'quant' THEN 'Quantitative Research'
        WHEN 'media' THEN 'Media & Communication'
        WHEN 'operations' THEN 'Operations'
        ELSE '' END,
      'acceptance_deadline', to_char(r.offer_deadline, 'DD Mon YYYY')
    ));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_offer_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_offer_deadlines() TO service_role;