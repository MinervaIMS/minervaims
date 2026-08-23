-- =====================================================================
-- Minerva Investment Management Society was founded in 2017, not 2019.
-- ---------------------------------------------------------------------
-- The project was built on the later date. This migration corrects the one
-- place the database holds it: the "Our History" rail on the About page.
--
-- EVERY STATEMENT IS GUARDED AND IDEMPOTENT. Running it twice changes
-- nothing the second time, and no row that somebody has since edited in the
-- workspace is overwritten: the founding copy is only moved while it still
-- reads exactly as it was seeded, and the 2026 milestone is only touched
-- while it still says "back in 2019".
--
-- NOTHING THAT GENUINELY HAPPENED IN 2019 IS CHANGED. The 2020 milestone
-- still records that the Long-Short Equity Fund had launched in 2019,
-- because it had.
-- =====================================================================

-- 1. The rail may now begin two years earlier.
ALTER TABLE public.history_events
  DROP CONSTRAINT IF EXISTS history_events_year_sane;
ALTER TABLE public.history_events
  ADD CONSTRAINT history_events_year_sane CHECK (year >= 2017);

-- 2. The founding, in the year it happened.
--    ON CONFLICT DO NOTHING: if a 2017 row already exists, somebody has
--    written it and it is theirs, not this migration's.
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

-- 3. The two years between the founding and the first milestone already on
--    the rail become QUIET YEARS: present, drawn small, saying nothing.
--    No event is invented for either of them.
INSERT INTO public.history_events
  (year, title, description, href, media_kind, is_active)
VALUES
  (2018, '', '', NULL, 'none', false)
ON CONFLICT (year) DO NOTHING;

-- 4. 2019 held the founding. It is now a quiet year like 2018 - but only if
--    it is still carrying the seeded founding copy, so an edited row is
--    left exactly as its author left it.
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

-- 5. The 2026 milestone describes the founders returning to Bocconi and
--    refers back to the year they first described the society. Same guard.
UPDATE public.history_events
SET description = replace(description,
      'They had described a society much like this one back in 2019,',
      'They had described a society much like this one back in 2017,'),
    updated_at = now()
WHERE year = 2026
  AND description LIKE '%back in 2019,%';
