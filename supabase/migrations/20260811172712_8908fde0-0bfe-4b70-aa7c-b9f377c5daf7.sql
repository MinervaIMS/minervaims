ALTER TABLE public.ads_spending
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN ad_date SET NOT NULL;

ALTER TABLE public.ads_spending
  ADD CONSTRAINT ads_spending_amount_positive CHECK (amount > 0);