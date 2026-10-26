-- =====================================================================
-- Step 98, Batch 0: the phone call invitation's subject.
-- ---------------------------------------------------------------------
-- Every subject is followed by " | Minerva IMS", so a subject that names
-- the Society itself names it twice (Step 94B's rule, checked by
-- scripts/time-machine.test.mjs). Step 97's phone call invitation did:
-- "A short phone call with Minerva IMS | Minerva IMS". The source,
-- transactional-emails.ts, now says "A short phone call"; this brings the
-- stored copy the database sends into line, subject and <title>, exactly
-- as Step 94B does for the offer.
--
-- Changed only while the stored copy still has the old words, so a
-- subject edited by hand in Automatic Emails is left as it is.
-- Idempotent: safe to run twice. Nothing is deleted.
-- =====================================================================

UPDATE public.auto_email_templates
   SET subject = 'A short phone call | Minerva IMS'
 WHERE key = 'call_invitation'
   AND subject IN ('A short phone call with Minerva IMS | Minerva IMS', 'A short phone call with Minerva IMS');

UPDATE public.auto_email_templates
   SET body = replace(body, '<title>A short phone call with Minerva IMS | Minerva IMS</title>',
                            '<title>A short phone call | Minerva IMS</title>')
 WHERE key = 'call_invitation'
   AND subject = 'A short phone call | Minerva IMS'
   AND strpos(body, '<title>A short phone call with Minerva IMS | Minerva IMS</title>') > 0;

DO $report$
BEGIN
  RAISE NOTICE 'Step 98 Batch 0: the phone call invitation''s subject is "%".',
    (SELECT subject FROM public.auto_email_templates WHERE key = 'call_invitation');
END
$report$;
