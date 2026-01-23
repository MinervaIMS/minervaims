-- Add job_area column to alumni table
ALTER TABLE public.alumni 
ADD COLUMN job_area text NULL;