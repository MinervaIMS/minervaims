-- Create alumni table for managing alumni data
CREATE TABLE public.alumni (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  surname text NOT NULL,
  graduation_year integer NOT NULL,
  company text NOT NULL,
  city text,
  linkedin_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Alumni are publicly readable" 
ON public.alumni 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alumni_updated_at
BEFORE UPDATE ON public.alumni
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();