-- ═════════════════════════════════════════════════════════════════════
-- STEP 13 — Events: the archive becomes a per-event choice.
-- ---------------------------------------------------------------------
-- Whether an event is recorded in Events > Event Archive is decided by
-- its creator (online calls, guest events and alumni calls default to
-- yes). Existing events keep appearing in the archive exactly as today.
-- ═════════════════════════════════════════════════════════════════════

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS in_archive boolean NOT NULL DEFAULT true;
