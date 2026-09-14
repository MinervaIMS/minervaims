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