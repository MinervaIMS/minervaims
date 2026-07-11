-- === Migration 1: resource sources ===
ALTER TABLE public.workspace_resources
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.workspace_resources
SET sources = (
      CASE WHEN coalesce(btrim(body), '')     <> '' THEN jsonb_build_array(jsonb_build_object('kind', 'text', 'value', body))     ELSE '[]'::jsonb END
   || CASE WHEN coalesce(btrim(link_url), '') <> '' THEN jsonb_build_array(jsonb_build_object('kind', 'link', 'value', link_url)) ELSE '[]'::jsonb END
   || CASE WHEN coalesce(btrim(file_url), '') <> '' THEN jsonb_build_array(jsonb_build_object('kind', 'file', 'value', file_url)) ELSE '[]'::jsonb END
)
WHERE sources = '[]'::jsonb;

UPDATE public.workspace_resources SET description = '' WHERE description IS NULL;

-- === Migration 2: calendar_entries ===
CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  entry_date   date NOT NULL,
  entry_type   text NOT NULL DEFAULT 'meeting'
                 CHECK (entry_type IN ('meeting','deadline','reminder','social','other')),
  location     text,
  created_by   uuid REFERENCES auth.users(id),
  author_name  text,
  author_role  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_entries_date_idx ON public.calendar_entries(entry_date);

GRANT SELECT ON public.calendar_entries TO authenticated;
GRANT ALL ON public.calendar_entries TO service_role;

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar entries readable by staff" ON public.calendar_entries;
CREATE POLICY "calendar entries readable by staff" ON public.calendar_entries
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_calendar_entries_updated_at ON public.calendar_entries;
CREATE TRIGGER update_calendar_entries_updated_at
  BEFORE UPDATE ON public.calendar_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Migration 3: testimonials ===
CREATE TABLE IF NOT EXISTS public.testimonials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote         text NOT NULL,
  alumni_id     uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  name          text NOT NULL,
  role_label    text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  published     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_order_idx ON public.testimonials(display_order);

GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials public read" ON public.testimonials;
CREATE POLICY "testimonials public read" ON public.testimonials
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "testimonials staff read" ON public.testimonials;
CREATE POLICY "testimonials staff read" ON public.testimonials
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.testimonials (quote, name, role_label, display_order, published)
SELECT * FROM (VALUES
  ('The perfect place to apply classroom knowledge in an industry-like setting while meeting inspiring students who share your passion.', 'Anna Maruccio', 'Former President', 1, true),
  ('Joining Minerva was one of the best choices I made throughout my studies. Beyond everything I learned, it was the people I met and the moments we shared that made this experience so meaningful and unforgettable.', 'Luigi Savarese', 'Former President', 2, true),
  ('Come for the finance, stay for the people. You will join expecting to contribute to interesting work, but what you might not expect is to build relationships that will last long after graduation while having lots of fun.', 'Matteo Consalvo', 'Former Head of Portfolio Management', 3, true),
  ('A community of students, peers, and friends united by a passion for financial markets, creating bonds that last far beyond in life.', 'Michele Rinaldi', 'Former Vice-president', 4, true),
  ('An awesome place to meet people passionate about markets, exchange ideas and support peers in a friendly environment.', 'Marco Neri', 'Former Vice-president', 5, true)
) AS seed(quote, name, role_label, display_order, published)
WHERE NOT EXISTS (SELECT 1 FROM public.testimonials);