CREATE TABLE IF NOT EXISTS public.editorial_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  event_id            uuid REFERENCES public.events(id) ON DELETE SET NULL,
  platform            text NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram','linkedin','other')),
  format              text NOT NULL DEFAULT 'ig_post'
                        CHECK (format IN ('ig_story','ig_post','ig_reel','li_post','other')),
  scheduled_date      date,
  responsible_person  text,
  status              text NOT NULL DEFAULT 'idea'
                        CHECK (status IN ('idea','scheduled','in_progress','published','cancelled')),
  paid                boolean NOT NULL DEFAULT false,
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editorial_items_date_idx ON public.editorial_items(scheduled_date);

GRANT SELECT ON public.editorial_items TO authenticated;
GRANT ALL ON public.editorial_items TO service_role;

ALTER TABLE public.editorial_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "editorial readable by staff" ON public.editorial_items;
CREATE POLICY "editorial readable by staff" ON public.editorial_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_editorial_items_updated_at ON public.editorial_items;
CREATE TRIGGER update_editorial_items_updated_at
  BEFORE UPDATE ON public.editorial_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.ads_spending (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content             text NOT NULL,
  platform            text,
  ad_date             date,
  amount              numeric,
  campaign_purpose    text,
  effectiveness_notes text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ads_spending_date_idx ON public.ads_spending(ad_date DESC);

GRANT SELECT ON public.ads_spending TO authenticated;
GRANT ALL ON public.ads_spending TO service_role;

ALTER TABLE public.ads_spending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads readable by staff" ON public.ads_spending;
CREATE POLICY "ads readable by staff" ON public.ads_spending FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


ALTER TABLE public.workspace_resources
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;