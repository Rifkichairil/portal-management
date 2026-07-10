-- Add severity column to case table
ALTER TABLE IF EXISTS public."case" ADD COLUMN IF NOT EXISTS severity TEXT;
COMMENT ON COLUMN public."case".severity IS 'Severity level from Salesforce: Severity 1, Severity 2, Severity 3';
