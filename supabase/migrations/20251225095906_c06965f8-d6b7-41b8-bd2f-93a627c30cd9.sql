-- Change guest column from text to text array for multiple guests
ALTER TABLE public.events 
ALTER COLUMN guest TYPE text[] 
USING CASE WHEN guest IS NULL THEN NULL ELSE ARRAY[guest] END;