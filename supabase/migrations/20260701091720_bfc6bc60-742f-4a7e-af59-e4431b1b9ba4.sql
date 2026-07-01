ALTER TABLE public.ads_spending
  ADD COLUMN IF NOT EXISTS treasury_entry_id uuid REFERENCES public.treasury_entries(id);