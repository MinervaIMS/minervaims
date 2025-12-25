-- Drop existing constraint and add new one with inactive funds
ALTER TABLE public.archive_files DROP CONSTRAINT IF EXISTS archive_files_fund_check;

ALTER TABLE public.archive_files ADD CONSTRAINT archive_files_fund_check 
CHECK (fund IS NULL OR fund IN ('long-short', 'multi-asset', 'dps', 'pir'));