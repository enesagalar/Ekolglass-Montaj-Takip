-- ============================================================
--  Ekolglass Cam Montaj Takip — PostgreSQL Veritabanı Şeması
--  Bu dosya docker-compose ile PostgreSQL ilk başladığında
--  otomatik çalışır.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Kullanıcılar (kendi auth sistemimiz)
CREATE TABLE IF NOT EXISTS app_users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'field', 'customer', 'accounting')),
    active        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cam stok tablosu
CREATE TABLE IF NOT EXISTS glass_stock (
    id         VARCHAR(20) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(100) NOT NULL,
    suffix     VARCHAR(20) NOT NULL,
    stock      INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sarf malzeme tablosu
CREATE TABLE IF NOT EXISTS consumables (
    id         VARCHAR(20) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    unit       VARCHAR(50) NOT NULL DEFAULT 'adet',
    stock      DECIMAL(10,2) NOT NULL DEFAULT 0,
    category   VARCHAR(50) NOT NULL DEFAULT 'other',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Montaj kayıtları
CREATE TABLE IF NOT EXISTS assemblies (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_model               VARCHAR(100),
    vin                         VARCHAR(100),
    vin_last5                   VARCHAR(10),
    glass_product_ids           JSONB NOT NULL DEFAULT '[]',
    assigned_to                 VARCHAR(255),
    assigned_to_user_id         UUID REFERENCES app_users(id) ON DELETE SET NULL,
    approval_doc_photo_uri      TEXT,
    vin_photo_uri               TEXT,
    status                      VARCHAR(50) NOT NULL DEFAULT 'pending',
    status_timestamps           JSONB NOT NULL DEFAULT '{}',
    water_test_result           VARCHAR(20),
    water_test_customer_approval VARCHAR(20),
    installation_completed_at   TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    notes                       TEXT NOT NULL DEFAULT '',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fotoğraflar
CREATE TABLE IF NOT EXISTS photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
    uri         TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    angle       VARCHAR(50),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kusur/hata kayıtları
CREATE TABLE IF NOT EXISTS defects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity    VARCHAR(20) NOT NULL DEFAULT 'low',
    resolved    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

-- Aktivite logu
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,
    user_id     UUID,
    user_name   VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cam talep tablosu
CREATE TABLE IF NOT EXISTS glass_requests (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requested_by       UUID REFERENCES app_users(id) ON DELETE SET NULL,
    requested_by_name  VARCHAR(255) NOT NULL DEFAULT '',
    items              JSONB NOT NULL DEFAULT '[]',
    requested_date     DATE NOT NULL,
    notes              TEXT NOT NULL DEFAULT '',
    status             VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_assemblies_status ON assemblies(status);
CREATE INDEX IF NOT EXISTS idx_assemblies_assigned ON assemblies(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_updated ON assemblies(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_assembly ON photos(assembly_id);
CREATE INDEX IF NOT EXISTS idx_defects_assembly ON defects(assembly_id);
CREATE INDEX IF NOT EXISTS idx_activity_assembly ON activity_log(assembly_id);

-- ============================================================
--  Başlangıç verileri
-- ============================================================

-- Cam stok ürünleri (8 pozisyon × 4 marka = 32 ürün)
INSERT INTO glass_stock (id, name, code, suffix, stock, sort_order) VALUES
    ('g1', 'SAĞ 1. YAN CAM',   'DCT-IS R1', 'R1', 0, 1),
    ('g2', 'SAĞ 2. YAN CAM',   'DCT-IS R2', 'R2', 0, 2),
    ('g3', 'SAĞ 3. YAN CAM',   'DCT-IS R3', 'R3', 0, 3),
    ('g4', 'SOL 1. YAN CAM',   'DCT-IS L1', 'L1', 0, 4),
    ('g5', 'SOL 2. YAN CAM',   'DCT-IS L2', 'L2', 0, 5),
    ('g6', 'SOL 3. YAN CAM',   'DCT-IS L3', 'L3', 0, 6),
    ('g7', 'SAĞ ARKA KAPAK',   'DCT-IS B1', 'B1', 0, 7),
    ('g8', 'SOL ARKA KAPAK',   'DCT-IS B2', 'B2', 0, 8)
ON CONFLICT (id) DO NOTHING;

-- Sarf malzemeler
INSERT INTO consumables (id, name, unit, stock, category) VALUES
    ('c1', 'Silikon',        'adet',  0, 'chemical'),
    ('c2', 'Primer',         'litre', 0, 'chemical'),
    ('c3', 'Köpük',          'adet',  0, 'chemical'),
    ('c4', 'Bant',           'metre', 0, 'tool'),
    ('c5', 'Temizlik Bezi',  'adet',  0, 'tool'),
    ('c6', 'Koruyucu Örtü',  'adet',  0, 'other')
ON CONFLICT (id) DO NOTHING;

-- Başlangıç kullanıcıları
-- admin / admin123
-- mehmet, ali, hasan, murat / 1234
-- isri / isri2024
INSERT INTO app_users (username, password_hash, name, role) VALUES
    ('admin',     '$2b$12$TrW0kAHYFUvlmd1go6HrLuOCpaIQpWKsKFI6oGbYM602IpSTt0HuO', 'Sistem Admin',  'admin'),
    ('isri',      '$2b$12$tEu1SAFSs85LcF4swRAIKOL7RMls5ZhfYH14TSLl4s7azpCtb49QW', 'ISRI Müşteri',  'customer'),
    ('mehmet',    '$2b$12$.8YmY/EbkffwfFVUZMBSoOJdEg8az9NPv74Zb.y6QaxjAm4TIjgee', 'Mehmet',        'field'),
    ('ali',       '$2b$12$.8YmY/EbkffwfFVUZMBSoOJdEg8az9NPv74Zb.y6QaxjAm4TIjgee', 'Ali',           'field'),
    ('hasan',     '$2b$12$.8YmY/EbkffwfFVUZMBSoOJdEg8az9NPv74Zb.y6QaxjAm4TIjgee', 'Hasan',         'field'),
    ('murat',     '$2b$12$.8YmY/EbkffwfFVUZMBSoOJdEg8az9NPv74Zb.y6QaxjAm4TIjgee', 'Murat',         'field'),
    ('muhasebe',  '$2b$12$zlYsEJmWA5HSGYbbHnohcODZ3IkBs9w4AgzoS2hS1R90I/pK1JXVm', 'Muhasebe',      'accounting')
ON CONFLICT (username) DO NOTHING;
