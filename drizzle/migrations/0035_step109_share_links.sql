-- =====================================================================
-- STEP 109: WHAT THE BUILD READS TO GIVE EVENT AND FORM LINKS THEIR OWN
-- PREVIEW.
-- ---------------------------------------------------------------------
-- 1. THE SHORT LINKS OF THE EVENTS A VISITOR CAN READ.
-- ---------------------------------------------------------------------
-- A link shared in WhatsApp, LinkedIn or any other app is shown as a
-- card read from the page's HTML; none of those apps runs the site's
-- JavaScript. The build therefore writes each public event's
-- registration page, and its short link /e/<code>, as HTML with that
-- event's own title, line and picture (vite.static-pages.ts).
--
-- It reads the events from website_events with the public key, as the
-- Events page does; that view has no short code, so this function gives
-- the code of exactly those events and of no other: the ones a visitor
-- who is not signed in can read (on the website, or open to people who
-- are not members), which short_link_target already opens for anybody
-- holding the code. A members-only event's code is never listed.
--
-- Reads only. Writes nothing, sends nothing. Safe to run twice.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.public_event_share_codes()
RETURNS TABLE (id uuid, short_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT e.id, e.short_code
    FROM public.events e
   WHERE e.short_code IS NOT NULL
     AND NOT e.date_tbc
     AND (e.show_on_website
          OR (e.registration_enabled AND e.registration_audience <> 'members'));
$fn$;

REVOKE ALL ON FUNCTION public.public_event_share_codes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_event_share_codes() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.public_event_share_codes() IS
  'Step 109: the short codes of the events a visitor can read (website_events for anon), for the link previews the build writes.';

-- ---------------------------------------------------------------------
-- 2. THE PUBLISHED FORMS, BY THEIR OWN TITLE.
-- ---------------------------------------------------------------------
-- A form's link (/forms/<id>, or /f/<code>) shows the form's own title in
-- WhatsApp and the other apps (the President's choice, Step 109). The
-- build reads, with the public key, each published form's address, short
-- code, title and audience; nothing else of it (no questions, no answers,
-- no description). The form's page already shows its title to anybody
-- holding the link, members-only forms included (it then asks them to
-- sign in). A draft is never listed; a closed form only for the 60 days
-- after it closed, while its link is still being passed round.
CREATE OR REPLACE FUNCTION public.public_form_share_links()
RETURNS TABLE (id uuid, short_code text, title text, audience text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT f.id, f.short_code, f.title, f.audience
    FROM public.internal_forms f
   WHERE f.status = 'open'
      OR (f.status = 'closed' AND coalesce(f.closed_at, f.closes_at, f.updated_at) > now() - interval '60 days');
$fn$;

REVOKE ALL ON FUNCTION public.public_form_share_links() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_form_share_links() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.public_form_share_links() IS
  'Step 109: the published forms'' address, short code, title and audience, for the link previews the build writes.';
