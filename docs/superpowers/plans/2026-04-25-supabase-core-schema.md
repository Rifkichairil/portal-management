# Supabase Core Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase migration that creates `public.users`, `public.cases`, `public.accounts`, and `public.contacts` with UUID keys, required relationships, uniqueness rules, and shared timestamps.

**Architecture:** Implement one SQL migration file under `supabase/migrations` as the source of truth for schema creation. Keep auth credentials in `auth.users`, mirror only app profile fields in `public.users`, and connect `contacts.user_id` directly to `auth.users(id)` per approved design. Validate migration content with deterministic command-line checks before commit.

**Tech Stack:** Supabase Postgres (SQL migrations), Node.js command-line checks, Git

---

## File Structure and Responsibilities

- Create: `supabase/migrations/20260425103000_create_core_schema.sql`  
  Responsibility: defines extension, tables, constraints, foreign keys, and indexes for the 4-table core schema.
- Modify: none
- Test artifacts: command-line checks using `node -e` against the migration file

### Task 1: Create core schema migration with constraints and indexes (TDD sequence)

**Files:**
- Create: `supabase/migrations/20260425103000_create_core_schema.sql`
- Test: command-only checks against `supabase/migrations/20260425103000_create_core_schema.sql`

- [ ] **Step 1: Write the failing test command**

```bash
node -e "const fs=require('fs');const file='supabase/migrations/20260425103000_create_core_schema.sql';if(!fs.existsSync(file)){console.error('FAIL missing migration file:',file);process.exit(1)}const s=fs.readFileSync(file,'utf8');const required=[/create extension if not exists pgcrypto;/i,/create table if not exists public\.users/i,/references auth\.users\(id\) on delete cascade/i,/create table if not exists public\.cases/i,/case_sf_id text not null unique/i,/case_number text not null/i,/create table if not exists public\.accounts/i,/account_sf_id text not null unique/i,/billing_postal_code text null/i,/create table if not exists public\.contacts/i,/user_id uuid not null references auth\.users\(id\) on delete cascade/i,/account_sf_id text null references public\.accounts\(account_sf_id\) on update cascade on delete set null/i,/contact_sf_id text not null unique/i,/create index if not exists idx_cases_status on public\.cases\(status\);/i,/create index if not exists idx_contacts_user_id on public\.contacts\(user_id\);/i,/create index if not exists idx_contacts_account_sf_id on public\.contacts\(account_sf_id\);/i,/create index if not exists idx_users_deleted_at on public\.users\(deleted_at\);/i,/create index if not exists idx_cases_deleted_at on public\.cases\(deleted_at\);/i,/create index if not exists idx_accounts_deleted_at on public\.accounts\(deleted_at\);/i,/create index if not exists idx_contacts_deleted_at on public\.contacts\(deleted_at\);/i];for(const re of required){if(!re.test(s)){console.error('FAIL missing SQL pattern:',re);process.exit(1)}}const usersBlock=s.match(/create table if not exists public\.users[\s\S]*?\);/i);if(!usersBlock){console.error('FAIL users table block missing');process.exit(1)}if(/\bpassword\b/i.test(usersBlock[0])){console.error('FAIL users table must not contain password column');process.exit(1)}console.log('PASS migration file includes required core schema clauses');"
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run:
```bash
node -e "const fs=require('fs');const file='supabase/migrations/20260425103000_create_core_schema.sql';if(!fs.existsSync(file)){console.error('FAIL missing migration file:',file);process.exit(1)}const s=fs.readFileSync(file,'utf8');const required=[/create extension if not exists pgcrypto;/i,/create table if not exists public\.users/i,/references auth\.users\(id\) on delete cascade/i,/create table if not exists public\.cases/i,/case_sf_id text not null unique/i,/case_number text not null/i,/create table if not exists public\.accounts/i,/account_sf_id text not null unique/i,/billing_postal_code text null/i,/create table if not exists public\.contacts/i,/user_id uuid not null references auth\.users\(id\) on delete cascade/i,/account_sf_id text null references public\.accounts\(account_sf_id\) on update cascade on delete set null/i,/contact_sf_id text not null unique/i,/create index if not exists idx_cases_status on public\.cases\(status\);/i,/create index if not exists idx_contacts_user_id on public\.contacts\(user_id\);/i,/create index if not exists idx_contacts_account_sf_id on public\.contacts\(account_sf_id\);/i,/create index if not exists idx_users_deleted_at on public\.users\(deleted_at\);/i,/create index if not exists idx_cases_deleted_at on public\.cases\(deleted_at\);/i,/create index if not exists idx_accounts_deleted_at on public\.accounts\(deleted_at\);/i,/create index if not exists idx_contacts_deleted_at on public\.contacts\(deleted_at\);/i];for(const re of required){if(!re.test(s)){console.error('FAIL missing SQL pattern:',re);process.exit(1)}}const usersBlock=s.match(/create table if not exists public\.users[\s\S]*?\);/i);if(!usersBlock){console.error('FAIL users table block missing');process.exit(1)}if(/\bpassword\b/i.test(usersBlock[0])){console.error('FAIL users table must not contain password column');process.exit(1)}console.log('PASS migration file includes required core schema clauses');"
```
Expected:
- Command exits non-zero.
- Output contains `FAIL missing migration file`.

- [ ] **Step 3: Write minimal migration SQL to satisfy approved schema**

Create `supabase/migrations/20260425103000_create_core_schema.sql` with:

```sql
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_sf_id text not null unique,
  case_number text not null,
  subject text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_sf_id text not null unique,
  name text not null,
  phone text null,
  email text null,
  website text null,
  billing_street text null,
  billing_city text null,
  billing_state text null,
  billing_country text null,
  billing_postal_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_sf_id text not null unique,
  account_sf_id text null references public.accounts(account_sf_id) on update cascade on delete set null,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  title text null,
  phone text null,
  mobile text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_cases_status on public.cases(status);
