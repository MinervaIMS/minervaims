DROP TABLE IF EXISTS public.join_faqs CASCADE;

CREATE TABLE public.join_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key    text NOT NULL CHECK (group_key IN ('eligibility', 'process', 'preparing', 'membership')),
  group_label  text NOT NULL,
  group_order  int  NOT NULL,
  sort_order   int  NOT NULL,
  question     text NOT NULL,
  answer       text NOT NULL,
  link_label   text,
  link_href    text,
  is_published boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id),
  UNIQUE (group_key, sort_order),
  CONSTRAINT join_faqs_link_pair CHECK (
    (link_label IS NULL AND link_href IS NULL) OR
    (link_label IS NOT NULL AND link_href IS NOT NULL)
  ),
  CONSTRAINT join_faqs_link_internal CHECK (
    link_href IS NULL OR link_href LIKE '/%'
  )
);

CREATE INDEX join_faqs_order_idx ON public.join_faqs (group_order, sort_order);

GRANT SELECT ON public.join_faqs TO anon, authenticated;
GRANT ALL ON public.join_faqs TO service_role;

ALTER TABLE public.join_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "join faqs are public"
  ON public.join_faqs FOR SELECT
  USING (is_published);

CREATE TRIGGER update_join_faqs_updated_at
  BEFORE UPDATE ON public.join_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();