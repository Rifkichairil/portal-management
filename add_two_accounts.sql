BEGIN;

INSERT INTO public.account (
  account_sf_id,
  name,
  phone,
  email,
  website,
  "billingStreet",
  "billingCity",
  "billingState",
  "billingCountry",
  "billingPostalCode"
)
VALUES
  (
    '001VG00000XF9Q1LA',
    'PT. Nusantara Digital Integrasi',
    '+62 21 2995 2351',
    'hello@nusantaradigitalintegrasi.com',
    'https://www.nusantaradigitalintegrasi.com',
    'Jl. HR Rasuna Said Kav. 5',
    'Jakarta Selatan',
    'DKI Jakarta',
    'Indonesia',
    '12940'
  ),
  (
    '001VG00000XF9Q1LB',
    'PT. Cakrawala Data Solusi',
    '+62 31 4001 7842',
    'contact@cakrawaladatasolusi.com',
    'https://www.cakrawaladatasolusi.com',
    'Jl. Basuki Rahmat No. 88',
    'Surabaya',
    'Jawa Timur',
    'Indonesia',
    '60271'
  )
ON CONFLICT (account_sf_id) DO NOTHING;

COMMIT;
