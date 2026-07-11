DO $$
DECLARE
  _uid uuid := 'd5a88920-4498-4acc-a4c6-da3246f60ab7';
  _email text := 'criccardo480@gmail.com';
BEGIN
  DELETE FROM public.interview_bookings WHERE candidate_user_id = _uid OR lower(candidate_email) = _email;
  DELETE FROM public.application_notes WHERE application_id IN (SELECT id FROM public.applications WHERE user_id = _uid OR lower(email) = _email);
  DELETE FROM public.applications WHERE user_id = _uid OR lower(email) = _email;
  DELETE FROM public.members WHERE user_id = _uid OR lower(email) = _email;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE id = _uid;
  DELETE FROM public.newsletter_subscribers WHERE lower(email) = _email;
  DELETE FROM auth.users WHERE id = _uid;
END $$;

DELETE FROM public.interview_bookings;
DELETE FROM public.interview_slots;