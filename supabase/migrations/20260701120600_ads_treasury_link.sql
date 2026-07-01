-- =====================================================================
-- Advertising spend auto-posts to the Treasury.
-- ---------------------------------------------------------------------
-- When an advertising entry is recorded, its amount is posted once to the
-- Treasury as an outflow on the date the expense was incurred. We keep a
-- link to the created Treasury entry so it is posted exactly once.
-- =====================================================================

ALTER TABLE public.ads_spending
  ADD COLUMN IF NOT EXISTS treasury_entry_id uuid REFERENCES public.treasury_entries(id);
