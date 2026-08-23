-- Founded 2017 correction
ALTER TABLE public.history_events
  DROP CONSTRAINT IF EXISTS history_events_year_sane;
ALTER TABLE public.history_events
  ADD CONSTRAINT history_events_year_sane CHECK (year >= 2017);

INSERT INTO public.history_events
  (year, title, description, href, media_kind, image_url, image_alt, is_active)
VALUES
  (2017,
   'From the idea of five students, Minerva is founded',
   'In 2017 five students founded a society Bocconi did not have: one devoted entirely to asset management. They built it like the firms they hoped to join, with a board of eight and five divisions. Research was written to feed portfolio decisions, not to sit in a drawer. Minerva has grown since, but it still works that way.',
   '/people/alumni#founders',
   'image',
   '/history/2019-founding-cohort.jpg',
   'The founding cohort, 2017',
   true)
ON CONFLICT (year) DO NOTHING;

INSERT INTO public.history_events
  (year, title, description, href, media_kind, is_active)
VALUES
  (2018, '', '', NULL, 'none', false)
ON CONFLICT (year) DO NOTHING;

UPDATE public.history_events
SET title = '',
    description = '',
    href = NULL,
    media_kind = 'none',
    image_url = NULL,
    image_alt = NULL,
    is_active = false,
    updated_at = now()
WHERE year = 2019
  AND is_active = true
  AND description LIKE 'In 2019 five students founded a society Bocconi did not have%';

UPDATE public.history_events
SET description = replace(description,
      'They had described a society much like this one back in 2019,',
      'They had described a society much like this one back in 2017,'),
    updated_at = now()
WHERE year = 2026
  AND description LIKE '%back in 2019,%';