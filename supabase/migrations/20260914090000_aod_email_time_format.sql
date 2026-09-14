-- =====================================================================
-- THE ASSOCIATION ON DISPLAY EMAIL, IN THE SAME WORDS AS THE WORKSPACE.
-- ---------------------------------------------------------------------
-- The stand page now writes times as "6:30pm" and states that a slot is
-- never capped. The email that invites people to that page still said
-- "10:00-19:00", and said nothing about a slot's length beyond "30-minute
-- slots". One of the two had to change, and it was the email.
--
-- WHY A SURGICAL REPLACE AND NOT THE WHOLE BODY. The template's real home
-- is supabase/functions/_shared/transactional-emails.ts, and the Auto
-- emails page re-syncs subject and body from that file every time it is
-- opened. Re-stating eight kilobytes of HTML here would duplicate the
-- source of truth in order to say two sentences differently, and the copy
-- would start rotting immediately. Swapping the two phrases in place says
-- exactly what changed, and the next sync reconciles anything else.
--
-- The WHERE clause makes it idempotent: a second run matches nothing.
-- =====================================================================

UPDATE public.auto_email_templates
   SET body = replace(body, '10:00&ndash;19:00', '10:00am to 7:00pm')
 WHERE key = 'ws_association_on_display'
   AND body LIKE '%10:00&ndash;19:00%';

UPDATE public.auto_email_templates
   SET body = replace(
         body,
         'The stand runs in <strong>30-minute slots</strong>, and more than one person can take the same slot.',
         'The stand runs in <strong>30-minute slots</strong>, each covering the whole half hour from the time it '
         || 'starts: the 6:30pm slot runs to 7:00pm. There is no limit on how many of us can take the same slot, '
         || 'so please sign up even for one that is already covered.')
 WHERE key = 'ws_association_on_display'
   AND body LIKE '%30-minute slots</strong>, and more than one person can take the same slot.%';
