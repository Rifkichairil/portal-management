-- Add description and resolution columns to case table
ALTER TABLE IF EXISTS public."case" ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public."case" ADD COLUMN IF NOT EXISTS resolution TEXT;

COMMENT ON COLUMN public."case".description IS 'Case description from Salesforce';
COMMENT ON COLUMN public."case".resolution IS 'Case resolution from Salesforce';
