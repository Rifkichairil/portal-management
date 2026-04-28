BEGIN;

-- 1) Ensure manager accounts exist (required by contact.account_sf_id FK)
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
    '001VG00000MGR0001',
    'PT. Telekomunikasi Indonesia Internasional',
    '+62 21 2995 2300',
    'contact@telin.id',
    'https://www.telin.net/',
    'Jl. Gatot Subroto Kav. 52-53',
    'Jakarta Selatan',
    'DKI Jakarta',
    'Indonesia',
    '12710'
  ),
  (
    '001VG00000MGR0002',
    'PT. Mitra Cipta Sistem',
    '+62 31 4000 2002',
    'contact@mitracipta.id',
    'https://www.mitracipta.id',
    'Jl. Basuki Rahmat No. 22',
    'Surabaya',
    'Jawa Timur',
    'Indonesia',
    '60271'
  ),
  (
    '001VG00000MGR0003',
    'PT. Sagara Teknologi Nusantara',
    '+62 22 4000 3003',
    'contact@sagarateknologi.id',
    'https://www.sagarateknologi.id',
    'Jl. Asia Afrika No. 88',
    'Bandung',
    'Jawa Barat',
    'Indonesia',
    '40111'
  )
ON CONFLICT (account_sf_id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  "billingStreet" = EXCLUDED."billingStreet",
  "billingCity" = EXCLUDED."billingCity",
  "billingState" = EXCLUDED."billingState",
  "billingCountry" = EXCLUDED."billingCountry",
  "billingPostalCode" = EXCLUDED."billingPostalCode",
  updated_at = NOW(),
  deleted_at = NULL;

-- 2) Upsert 10 users: 1 admin, 3 manager, 6 submittercase
WITH upsert_users AS (
  INSERT INTO public.users (email, password, role, username)
  VALUES
    ('admin.portal@example.com', 'Admin#2026!', 'admin', 'admin_portal'),

    ('manager.alif@example.com', 'Manager#2026!', 'manager', 'manager_alif'),
    ('manager.bima@example.com', 'Manager#2026!', 'manager', 'manager_bima'),
    ('manager.cahya@example.com', 'Manager#2026!', 'manager', 'manager_cahya'),

    ('submitter.01@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_01'),
    ('submitter.02@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_02'),
    ('submitter.03@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_03'),
    ('submitter.04@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_04'),
    ('submitter.05@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_05'),
    ('submitter.06@example.com', 'Submitter#2026!', 'submittercase', 'submitter_case_06')
  ON CONFLICT (username) DO UPDATE
  SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    updated_at = NOW(),
    deleted_at = NULL
  RETURNING id, username
),
contact_map AS (
  SELECT
    u.id AS user_id,
    m.contact_sf_id,
    m.account_sf_id,
    m.first_name,
    m.last_name,
    m.full_name,
    m.title,
    m.phone,
    m.mobile
  FROM upsert_users u
  JOIN (
    VALUES
      -- 3 manager contacts
      ('manager_alif', '003VG00000MGRC001', '001VG00000MGR0001', 'Alif', 'Pratama', 'Alif Pratama', 'Manager', '+62 21 5000 1001', '+62 812 1000 1001'),
      ('manager_bima', '003VG00000MGRC002', '001VG00000MGR0002', 'Bima', 'Saputra', 'Bima Saputra', 'Manager', '+62 31 5000 2002', '+62 812 2000 2002'),
      ('manager_cahya', '003VG00000MGRC003', '001VG00000MGR0003', 'Cahya', 'Nugraha', 'Cahya Nugraha', 'Manager', '+62 22 5000 3003', '+62 812 3000 3003'),

      -- 6 submitter contacts (2 per manager, same account_sf_id with manager)
      ('submitter_case_01', '003VG00000SUBC001', '001VG00000MGR0001', 'Rani', 'Utami', 'Rani Utami', 'Case Submitter', '+62 21 5100 1101', '+62 813 1100 1101'),
      ('submitter_case_02', '003VG00000SUBC002', '001VG00000MGR0001', 'Dimas', 'Wibowo', 'Dimas Wibowo', 'Case Submitter', '+62 21 5100 1102', '+62 813 1100 1102'),

      ('submitter_case_03', '003VG00000SUBC003', '001VG00000MGR0002', 'Sinta', 'Maharani', 'Sinta Maharani', 'Case Submitter', '+62 31 5200 2201', '+62 813 2200 2201'),
      ('submitter_case_04', '003VG00000SUBC004', '001VG00000MGR0002', 'Galih', 'Ramadhan', 'Galih Ramadhan', 'Case Submitter', '+62 31 5200 2202', '+62 813 2200 2202'),

      ('submitter_case_05', '003VG00000SUBC005', '001VG00000MGR0003', 'Nadia', 'Permata', 'Nadia Permata', 'Case Submitter', '+62 22 5300 3301', '+62 813 3300 3301'),
      ('submitter_case_06', '003VG00000SUBC006', '001VG00000MGR0003', 'Fikri', 'Hidayat', 'Fikri Hidayat', 'Case Submitter', '+62 22 5300 3302', '+62 813 3300 3302')
  ) AS m(username, contact_sf_id, account_sf_id, first_name, last_name, full_name, title, phone, mobile)
    ON m.username = u.username
)
INSERT INTO public.contact (
  user_id,
  contact_sf_id,
  account_sf_id,
  "firstName",
  "lastName",
  "fullName",
  title,
  phone,
  mobile
)
SELECT
  user_id,
  contact_sf_id,
  account_sf_id,
  first_name,
  last_name,
  full_name,
  title,
  phone,
  mobile
