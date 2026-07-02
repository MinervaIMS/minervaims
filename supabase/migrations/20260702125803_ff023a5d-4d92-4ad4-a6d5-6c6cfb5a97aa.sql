UPDATE public.aod_days SET registration_open = true WHERE event_date >= current_date;
ALTER TABLE public.archive_files ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false;