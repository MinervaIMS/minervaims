-- Create enum for team member positions
CREATE TYPE public.team_position AS ENUM (
  'President',
  'Vice President',
  'Head of Asset Management',
  'Head of Equity Research',
  'Head of Investment Research',
  'Head of Macro Research',
  'Head of Portfolio Management',
  'Head of Quantitative Research',
  'Portfolio Manager',
  'Senior Analyst',
  'Analyst',
  'Head of Operations',
  'Head of Media',
  'Operations',
  'Media'
);

-- Create enum for divisions
CREATE TYPE public.team_division AS ENUM (
  'equity',
  'investment',
  'macro',
  'portfolio',
  'quant',
  'operations'
);

-- Create enum for funds
CREATE TYPE public.team_fund AS ENUM (
  'long-short',
  'multi-asset',
  'dps',
  'pir'
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  position team_position NOT NULL,
  division team_division,
  fund team_fund,
  photo_url TEXT,
  linkedin_url TEXT,
  is_board BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Team members are publicly readable"
ON public.team_members
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for team photos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-photos', 'team-photos', true);

-- Create storage policies for team photos
CREATE POLICY "Team photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-photos');

CREATE POLICY "Authenticated users can upload team photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'team-photos');

CREATE POLICY "Authenticated users can update team photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'team-photos');

CREATE POLICY "Authenticated users can delete team photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'team-photos');