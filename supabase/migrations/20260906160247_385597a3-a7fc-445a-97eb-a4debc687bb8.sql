REVOKE ALL ON FUNCTION public.process_profile_reminders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.process_fee_reminders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fee_payment_block(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_profile_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_fee_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.fee_payment_block(uuid) TO service_role;