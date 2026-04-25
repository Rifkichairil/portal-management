# Supabase Core Schema Design (Users, Cases, Accounts, Contacts)

Date: 2026-04-25

## Goals
- Create core tables for login/profile and CRM entities: `users`, `cases`, `accounts`, `contacts`.
- Use PostgreSQL snake_case naming.
- Use UUID primary keys.
- Use common timestamps: `created_at`, `updated_at`, `deleted_at`.
- Use Supabase Auth for credentials (no password column in `public.users`).

## Scope
In scope:
- DDL for 4 tables in `public` schema.
- Primary keys, foreign keys, unique constraints, and practical indexes.

Out of scope:
- RLS policies.
- Trigger/function for auto-updating `updated_at`.
- Seed data and API endpoints.

## Design Decisions
1. **Authentication source**: Supabase Auth (`auth.users`) is the source of truth for login/password.
2. **Public user profile table**: `public.users` stores app profile data and references `auth.users(id)`.
3. **Contact-user relation**: `public.contacts.user_id` references `auth.users(id)` directly.
4. **External IDs**: Salesforce IDs (`*_sf_id`) are unique business keys.
5. **Soft delete**: `deleted_at` is nullable on all tables.

## Table Definitions

### 1) `public.users`
- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null unique`
- `role text not null`
- `username text not null unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 2) `public.cases`
- `id uuid primary key default gen_random_uuid()`
- `case_sf_id text not null unique`
- `case_number text not null`
- `subject text not null`
- `status text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 3) `public.accounts`
- `id uuid primary key default gen_random_uuid()`
- `account_sf_id text not null unique`
- `name text not null`
- `phone text null`
- `email text null`
- `website text null`
- `billing_street text null`
- `billing_city text null`
- `billing_state text null`
- `billing_country text null`
- `billing_postal_code text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 4) `public.contacts`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `contact_sf_id text not null unique`
- `account_sf_id text null references public.accounts(account_sf_id) on update cascade on delete set null`
- `first_name text not null`
- `last_name text not null`
- `full_name text not null`
- `title text null`
- `phone text null`
- `mobile text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

## Constraints & Indexes
Required:
- Unique: `users.email`, `users.username`, `cases.case_sf_id`, `accounts.account_sf_id`, `contacts.contact_sf_id`.
- FK: `contacts.user_id -> auth.users(id)`.
- FK: `contacts.account_sf_id -> accounts.account_sf_id`.

Recommended indexes:
- `cases(status)`
- `contacts(user_id)`
- `contacts(account_sf_id)`
- `deleted_at` index per table if soft-delete filtering is frequent.

## Migration Notes
- Ensure `gen_random_uuid()` is available (`pgcrypto` extension).
- Create `accounts` before `contacts` to satisfy FK dependency.
- Do not create `password` in `public.users` because credentials are managed in `auth.users`.

## Verification Checklist
1. Migration applies without error.
2. Inserting into `contacts` with nonexistent `user_id` fails (FK enforced).
3. Duplicate `*_sf_id` inserts fail (unique enforced).
4. Deleting a user in `auth.users` cascades to `public.users` and dependent `contacts` rows.
5. All tables contain `created_at`, `updated_at`, `deleted_at`.
