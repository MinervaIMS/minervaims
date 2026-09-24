-- =====================================================================
-- Events: every event in the archive, and nothing published by accident.
-- ---------------------------------------------------------------------
-- Create Event never sent `show_on_website`, and `admin-events` defaulted
-- it to TRUE, so every event created there was listed on the public Events
-- page. At the same time the workspace archive listed only events whose
-- creator had ticked "Record this event in the archive", which most types
-- left unticked. An internal meeting created in the usual way was
-- therefore PUBLIC, and absent from the one screen where it could be made
-- private.
--
-- From this step the archive lists every event and Create Event sends the
-- website choice explicitly. This migration repairs the rows the defect
-- could have produced, and only those:
--
--   * a MEETING or an ONLINE CALL - the two types the association has
--     always kept off the public site (20260714130000 hid exactly these);
--   * that is listed on the website;
--   * and was never in the archive (`in_archive = false`), which means
--     nobody could have switched it on deliberately: the switch lives in
--     the archive, and the row was not there.
--
-- Anything else - a meeting somebody chose to publish from the archive,
-- an aperitivo, a guest event - is left exactly as it is.
--
-- `in_archive` is then set on every row, because the archive no longer
-- reads it and a column that says "false" about events plainly in the
-- archive would mislead whoever reads it next.
-- =====================================================================

UPDATE public.events
   SET show_on_website = false
 WHERE event_type IN ('meeting', 'online_call')
   AND show_on_website = true
   AND in_archive = false;

UPDATE public.events SET in_archive = true WHERE in_archive IS DISTINCT FROM true;
