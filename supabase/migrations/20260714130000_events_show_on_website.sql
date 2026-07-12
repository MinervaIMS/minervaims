-- =====================================================================
-- Events: website visibility flag.
--
-- The Events archive (workspace) records EVERY event, whatever its type
-- (internal meetings, online calls, division events, guest events, …).
-- Only some of those should appear on the public website Events page.
-- `show_on_website` lets staff decide per event; it defaults to true so
-- existing behaviour (everything visible) is preserved until an event is
-- explicitly hidden.
-- =====================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT true;

-- Internal-only event types are hidden from the public site by default;
-- outward-facing ones stay visible. This only seeds sensible defaults for
-- rows that already exist — staff can flip any event afterwards.
UPDATE public.events
   SET show_on_website = false
 WHERE event_type IN ('meeting', 'online_call');

CREATE INDEX IF NOT EXISTS events_show_on_website_idx ON public.events(show_on_website);
