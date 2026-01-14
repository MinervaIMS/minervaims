-- Add publication_year column for academic papers
ALTER TABLE public.readings 
ADD COLUMN publication_year integer;