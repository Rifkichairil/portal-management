-- Add base_url column to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS base_url TEXT;
