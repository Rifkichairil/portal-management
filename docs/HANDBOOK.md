# Portal Management System — Handover Document

## 1. System Overview

Portal Management adalah sistem manajemen case yang terintegrasi dengan **Salesforce**. Sistem ini memungkinkan pengguna untuk mengelola account, contact, dan case dengan role-based access control.

**Fungsi utama:**
- Manajemen Account (CRUD + sync dari Salesforce)
- Manajemen Contact (CRUD + sync ke Salesforce)
- Manajemen Case (view, create, comment, attachment, sync dari Salesforce)
- Integrasi dua arah dengan Salesforce via REST API
- Role-based access: **Admin**, **Manager**, **Submitter**

---

## 2. Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js (App Router) |
| Bahasa | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (custom, bcrypt) |
| UI Library | Tailwind CSS + Lucide React |
| Spreadsheet | SheetJS (xlsx) |
| Salesforce | OAuth 2.0 Client Credentials + Apex REST |

---

## 3. Role Access & Permission

Tiga role dengan hierarki:

| Role | Level | Deskripsi |
|------|-------|-----------|
| **admin** | Tertinggi | Akses penuh ke semua menu |
| **manager** | Menengah | Terbatas pada account & contact miliknya |
| **submittercase** | Terendah | Hanya bisa melihat & membuat case miliknya |

### Admin
- ✅ Melihat semua account, contact, case
- ✅ Create / Edit account & contact
- ✅ Sync account dari Salesforce
- ✅ Sync cases dari Salesforce (by account + date range)
- ✅ Melihat error log
- ✅ Mengatur settings (Salesforce credentials)
- ✅ Upload attachment ke case

### Manager
- ✅ Melihat account & contact miliknya
- ✅ Melihat case dari contact di bawah account-nya
- ✅ Create case baru
- ❌ Tidak bisa lihat account/contact perusahaan lain
- ❌ Tidak bisa create account/contact
- ❌ Tidak bisa akses settings & error log
- ❌ Tidak bisa sync dari Salesforce

### Submitter
- ✅ Membuat case baru
- ✅ Melihat case miliknya sendiri
- ✅ Menambahkan komentar & attachment ke case-nya
- ❌ Tidak bisa lihat case pengguna lain
- ❌ Tidak bisa akses account, contact, settings, error log

---

## 4. Database Schema

### Table: `users`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | Auto-generated |
| email | TEXT UNIQUE | |
| password | TEXT | bcrypt hash |
| role | TEXT | `admin`, `manager`, `submittercase` |
| username | TEXT UNIQUE | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-update trigger |
| deleted_at | TIMESTAMPTZ | Soft delete |

### Table: `account`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | Auto-generated |
| account_sf_id | TEXT UNIQUE | Salesforce Account ID (001...) |
| name | TEXT | Nama perusahaan |
| phone | TEXT | |
| email | TEXT | |
| website | TEXT | |
| billingStreet | TEXT | |
| billingCity | TEXT | |
| billingState | TEXT | |
| billingCountry | TEXT | |
| billingPostalCode | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-update trigger |
| deleted_at | TIMESTAMPTZ | Soft delete |

### Table: `contact`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | Auto-generated |
| user_id | UUID FK → users.id | |
| contact_sf_id | TEXT UNIQUE | Salesforce Contact ID (003...) |
| account_id | UUID FK → account.id | |
| firstName | TEXT | |
| lastName | TEXT | |
| fullName | TEXT | |
| title | TEXT | |
| phone | TEXT | |
| mobile | TEXT | |
| department | TEXT | |
| password | TEXT | Portal login password |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-update trigger |
| deleted_at | TIMESTAMPTZ | Soft delete |

### Table: `case`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | Auto-generated |
| case_sf_id | TEXT UNIQUE | Salesforce Case ID (500...) |
| contact_sf_id | TEXT FK → contact.contact_sf_id | |
| caseNumber | TEXT UNIQUE | Nomor case |
| subject | TEXT | Judul case |
| description | TEXT | |
| status | TEXT | Default: "New" |
| severity | TEXT | Dari Salesforce: "Severity 1/2/3" |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-update trigger |
| deleted_at | TIMESTAMPTZ | Soft delete |