FROM contact_map
ON CONFLICT (contact_sf_id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  account_sf_id = EXCLUDED.account_sf_id,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "fullName" = EXCLUDED."fullName",
  title = EXCLUDED.title,
  phone = EXCLUDED.phone,
  mobile = EXCLUDED.mobile,
  updated_at = NOW(),
  deleted_at = NULL;

-- 3) Insert 3 cases per submitter contact (6 submitter contacts => 18 cases)
INSERT INTO public."case" (
  case_sf_id,
  contact_sf_id,
  "caseNumber",
  subject,
  status
)
VALUES
  ('500VG00000CASE001', '003VG00000SUBC001', 'CAS-3001', 'Tidak bisa login ke portal', 'New'),
  ('500VG00000CASE002', '003VG00000SUBC001', 'CAS-3002', 'Permintaan reset password massal', 'Open'),
  ('500VG00000CASE003', '003VG00000SUBC001', 'CAS-3003', 'Error saat upload lampiran invoice', 'In Progress'),

  ('500VG00000CASE004', '003VG00000SUBC002', 'CAS-3004', 'Data dashboard tidak sinkron', 'New'),
  ('500VG00000CASE005', '003VG00000SUBC002', 'CAS-3005', 'Role akses user tidak sesuai', 'Open'),
  ('500VG00000CASE006', '003VG00000SUBC002', 'CAS-3006', 'Export CSV gagal', 'In Progress'),

  ('500VG00000CASE007', '003VG00000SUBC003', 'CAS-3007', 'Tagihan bulan lalu duplikat', 'New'),
  ('500VG00000CASE008', '003VG00000SUBC003', 'CAS-3008', 'Integrasi webhook timeout', 'Open'),
  ('500VG00000CASE009', '003VG00000SUBC003', 'CAS-3009', 'Notifikasi email terlambat', 'In Progress'),

  ('500VG00000CASE010', '003VG00000SUBC004', 'CAS-3010', 'Kesalahan format tanggal invoice', 'New'),
  ('500VG00000CASE011', '003VG00000SUBC004', 'CAS-3011', 'Akses halaman account ditolak', 'Open'),
  ('500VG00000CASE012', '003VG00000SUBC004', 'CAS-3012', 'Perubahan profil perusahaan gagal', 'In Progress'),

  ('500VG00000CASE013', '003VG00000SUBC005', 'CAS-3013', 'Pencarian case lambat', 'New'),
  ('500VG00000CASE014', '003VG00000SUBC005', 'CAS-3014', 'API key tidak bisa diregenerate', 'Open'),
  ('500VG00000CASE015', '003VG00000SUBC005', 'CAS-3015', '2FA code tidak terkirim', 'In Progress'),

  ('500VG00000CASE016', '003VG00000SUBC006', 'CAS-3016', 'Sidebar menumpuk di mobile', 'New'),
  ('500VG00000CASE017', '003VG00000SUBC006', 'CAS-3017', 'Session terlalu cepat expired', 'Open'),
  ('500VG00000CASE018', '003VG00000SUBC006', 'CAS-3018', 'Case detail page sangat lambat', 'In Progress')
ON CONFLICT (case_sf_id) DO UPDATE
SET
  contact_sf_id = EXCLUDED.contact_sf_id,
  "caseNumber" = EXCLUDED."caseNumber",
  subject = EXCLUDED.subject,
  status = EXCLUDED.status,
  updated_at = NOW(),
  deleted_at = NULL;

COMMIT;

-- Optional verification
-- SELECT role, COUNT(*) FROM public.users WHERE username IN (
--   'admin_portal','manager_alif','manager_bima','manager_cahya',
--   'submitter_case_01','submitter_case_02','submitter_case_03',
--   'submitter_case_04','submitter_case_05','submitter_case_06'
-- ) GROUP BY role ORDER BY role;
--
-- SELECT account_sf_id, COUNT(*) AS total_contacts
-- FROM public.contact
-- WHERE contact_sf_id IN (
--   '003VG00000MGRC001','003VG00000MGRC002','003VG00000MGRC003',
--   '003VG00000SUBC001','003VG00000SUBC002','003VG00000SUBC003',
--   '003VG00000SUBC004','003VG00000SUBC005','003VG00000SUBC006'
-- )
-- GROUP BY account_sf_id
-- ORDER BY account_sf_id;
--
-- SELECT contact_sf_id, COUNT(*) AS total_cases
-- FROM public."case"
-- WHERE contact_sf_id IN (
--   '003VG00000SUBC001','003VG00000SUBC002','003VG00000SUBC003',
--   '003VG00000SUBC004','003VG00000SUBC005','003VG00000SUBC006'
-- )
-- GROUP BY contact_sf_id
-- ORDER BY contact_sf_id;
