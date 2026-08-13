ALTER TABLE public.treasury_entries
  ADD CONSTRAINT treasury_entries_flow_sign_chk
  CHECK ((flow = 'in' AND amount > 0) OR (flow = 'out' AND amount < 0));