### Table: `settings`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | |
| client_id | TEXT | Salesforce Client ID |
| client_secret | TEXT | Salesforce Client Secret |
| base_url | TEXT | Salesforce Instance URL |
| salesforce_enabled | BOOLEAN | Toggle SF integration |
| agent_force_client_id | TEXT | |
| agent_force_client_secret | TEXT | |

### Table: `error_log`
| Column | Type | Keterangan |
|--------|------|------------|
| id | UUID PK | |
| error_type | TEXT | |
| error_message | TEXT | |
| error_details | TEXT | |
| case_id | UUID FK | |
| user_id | UUID FK | |
| created_at | TIMESTAMPTZ | |

---

## 5. Features & Menu

| Menu | Path | Admin | Manager | Submitter |
|------|------|-------|---------|-----------|
| Dashboard | `/dashboard` | ✅ | ✅ | ✅ |
| Account | `/dashboard/account` | ✅ | ❌ | ❌ |
| Contact | `/dashboard/contact` | ✅ | ✅ (terbatas) | ❌ |
| Case | `/dashboard/case` | ✅ | ✅ | ✅ |
| Case Detail | `/dashboard/case/[id]` | ✅ | ✅ | ✅ |
| Settings | `/dashboard/settings` | ✅ | ❌ | ❌ |
| Error Log | `/dashboard/error-log` | ✅ | ❌ | ❌ |

### Account Management
- Lihat daftar account (search, filter by city, pagination)
- **New Account** — Create account manual (admin only)
- **Sync from Salesforce** — Import account by Salesforce ID (admin only)
  - Fetch data dari Salesforce → review → save ke database

### Contact Management
- Lihat daftar contact (search, filter by account)
- **New Contact** — Create contact baru (admin only)
  - Auto-create user + sync ke Salesforce jika enabled
  - Validasi password: min 8 char, huruf besar, huruf kecil, angka

### Case Management
- Lihat daftar case dengan filter: status, contact, date range, search
- Statistik: jumlah case per status
- **New Case** — Buat case baru (manager/submitter only)
  - Auto-sync ke Salesforce jika enabled
- **Sync from Salesforce** — Import cases by account + date range (admin only)
  - Hanya insert case yang belum ada di database
  - Auto-skip duplicate by case_sf_id

### Case Detail
- Case details (category, origin, status, severity, created date)
- Contact details
- **Activity Tab** — History perubahan case dari Salesforce
- **Comments Tab** — Lihat & tambah komentar (sync ke Salesforce)
- **Attachments Tab** — Upload & preview file (image, PDF, CSV, Excel)
  - Download file
  - Preview image/PDF langsung di browser
  - Preview CSV/Excel dalam bentuk tabel

### Settings
- Konfigurasi Salesforce: Client ID, Client Secret, Base URL
- Toggle Salesforce integration on/off
- Agent Force credentials

### Error Log
- Melihat log error dari integrasi Salesforce

---

## 6. API Endpoints

### Authentication
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Get current user |

### Account
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/account` | POST | Create account (manual) |
| `/api/account/sync-salesforce` | POST | Insert account from Salesforce sync |
| `/api/salesforce/account` | GET | Fetch account dari Salesforce by ID |

### Contact
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/contact` | POST | Create contact + user |

### Case
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/cases` | POST | Create case |
| `/api/salesforce/case/detail` | GET | Fetch case detail dari Salesforce |
| `/api/salesforce/case/sync` | GET | Fetch cases by account + date range |
| `/api/salesforce/case/sync` | POST | Bulk insert cases ke database |
| `/api/salesforce/case/[type]` | GET | Get activity/comments/attachments |
| `/api/salesforce/case/[type]` | POST | Post comments or upload attachments |
| `/api/salesforce/attachment-preview` | GET | Proxy preview file dari Salesforce |

### System
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/settings` | GET/PUT | Salesforce settings |
| `/api/error-log` | GET | Error logs |
| `/api/webhooks/salesforce/case/status` | POST | Webhook status update |
| `/api/public/case/status` | GET | Public case status |

---

## 7. Salesforce Integration

### 7.1 Arsitektur Integrasi

