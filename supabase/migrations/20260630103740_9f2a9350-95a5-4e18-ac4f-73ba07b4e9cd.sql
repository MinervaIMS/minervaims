ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fee_status text NOT NULL DEFAULT 'unpaid'
    CHECK (fee_status IN ('paid','unpaid','exempt'));