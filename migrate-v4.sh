#!/bin/bash
# Muhasebe şifre düzeltme + pgcrypto bağımsız migration
# migrate-v3.sh başarısız olduysa bunu çalıştırın
# VPS'de: bash migrate-v4.sh

set -e

DB_CONTAINER="ekolglass-db"
DB_USER="ekolglass"
DB_NAME="ekolglass"

# bcryptjs ile üretilmiş hash (muhasebe123)
HASH='$2b$12$rCRoiMOK.7NGRb97mLcxMuVxprwnELf5RT1zo2Gaf1cy0DHllH6l2'

echo "=== Migrate v4: Muhasebe şifre düzeltme ==="

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<SQL

-- accounting rolünü ekle (varsa çakışma yok)
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin', 'field', 'customer', 'accounting'));

-- Muhasebe kullanıcısı oluştur ya da şifresini güncelle
INSERT INTO app_users (username, password_hash, name, role, active)
VALUES ('muhasebe', '${HASH}', 'Muhasebe', 'accounting', true)
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role = 'accounting',
      active = true;

-- Faturalar tablosu (yoksa oluştur)
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

echo ""
echo "=== Migration v4 tamamlandi ==="
echo ""
echo "Kullanici: muhasebe"
echo "Sifre:     muhasebe123"
echo ""
echo "Servisleri yeniden baslatin:"
echo "  docker compose --env-file .env.production up -d --build"
