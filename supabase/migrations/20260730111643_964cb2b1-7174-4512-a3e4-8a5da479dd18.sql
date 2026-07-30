CREATE TABLE IF NOT EXISTS public.history_events (
  year           integer PRIMARY KEY,
  title          text NOT NULL,
  description    text NOT NULL,
  href           text,
  media_kind     text NOT NULL DEFAULT 'none',
  report_file_id uuid REFERENCES public.archive_files(id) ON DELETE SET NULL,
  number_value   integer,
  number_label   text,
  image_url      text,
  image_alt      text,
  is_active      boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT history_events_media_kind_check
    CHECK (media_kind IN ('none', 'report', 'number', 'image')),
  CONSTRAINT history_events_not_future
    CHECK (year <= EXTRACT(YEAR FROM now())::int),
  CONSTRAINT history_events_year_sane
    CHECK (year >= 2019),
  CONSTRAINT history_events_copy_present
    CHECK (is_active = false OR (btrim(title) <> '' AND btrim(description) <> ''))
);

GRANT SELECT ON public.history_events TO anon, authenticated;
GRANT ALL ON public.history_events TO service_role;

ALTER TABLE public.history_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history public read" ON public.history_events;
CREATE POLICY "history public read" ON public.history_events
  FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_history_events_updated_at ON public.history_events;
CREATE TRIGGER update_history_events_updated_at
  BEFORE UPDATE ON public.history_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.history_events (year, title, description, href, media_kind, number_value, number_label, image_url, image_alt, is_active)
SELECT * FROM (VALUES
  (2019,
   'From the idea of five students, Minerva is founded',
   'In 2019 five students founded a society Bocconi did not have: one devoted entirely to asset management. They built it like the firms they hoped to join, with a board of eight and five divisions. Research was written to feed portfolio decisions, not to sit in a drawer. Minerva has grown since, but it still works that way.',
   '/people/alumni#founders', 'image', NULL, NULL, '/history/2019-founding-cohort.jpg', 'The founding cohort, 2019', true),
  (2020,
   'The virtual funds go live',
   'The Long-Short Equity Fund had launched in 2019. In 2020 the Multi-Asset Global Opportunities Fund followed, investing across equities, bonds and commodities worldwide, and in the spring the Diversified Passive Selection Fund joined it, built on ETFs. Three funds, three mandates. From that year, research was judged by how the portfolios performed.',
   '/divisions/portfolio', 'report', NULL, NULL, NULL, NULL, true),
  (2021,
   'The alumni network passes one hundred',
   'By 2021 the alumni list had passed one hundred names. They had arrived at Minerva as students with little experience and gone on to trade, invest, advise and teach at some of the strongest institutions in the industry. They still answer when a current member writes. The network now stands at [n], across several continents.',
   '/people/alumni', 'number', 100, 'Alumni Network', NULL, NULL, true),
  (2022, '', '', NULL, 'none', NULL, NULL, NULL, NULL, false),
  (2023,
   'Investment Research is introduced',
   'The Investment Research Division was created in 2023. It monitors market trends, updates the Society''s view on a regular basis, and recommends how much exposure to hold in each asset class and region. Every exposure is discussed and approved by the whole team. The first Global Outlook came out that December, and one has followed every semester since.',
   '/divisions/investment', 'report', NULL, NULL, NULL, NULL, true),
  (2024,
   'Quantitative Research steps into ML and neural networks',
   'In 2024 the Quantitative Research Division published Forecasting 101, three papers on the same dataset: median house prices in California. The first used LASSO and Ridge regression, the second a Bayesian framework, the third a neural network. It was the division''s first sustained work in machine learning, and it set the direction for what followed.',
   '/archive?division=quant', 'report', NULL, NULL, NULL, NULL, true),
  (2025, '', '', NULL, 'none', NULL, NULL, NULL, NULL, false),
  (2026,
   'The founders return to Bocconi',
   'In the first half of 2026, across four public events and five alumni calls, Minerva welcomed its founders back to Bocconi. They had described a society much like this one back in 2019, at a point when there was very little evidence it would work. Most of the members who came to listen had never met them. All of them had been living inside the idea for years.',
   '/events', 'image', NULL, NULL, '/history/2026-founders-return.jpg', 'The founders back at Bocconi, 2026', true)
) AS seed(year, title, description, href, media_kind, number_value, number_label, image_url, image_alt, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.history_events);

UPDATE public.history_events h
   SET report_file_id = (
     SELECT a.id FROM public.archive_files a
      WHERE a.fund = 'multi-asset' AND a.file_url IS NOT NULL
      ORDER BY a.date ASC LIMIT 1)
 WHERE h.year = 2020 AND h.report_file_id IS NULL;

UPDATE public.history_events h
   SET report_file_id = (
     SELECT a.id FROM public.archive_files a
      WHERE a.title ILIKE '%Global Outlook%' AND a.file_url IS NOT NULL
        AND a.date >= '2023-01-01' AND a.date <= '2023-12-31'
      ORDER BY a.date DESC LIMIT 1)
 WHERE h.year = 2023 AND h.report_file_id IS NULL;

UPDATE public.history_events h
   SET report_file_id = (
     SELECT a.id FROM public.archive_files a
      WHERE a.title ILIKE '%Forecasting 101%' AND a.file_url IS NOT NULL
      ORDER BY a.date ASC LIMIT 1)
 WHERE h.year = 2024 AND h.report_file_id IS NULL;