ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT true;
UPDATE public.events SET show_on_website = false WHERE event_type IN ('meeting', 'online_call');
CREATE INDEX IF NOT EXISTS events_show_on_website_idx ON public.events(show_on_website);