```
┌─────────────────────────────────────────────────────────┐
│                   Portal Management (Next.js)            │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Frontend │──▶│ API Route    │──▶│ Salesforce       │  │
│  │ (React)  │   │ (Next.js)    │   │ OAuth2 + Apex    │  │
│  └──────────┘   └──────┬───────┘   └────────┬────────┘  │
│                        │                     │           │
│                        ▼                     │           │
│                 ┌──────────────┐             │           │
│                 │  Supabase    │◀────────────┘           │
│                 │  (PostgreSQL)│                         │
│                 └──────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

**Pola komunikasi:**
- Portal bertindak sebagai **bridge** antara user dan Salesforce
- Data disimpan di **Supabase** sebagai source of truth lokal
- **Salesforce** adalah source of truth utama (master data)
- Autentikasi via **OAuth 2.0 Client Credentials** (server-to-server)

### 7.2 OAuth2 Client Credentials Flow

Ini adalah autentikasi server-to-server (tanpa user interaction):

```
┌──────────┐                    ┌──────────────┐
│  Portal  │                    │  Salesforce   │
│  API     │                    │  Auth Server  │
└────┬─────┘                    └──────┬────────┘
     │                                │
     │ POST /services/oauth2/token    │
     │ grant_type=client_credentials  │
     │ client_id=xxx                  │
     │ client_secret=xxx              │
     ├───────────────────────────────▶│
     │                                │
     │ { access_token: "..." }        │
     │◀───────────────────────────────┤
     │                                │
     │ GET /services/apexrest/...     │
     │ Authorization: Bearer token    │
     ├───────────────────────────────▶│
     │                                │
     │ { status_code: 200, data: ... }│
     │◀───────────────────────────────┤
     │                                │
```

**Cara setup di Salesforce:**
1. Login ke Salesforce sebagai Admin
2. **Setup → App Manager → New Connected App**
3. Isi:
   - Connected App Name: `Portal Management`
   - Enable OAuth Settings
   - Callback URL: `https://localhost:3000` (atau URL portal)
   - Selected OAuth Scopes: `Access to unique user identifier (openid)`, `Perform API requests on your behalf (api)`
   - Require Secret for Web Server Flow: **Yes**
   - **Enable Client Credentials Flow**
4. Save → dapatkan **Consumer Key (Client ID)** dan **Consumer Secret**
5. Masukkan ke Portal di menu **Settings**

**Persyaratan di Salesforce:**
- License: Salesforce Unlimited / Enterprise / Developer Edition
- Fitur: **Client Credentials Flow** harus diaktifkan
- User: **System Administrator** atau user dengan akses ke Apex REST
- Apex class harus di-expose sebagai REST resource dengan `@RestResource(urlMapping='/portal/*')`

### 7.3 Data Flow per Fitur

#### Account: Create (Portal → Salesforce)
```
Admin create account manual
  → Insert ke Supabase (account_sf_id = null)
  → Jika SF enabled:
      → OAuth → POST /services/apexrest/portal/account
      → Response: { status_code: 201, data: [{ accountId: "001..." }] }
      → Update account_sf_id di Supabase
  → Jika SF disabled: simpan lokal saja
```

#### Account: Sync (Salesforce → Portal)
```
Admin klik "Sync from Salesforce"
  → Input Salesforce Account ID
  → OAuth → GET /services/apexrest/portal/account?id=001...
  → Response: { status_code: 200, data: [{ name, phone, email, ... }] }
  → Review data → konfirmasi → POST /api/account/sync-salesforce
  → Insert ke Supabase (cek duplicate by account_sf_id)
```

#### Contact: Create (Portal → Salesforce)
```
Admin create contact + user
  → Insert user ke Supabase → insert contact (contact_sf_id = null)
  → Jika SF enabled:
      → OAuth → POST /services/apexrest/portal/contact
      → Payload: { firstName, lastName, accountId, password, ... }
      → Response: { status_code: 201, data: [{ contactId: "003..." }] }
      → Update contact_sf_id di Supabase
  → Jika gagal: rollback (hapus user & contact dari Supabase)
```

