#!/bin/bash
# Veritabanı migration v2
# VPS'te bir kez çalıştırın: bash migrate-v2.sh

set -e
echo "=== Migration v2 ==="

DB_CONTAINER="ekolglass-postgres-1"

run_sql() {
  docker exec "$DB_CONTAINER" psql -U postgres -d ekolglass -c "$1"
}

echo "defects tablosuna photo_uri kolonu ekleniyor..."
run_sql "ALTER TABLE defects ADD COLUMN IF NOT EXISTS photo_uri TEXT;"

echo "Köpük, Temizlik Bezi, Koruyucu Örtü kaldırılıyor..."
run_sql "DELETE FROM consumables WHERE name IN ('Köpük', 'Temizlik Bezi', 'Koruyucu Örtü');"

echo ""
echo "=== Migration Tamamlandı ==="
run_sql "SELECT name, stock FROM consumables ORDER BY name;"
