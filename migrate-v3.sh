#!/bin/bash
# Muhasebe rolü ve fatura tablosu migration
# VPS'de bir kez çalıştırın: bash migrate-v3.sh

set -e

DB_CONTAINER="ekolglass-db"
DB_USER="ekolglass"
DB_NAME="ekolglass"

echo "=== Migrate v3: Muhasebe + Fatura ==="

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- 1. accounting rolünü ekle (role check constraint güncelle)
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin', 'field', 'customer', 'accounting'));

-- 2. Muhasebe kullanıcısı oluştur (yoksa)
INSERT INTO app_users (username, password_hash, name, role)
SELECT 'muhasebe', crypt('muhasebe123', gen_salt('bf')), 'Muhasebe', 'accounting'
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'muhasebe');

-- 3. Faturalar tablosu
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id    UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  notes          TEXT NOT NULL DEFAULT '',
  created_by_name VARCHAR(100) NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_assembly_id_idx ON invoices(assembly_id);

SQL

echo "=== Migration v3 tamamlandi ==="
echo ""
echo "Yeni kullanici: muhasebe / muhasebe123"
echo ""
echo "Simdi servisleri yeniden baslatin:"
echo "  docker compose --env-file .env.production up -d --build"
echo "  pm2 restart expo-dev"