#### Case: Create (Portal → Salesforce)
```
Submitter/Manager buat case baru
  → Insert ke Supabase (case_sf_id = null, caseNumber = generate)
  → Jika SF enabled:
      → OAuth → POST /services/apexrest/portal/case
      → Payload: { subject, description, origin, images, submitterBy }
      → Response: { status_code: 200, data: [{ caseId, caseNumber }] }
      → Update case_sf_id & caseNumber di Supabase
  → Jika gagal: rollback (hapus case dari Supabase)
```

#### Case: Sync Bulk (Salesforce → Portal)
```
Admin klik "Sync from Salesforce"
  → Pilih account dari dropdown + date range
  → OAuth → GET /services/apexrest/portal/case?accountId=...&startDate=...&endDate=...
  → Response: { status_code: 200, data: [{ caseId, caseNumber, subject, ... }] }
  → Filter: cek case_sf_id yang sudah ada di Supabase
  → Tampilkan review: total / new / skipped
  → Konfirmasi import → POST bulk insert hanya case baru
```

#### Case Detail: View dengan Data Salesforce
```
User buka halaman detail case
  → GET case dari Supabase (by caseNumber atau case_sf_id)
  → Fetch data real-time dari Salesforce:
      → OAuth → GET /services/apexrest/portal/case?id=500...
      → Response: { status_code: 200, data: [{ category, severity, status, ... }] }
  → Save severity ke Supabase (untuk keperluan list)
  → Tampilkan data Salesforce + komentar & attachment lokal
```

#### Comments: Sync (Portal ↔ Salesforce)
```
Lihat komentar:
  → OAuth → GET /services/apexrest/portal/case/comments?id=500...
  → Tampilkan di UI

Tambah komentar:
  → OAuth → POST /services/apexrest/portal/case/comments?id=500...
  → Payload: { commentBody, commentBodyRichtext }
  → Refresh komentar setelah sukses
```

#### Attachments: Upload & Preview
```
Upload:
  → Pilih file → base64 encode → POST /services/apexrest/portal/case/images?id=500...
  → Payload: { images: [{ fileName, base64Data }] }

Preview (image/PDF):
  → versionData (base64) dari Salesforce → decode → tampilkan

Preview (CSV/Excel):
  → versionData (base64) → decode → parse dengan SheetJS → tampilkan tabel
  → Catatan: Salesforce kadang return URL-safe base64 (- dan _), sudah ditangani otomatis

Download:
  → versionData → trigger download langsung
  → Atau proxy via /api/salesforce/attachment-preview
```

### 7.4 Mapping Field Salesforce ke Database

#### Account
| Salesforce Field | Supabase Column | Note |
|------------------|-----------------|------|
| `accountId` | `account_sf_id` | |
| `name` | `name` | |
| `phone` | `phone` | |
| `email` | `email` | |
| `website` | `website` | |
| `billingStreet` | `billingStreet` | |
| `billingCity` | `billingCity` | |
| `billingState` | `billingState` | |
| `billingCountry` | `billingCountry` | |
| `billingPostalCode` | `billingPostalCode` | |

#### Contact
| Salesforce Field | Supabase Column | Note |
|------------------|-----------------|------|
| `contactId` | `contact_sf_id` | |
| `firstName` | `firstName` | |
| `lastName` | `lastName` | |
| `fullName` | `fullName` | Auto-combine |
| `phone` | `phone` | |
| `email` | - | Disimpan di users.email |
| `title` | `title` | |
| `department` | `department` | |

#### Case
| Salesforce Field | Supabase Column | Note |
|------------------|-----------------|------|
| `caseId` | `case_sf_id` | |
| `submitterBy` / `contactId` | `contact_sf_id` | Diambil dari mana saja yg terisi |
| `caseNumber` | `caseNumber` | |
| `subject` | `subject` | |
| `description` | `description` | |
| `status` | `status` | |
| `severity` | `severity` | |
| `category` | - | Tidak disimpan lokal |
| `subCategory` | - | Tidak disimpan lokal |
| `origin` | - | Tidak disimpan lokal |
| `resolution` | - | Tidak disimpan lokal |

### 7.5 Salesforce Apex REST Endpoints

Berikut endpoint yang harus tersedia **di sisi Salesforce** (Apex REST):