create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_contacts_account_sf_id on public.contacts(account_sf_id);

create index if not exists idx_users_deleted_at on public.users(deleted_at);
create index if not exists idx_cases_deleted_at on public.cases(deleted_at);
create index if not exists idx_accounts_deleted_at on public.accounts(deleted_at);
create index if not exists idx_contacts_deleted_at on public.contacts(deleted_at);
```

- [ ] **Step 4: Run test to verify migration content now passes**

Run:
```bash
node -e "const fs=require('fs');const file='supabase/migrations/20260425103000_create_core_schema.sql';if(!fs.existsSync(file)){console.error('FAIL missing migration file:',file);process.exit(1)}const s=fs.readFileSync(file,'utf8');const required=[/create extension if not exists pgcrypto;/i,/create table if not exists public\.users/i,/references auth\.users\(id\) on delete cascade/i,/create table if not exists public\.cases/i,/case_sf_id text not null unique/i,/case_number text not null/i,/create table if not exists public\.accounts/i,/account_sf_id text not null unique/i,/billing_postal_code text null/i,/create table if not exists public\.contacts/i,/user_id uuid not null references auth\.users\(id\) on delete cascade/i,/account_sf_id text null references public\.accounts\(account_sf_id\) on update cascade on delete set null/i,/contact_sf_id text not null unique/i,/create index if not exists idx_cases_status on public\.cases\(status\);/i,/create index if not exists idx_contacts_user_id on public\.contacts\(user_id\);/i,/create index if not exists idx_contacts_account_sf_id on public\.contacts\(account_sf_id\);/i,/create index if not exists idx_users_deleted_at on public\.users\(deleted_at\);/i,/create index if not exists idx_cases_deleted_at on public\.cases\(deleted_at\);/i,/create index if not exists idx_accounts_deleted_at on public\.accounts\(deleted_at\);/i,/create index if not exists idx_contacts_deleted_at on public\.contacts\(deleted_at\);/i];for(const re of required){if(!re.test(s)){console.error('FAIL missing SQL pattern:',re);process.exit(1)}}const usersBlock=s.match(/create table if not exists public\.users[\s\S]*?\);/i);if(!usersBlock){console.error('FAIL users table block missing');process.exit(1)}if(/\bpassword\b/i.test(usersBlock[0])){console.error('FAIL users table must not contain password column');process.exit(1)}const tableCount=(s.match(/create table if not exists public\./gi)||[]).length;if(tableCount!==4){console.error('FAIL expected 4 public tables, got',tableCount);process.exit(1)}console.log('PASS migration file includes required core schema clauses');"
```
Expected:
- Command exits zero.
- Output contains `PASS migration file includes required core schema clauses`.

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/20260425103000_create_core_schema.sql
git commit -m "feat: add supabase core schema migration for users cases accounts contacts"
```

### Task 2: Validate migration against runtime environment (execution checklist)

**Files:**
- Modify: none expected
- Verify: Supabase project schema after applying migration

- [ ] **Step 1: Apply migration in your target Supabase environment**

Run one of these based on your workflow:
```bash
# Local CLI workflow
supabase db push

# OR run the migration SQL in Supabase SQL Editor for your project
```
Expected:
- Migration applies without SQL errors.

- [ ] **Step 2: Verify required tables exist**

Run in Supabase SQL editor:
```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('users', 'cases', 'accounts', 'contacts')
order by table_name;
```
Expected:
- Returns exactly 4 rows: `accounts`, `cases`, `contacts`, `users`.

- [ ] **Step 3: Verify direct auth relation and account relation on contacts**

Run:
```sql
select
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as ref_schema,
  ccu.table_name as ref_table,
  ccu.column_name as ref_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name = 'contacts'
order by kcu.column_name;
```
Expected:
- One FK row for `contacts.user_id -> auth.users.id`.
- One FK row for `contacts.account_sf_id -> public.accounts.account_sf_id`.

- [ ] **Step 4: Verify shared timestamps exist in all four tables**

Run:
```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'cases', 'accounts', 'contacts')
  and column_name in ('created_at', 'updated_at', 'deleted_at')
order by table_name, column_name;
```
Expected:
- Returns 12 rows (3 timestamp columns × 4 tables).

- [ ] **Step 5: Commit only if verification caused intentional repo changes**

```bash
# Only if you intentionally changed tracked files during verification
git add <intentional-files-only>
git commit -m "chore: finalize supabase core schema verification"
```

## Notes for Execution

- Keep `public.users` free of `password` column; credentials remain in `auth.users`.
- Keep naming in snake_case only.
- Keep `contacts.user_id` directly linked to `auth.users(id)` as approved.
- Do not add extra tables, triggers, enums, or RLS in this scope.

## Self-Review (Completed)

- **Spec coverage:** plan includes all 4 tables, approved columns, UUID strategy, timestamps, direct auth relation, and required uniqueness/FK constraints.
- **Placeholder scan:** no TBD/TODO placeholders; each step has concrete commands or SQL.
- **Type consistency:** all references use consistent names (`account_sf_id`, `contact_sf_id`, `user_id`, `deleted_at`) across tasks.
