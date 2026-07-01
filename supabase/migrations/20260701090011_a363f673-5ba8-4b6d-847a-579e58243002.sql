CREATE TABLE IF NOT EXISTS public.fund_performance_years (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund        text NOT NULL CHECK (fund IN ('long-short', 'multi-asset')),
  year        int  NOT NULL,
  itd         text NOT NULL DEFAULT '',
  months      jsonb NOT NULL DEFAULT '["","","","","","","","","","","",""]'::jsonb,
  ytd         text NOT NULL DEFAULT '',
  vol         text NOT NULL DEFAULT '',
  sharpe      text NOT NULL DEFAULT '',
  updated_by  uuid REFERENCES auth.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund, year)
);

DROP TRIGGER IF EXISTS update_fund_performance_years_updated_at ON public.fund_performance_years;
CREATE TRIGGER update_fund_performance_years_updated_at
  BEFORE UPDATE ON public.fund_performance_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fund_performance_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fund performance years are public" ON public.fund_performance_years;
CREATE POLICY "fund performance years are public"
  ON public.fund_performance_years FOR SELECT
  USING (true);
GRANT SELECT ON public.fund_performance_years TO anon, authenticated;
GRANT ALL ON public.fund_performance_years TO service_role;

INSERT INTO public.fund_performance_years (fund, year, itd, months, ytd, vol, sharpe) VALUES
  ('long-short', 2021, '7.9%',  '["","","","","","","","","","","+0.9%","+6.9%"]', '+7.9%',  '4.6%',  '1.68'),
  ('long-short', 2022, '29.1%', '["+9.3%","+0.1%","+0.7%","+4.9%","+2.2%","+0.6%","-3.7%","+2.2%","+0.9%","+1.0%","-1.0%","+1.5%"]', '+19.6%', '10.1%', '1.61'),
  ('long-short', 2023, '29.8%', '["-2.2%","+0.3%","+2.5%","+1.6%","-0.4%","+0.1%","-3.8%","+5.2%","+1.6%","+1.7%","-4.0%","-1.8%"]', '+0.5%',  '7.0%',  '-0.64'),
  ('long-short', 2024, '46.5%', '["+6.6%","+0.9%","-0.3%","+1.2%","+0.9%","-1.7%","+0.5%","+0.7%","-2.4%","+3.1%","+1.6%","+1.4%"]', '+12.9%', '6.0%',  '1.20'),
  ('long-short', 2025, '58.3%', '["-1.1%","+0.3%","+1.0%","-1.6%","+2.1%","+2.4%","+2.2%","+0.5%","+1.6%","+0.3%","-0.9%","+0.9%"]', '+8.0%',  '5.5%',  '0.73'),
  ('long-short', 2026, '52.8%', '["-1.4%","-1.0%","-1.1%","","","","","","","","",""]', '-2.2%',  '3.1%',  '-1.06'),
  ('multi-asset', 2020, '15.1%', '["+0.1%","-0.3%","+0.1%","+1.4%","+3.4%","+1.9%","-1.8%","+1.2%","-1.4%","+2.2%","+5.0%","+2.6%"]', '+15.1%', '6.9%',  '2.18'),
  ('multi-asset', 2021, '45.2%', '["+3.0%","+2.3%","+1.5%","+0.7%","+0.5%","+2.4%","+2.0%","+1.5%","-2.3%","+4.7%","+2.4%","+4.9%"]', '+26.1%', '6.6%',  '3.94'),
  ('multi-asset', 2022, '35.7%', '["-2.0%","+0.4%","+2.1%","-2.8%","-0.2%","-7.8%","+6.5%","+5.1%","-9.2%","+3.7%","+2.9%","-4.1%"]', '-6.6%',  '17.1%', '-0.53'),
  ('multi-asset', 2023, '36.6%', '["+0.2%","-2.1%","-0.3%","-0.3%","-1.0%","+1.3%","-1.5%","+0.1%","-3.7%","-0.7%","+7.3%","+1.8%"]', '+0.7%',  '9.4%',  '-0.49'),
  ('multi-asset', 2024, '38.4%', '["+0.5%","+0.2%","+1.6%","-0.4%","+0.4%","-0.1%","+0.7%","0.0%","-0.4%","-0.2%","+0.9%","-1.9%"]', '+1.3%',  '3.0%',  '-1.24'),
  ('multi-asset', 2025, '58.8%', '["+0.6%","+4.5%","-3.3%","+1.6%","+1.7%","-0.2%","+0.2%","+2.7%","+2.1%","+3.7%","0.0%","+0.4%"]', '+14.8%', '7.1%',  '1.51'),
  ('multi-asset', 2026, '69.9%', '["+5.8%","+1.1%","-2.0%","+4.1%","","","","","","","",""]', '+9.1%',  '11.8%', '0.67')
ON CONFLICT (fund, year) DO NOTHING;