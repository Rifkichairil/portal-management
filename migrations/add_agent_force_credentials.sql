-- Add Agent Force API credentials columns to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS agent_force_client_id TEXT;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS agent_force_client_secret TEXT;
