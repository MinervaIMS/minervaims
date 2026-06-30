
-- Phase 2.1: missing GRANTs + scheduling-only open/close
GRANT SELECT ON public.application_settings  TO anon, authenticated;
GRANT SELECT ON public.application_questions TO anon, authenticated;
GRANT SELECT ON public.applications          TO authenticated;
GRANT ALL ON public.application_settings, public.application_questions,
             public.applications, public.application_notes TO service_role;
