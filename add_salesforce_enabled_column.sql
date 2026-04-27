-- Add salesforce_enabled column to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS salesforce_enabled BOOLEAN DEFAULT FALSE;