| Endpoint | Method | Fungsi | Request / Response |
|----------|--------|--------|-------------------|
| `/services/apexrest/portal/account?id={id}` | GET | Get detail account | → `{ status_code: 200, data: [{ accountId, name, phone, ... }] }` |
| `/services/apexrest/portal/account` | POST | Create account | Body: `{ name, phone, email, ... }` → `{ status_code: 201, data: [{ accountId }] }` |
| `/services/apexrest/portal/contact` | POST | Create contact | Body: `{ firstName, lastName, accountId, password, ... }` → `{ status_code: 201, data: [{ contactId }] }` |
| `/services/apexrest/portal/case?id={id}` | GET | Get case detail | → `{ status_code: 200, data: [{ caseId, caseNumber, subject, status, severity, ... }] }` |
| `/services/apexrest/portal/case` | POST | Create case | Body: `{ subject, description, origin, images, submitterBy }` → `{ status_code: 200, data: [{ caseId, caseNumber }] }` |
| `/services/apexrest/portal/case?accountId={id}&startDate=...&endDate=...` | GET | Get cases by account + range | → `{ status_code: 200, data: [{ caseId, caseNumber, subject, status, ... }] }` |
| `/services/apexrest/portal/case/histories?id={id}` | GET | Get field history | → `{ data: [{ field, oldValue, newValue, createdByName, createdAt }] }` |
| `/services/apexrest/portal/case/comments?id={id}` | GET | Get comments | → `{ data: [{ commentBody, createdByName, createdAt }] }` |
| `/services/apexrest/portal/case/comments?id={id}` | POST | Post comment | Body: `{ commentBody, commentBodyRichtext }` → `{ status_code: 201 }` |
| `/services/apexrest/portal/case/images?id={id}` | GET | Get attachments | → `{ data: [{ name, versionData, fileType, ... }] }` |
| `/services/apexrest/portal/case/images?id={id}` | POST | Upload attachments | Body: `{ images: [{ fileName, base64Data }] }` → `{ status_code: 201 }` |

### 7.6 Response Format (Apex Standard)

Semua endpoint Apex REST harus mengikuti format response standar:

**Sukses:**
```json
{
  "status_code": 200,
  "message": "Case berhasil ditemukan",
  "data": [
    {
      "caseId": "500VG00000xPa7zYAC",
      "caseNumber": "00010515",
      "subject": "Testing Case",
      "status": "New",
      "severity": "Severity 3",
      "description": "Testing Case",
      "origin": "Web",
      "category": "Support",
      "subCategory": "Data Migration",
      "submitterBy": "003VG00001VbW6lYAF",
      "resolution": null
    }
  ]
}
```

**Error:**
```json
{
  "status_code": 400,
  "message": "Error message"
}
```

### 7.7 Error Handling Strategy

```
Salesforce API Error
  → Portal API Route menangkap error
  → Log ke table error_log (dengan type + detail)
  → Return error code ke frontend (SF-xxx / DB-xxx / SCS-xxx)
  → Frontend menampilkan pesan user-friendly
```

**Error types yang di-log:**
- `SALESFORCE_CONFIG` — Kredensial tidak lengkap
- `SALESFORCE_AUTH` — Gagal OAuth
- `SALESFORCE_ACCOUNT_CREATE` — Gagal create account
- `SALESFORCE_CONTACT_CREATE` — Gagal create contact
- `SALESFORCE_CASE_CREATE` — Gagal create case
- `SALESFORCE_SYNC_SUCCESS` — Sukses sync
- `SUPABASE_UPDATE` — Gagal update setelah sync
- `SALESFORCE_RESPONSE` — Response tidak sesuai format

### 7.8 Keamanan

- **OAuth token** tidak disimpan di database, hanya di memory runtime
- **Session token** (JWT) disimpan di cookie HTTP-only
- Setiap request API dicek role user:
  - Sync dari Salesforce → **Admin only**
  - Create account/contact → **Admin only**
  - Create case → **Manager / Submitter only**
  - View case → **Hanya case milik sendiri (submitter)** atau **case di bawah account (manager)**
- **Rollback** otomatis jika sync Salesforce gagal:
  - Data dihapus dari Supabase jika gagal create di Salesforce
