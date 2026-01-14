-- Create enum for reading types
CREATE TYPE public.reading_type AS ENUM ('academic_papers', 'technical_textbooks', 'free_time_readings');

-- Create readings table
CREATE TABLE public.readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  reading_type reading_type NOT NULL,
  contributor_name TEXT NOT NULL,
  contributor_surname TEXT NOT NULL,
  contributor_role TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Readings are publicly readable"
ON public.readings
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_readings_updated_at
BEFORE UPDATE ON public.readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();