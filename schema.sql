-- 1. Table: users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Table: account
CREATE TABLE IF NOT EXISTS public.account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_sf_id TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  "billingStreet" TEXT,
  "billingCity" TEXT,
  "billingState" TEXT,
  "billingCountry" TEXT,
  "billingPostalCode" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Insert Dummy Data for account
INSERT INTO public.account (
  account_sf_id, name, phone, website, "billingStreet", "billingCity", "billingState", "billingCountry", "billingPostalCode"
) VALUES (
  '001VG00000XF2OOYA1', 
  'PT. Telekomunikasi Indonesia Internasional', 
  '+62 21 2995 2300', 
  'https://www.telin.net/', 
  'Jl. Gatot Subroto Kav. 52-53', 
  'Jakarta Selatan', 
  'DKI Jakarta', 
  'Indonesia', 
  '12710'
) ON CONFLICT (account_sf_id) DO NOTHING;

-- 3. Table: contact
CREATE TABLE IF NOT EXISTS public.contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  contact_sf_id TEXT UNIQUE,
  account_id UUID REFERENCES public.account(id) ON DELETE CASCADE,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Table: case
CREATE TABLE IF NOT EXISTS public.case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_sf_id TEXT UNIQUE,
  contact_sf_id TEXT REFERENCES public.contact(contact_sf_id) ON DELETE SET NULL,
  "caseNumber" TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON public.account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_updated_at BEFORE UPDATE ON public.contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_case_updated_at BEFORE UPDATE ON public.case FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Table: settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  client_secret TEXT,
  base_url TEXT,
  salesforce_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure existing settings table also has salesforce toggle column
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS salesforce_enabled BOOLEAN DEFAULT FALSE;

-- Add base_url column if it doesn't exist
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS base_url TEXT;

-- Add department column to contact table if it doesn't exist
ALTER TABLE public.contact
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add password column to contact table if it doesn't exist
ALTER TABLE public.contact
ADD COLUMN IF NOT EXISTS password TEXT;

-- Migration: Change contact table foreign key from account_sf_id to account_id
-- Drop old foreign key constraint if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contact_account_sf_id_fkey'
    ) THEN
        ALTER TABLE public.contact DROP CONSTRAINT contact_account_sf_id_fkey;
    END IF;
END $$;

-- Add new column for account_id if it doesn't exist
ALTER TABLE public.contact
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.account(id) ON DELETE CASCADE;

-- Migrate data from account_sf_id to account_id for existing records
UPDATE public.contact c
SET account_id = a.id
FROM public.account a
WHERE c.account_sf_id = a.account_sf_id
AND c.account_id IS NULL;

-- Drop old account_sf_id column after migration (optional - keep for reference)
-- ALTER TABLE public.contact DROP COLUMN IF EXISTS account_sf_id;

-- Apply trigger to settings table
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Table: error_log
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  case_id UUID REFERENCES public.case(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apply trigger to error_log table
CREATE TRIGGER update_error_log_updated_at BEFORE UPDATE ON public.error_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
