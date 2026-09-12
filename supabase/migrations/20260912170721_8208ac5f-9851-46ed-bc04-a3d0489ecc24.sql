ALTER TABLE public.application_settings
  ADD COLUMN IF NOT EXISTS closed_divisions text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.application_settings.closed_divisions IS
  'Divisions whose applications closed early, inside an open recruitment window. Empty means every division is taking part. Written by admin-settings, read publicly alongside the window dates.';