- **Duplicate check** sebelum insert sync data (by SF ID)

---

## 8. Setup & Installation

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-secret-key-min-32-characters
```

### Install & Run
```bash
npm install
npm run dev          # Development :3000
npm run build        # Production build
npm start            # Production server
```

### Database Migration
```bash
node migrate.js
```

Atau jalankan SQL di **Supabase SQL Editor**:
```sql
-- schema.sql (sesuaikan urutan tabel)
```

### Salesforce Configuration
1. Login ke **Settings** → isi:
   - Client ID
   - Client Secret
   - Base URL (instance URL, tanpa `/services/...`)
2. Toggle **Salesforce Enabled** = ON

---

## 9. Key Files & Structure

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── account/            # Account CRUD
│   │   ├── auth/               # Login/logout/me
│   │   ├── cases/              # Case CRUD
│   │   ├── contact/            # Contact CRUD
│   │   ├── settings/           # Salesforce settings
│   │   ├── error-log/          # Error logs
│   │   ├── webhooks/           # Salesforce webhook
│   │   ├── public/             # Public endpoint
│   │   └── salesforce/         # Salesforce integration
│   │       ├── account/        # Fetch account
│   │       ├── case/           # Case detail, sync
│   │       └── attachment-preview/
│   └── dashboard/
│       ├── account/            # Account page
│       ├── contact/            # Contact page
│       ├── case/               # Case list & detail
│       ├── settings/           # Settings page
│       └── error-log/          # Error log page
├── components/                 # UI Components
│   ├── ui/                     # Base UI (button, input, etc)
│   ├── new-account-modal.tsx
│   ├── new-contact-modal.tsx
│   ├── import-salesforce-account-modal.tsx
│   └── import-salesforce-case-modal.tsx
└── lib/
    ├── supabase.ts             # Supabase client
    ├── user-context.tsx        # User context provider
    ├── auth.ts                 # JWT verification
    └── password-validator.ts   # Password rules
```

---

## 10. Sync Workflows

### Account: Sync from Salesforce
```
[Sync from Salesforce] → Input SF ID → GET /api/salesforce/account
  → Return data → Review → Save → POST /api/account/sync-salesforce
  → Insert ke account table
```

### Case: Sync from Salesforce (Bulk)
```
[Sync from Salesforce] → Pilih account + date range
  → GET /api/salesforce/case/sync?accountId=...&startDate=...&endDate=...
  → Salesforce return list cases → Filter duplicate by case_sf_id
  → Return: { total, new, skipped, newCases, skippedCases }
  → Review → Import → POST /api/salesforce/case/sync (dengan array cases)
  → Bulk insert hanya yg belum ada
```

### Case: Create New
```
Submitter/Manager buat case → POST /api/cases
  → Insert ke Supabase → (jika SF enabled) → POST SF Apex
  → Update case_sf_id dari response Salesforce
```

### Case Detail: View
```
Buka case → GET case dari Supabase
  → Fetch detail dari Salesforce: GET /api/salesforce/case/detail
  → Update severity di Supabase untuk keperluan list
  → Tampilkan data Salesforce + data lokal
```

---

## 11. Password Requirements

Untuk create contact (admin only):
- ✅ Minimal 8 karakter
- ✅ Minimal 1 huruf kecil (a-z)
- ✅ Minimal 1 huruf besar (A-Z)
- ✅ Minimal 1 angka (0-9)

---

## 12. Maintenance Notes

### Backup
- Database: Export dari Supabase Dashboard
- Environment variables: Backup `.env.local`

### Monitoring
- Error log tersimpan di table `error_log`
- Bisa dilihat di menu **Error Log** (admin only)

### Common Issues

| Issue | Solution |
|-------|----------|
| "SF credentials not configured" | Isi settings di menu Settings |
| OAuth failed | Check Client ID / Secret / Base URL |
| Attachment preview error (Excel) | URL-safe base64 handling sudah otomatis |
| Case sync duplicate | Auto-skip by case_sf_id |
| Password validation error | Pastikan password sesuai requirements |

---

*Document generated: 2026-07-10*
*For questions or handover, contact the development team.*
