-- Create storage bucket for archive PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('archive-files', 'archive-files', true);

-- Create policy for public read access on archive files
CREATE POLICY "Archive files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'archive-files');

-- Create archive_files table
CREATE TABLE public.archive_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  date DATE NOT NULL,
  division TEXT NOT NULL CHECK (division IN ('equity', 'investment', 'macro', 'portfolio', 'quant')),
  fund TEXT CHECK (fund IS NULL OR fund IN ('long-short', 'multi-asset')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.archive_files ENABLE ROW LEVEL SECURITY;

-- Public read access for archive files
CREATE POLICY "Archive files are publicly readable"
ON public.archive_files
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_archive_files_updated_at
BEFORE UPDATE ON public.archive_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();