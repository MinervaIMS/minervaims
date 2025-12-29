-- Create application_settings table to store recruitment settings
CREATE TABLE public.application_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applications_open boolean NOT NULL DEFAULT false,
  semester_label text NOT NULL DEFAULT 'Spring 2026',
  apply_form_url text NOT NULL DEFAULT 'https://forms.google.com/your-form-url',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Application settings are publicly readable" 
ON public.application_settings 
FOR SELECT 
USING (true);

-- Insert default row
INSERT INTO public.application_settings (applications_open, semester_label, apply_form_url)
VALUES (false, 'Spring 2026', 'https://forms.google.com/your-form-url');

-- Create trigger for updating timestamp
CREATE TRIGGER update_application_settings_updated_at
BEFORE UPDATE ON public.application_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();