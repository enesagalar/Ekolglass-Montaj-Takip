-- ============================================================
-- Cam Montaj Takip — Initial Schema
-- Run this in Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- app_users
-- ============================================================
create table if not exists app_users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  username      text unique not null,
  email         text unique not null,
  name          text not null,
  role          text not null check (role in ('admin', 'field', 'customer')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- glass_stock
-- ============================================================
create table if not exists glass_stock (
  id          text primary key,
  name        text not null,
  code        text not null,
  suffix      text not null,
  stock       integer not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into glass_stock (id, name, code, suffix, stock, sort_order) values
  ('g1', 'SAĞ 1. YAN CAM', 'DCT-IS R1', 'R1', 10, 1),
  ('g2', 'SAĞ 2. YAN CAM', 'DCT-IS R2', 'R2', 10, 2),
  ('g3', 'SAĞ 3. YAN CAM', 'DCT-IS R3', 'R3', 10, 3),
  ('g4', 'SOL 1. YAN CAM', 'DCT-IS L1', 'L1', 10, 4),
  ('g5', 'SOL 2. YAN CAM', 'DCT-IS L2', 'L2', 10, 5),
  ('g6', 'SOL 3. YAN CAM', 'DCT-IS L3', 'L3', 10, 6),
  ('g7', 'SAĞ ARKA KAPAK', 'DCT-IS B1', 'B1', 10, 7),
  ('g8', 'SOL ARKA KAPAK', 'DCT-IS B2', 'B2', 10, 8)
on conflict (id) do nothing;

-- ============================================================
-- consumables
-- ============================================================
create table if not exists consumables (
  id          text primary key,
  name        text not null,
  unit        text not null,
  stock       integer not null default 0,
  category    text not null check (category in ('chemical', 'tool', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into consumables (id, name, unit, stock, category) values
  ('c1', 'Silikon',         'adet',  20, 'chemical'),
  ('c2', 'Primer',          'adet',  20, 'chemical'),
  ('c3', 'Köpük',           'adet',  20, 'chemical'),
  ('c4', 'Bant',            'metre', 20, 'tool'),
  ('c5', 'Temizlik Bezi',   'adet',  20, 'tool'),
  ('c6', 'Koruyucu Örtü',   'adet',  20, 'other')
on conflict (id) do nothing;

-- ============================================================
-- assemblies
-- ============================================================
create table if not exists assemblies (
  id                              uuid primary key default gen_random_uuid(),
  vehicle_model                   text not null default 'fiat-ducato',
  vin                             text not null,
  vin_last5                       text,
  approval_doc_photo_uri          text,
  vin_photo_uri                   text,
  glass_product_ids               text[] not null default '{}',
  assigned_to                     text not null,
  assigned_to_user_id             uuid references app_users(id) on delete set null,
  status                          text not null default 'pending'
                                    check (status in ('pending','cutting','cutting_done','installation','installation_done','water_test','water_test_failed','completed')),
  status_timestamps               jsonb not null default '{}',
  water_test_result               text check (water_test_result in ('passed','failed',null)),
  water_test_customer_approval    text check (water_test_customer_approval in ('pending','approved','rejected',null)),
  installation_completed_at       timestamptz,
  completed_at                    timestamptz,
  notes                           text not null default '',
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- ============================================================
-- photos
-- ============================================================
create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  assembly_id   uuid not null references assemblies(id) on delete cascade,
  uri           text not null,
  type          text not null check (type in ('approval_doc','vin','installation_before','installation_after','water_test','defect','other','cutting_before','cutting_after')),
  angle         text,
  note          text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- defects
-- ============================================================
create table if not exists defects (
  id            uuid primary key default gen_random_uuid(),
  assembly_id   uuid not null references assemblies(id) on delete cascade,
  description   text not null,
  severity      text not null check (severity in ('low','medium','high')),
  resolved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- activity_log
-- ============================================================
create table if not exists activity_log (
  id            uuid primary key default gen_random_uuid(),
  assembly_id   uuid not null references assemblies(id) on delete cascade,
  action        text not null,
  user_id       uuid,
  user_name     text not null default '',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Stored procedure: decrement stock safely
-- ============================================================
create or replace function decrement_stock(product_id text, amount integer)
returns void language sql as $$
  update glass_stock
  set stock = greatest(0, stock - amount),
      updated_at = now()
  where id = product_id;
$$;

-- ============================================================
-- RLS Policies (enable after testing if needed)
-- For now: service role bypasses all RLS
-- ============================================================
-- alter table app_users enable row level security;
-- alter table assemblies enable row level security;
-- alter table photos enable row level security;
-- alter table defects enable row level security;
-- alter table activity_log enable row level security;
-- alter table glass_stock enable row level security;
-- alter table consumables enable row level security;

-- ============================================================
-- Default users (create via Supabase Auth + app_users)
-- Run the seed script separately or use the API's POST /api/users
-- ============================================================
