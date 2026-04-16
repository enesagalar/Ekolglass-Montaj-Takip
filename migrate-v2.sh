#!/bin/bash
# Veritabanı migration v2
# VPS'te bir kez çalıştırın: bash migrate-v2.sh

set -e
echo "=== Migration v2 ==="

# Postgres container'ı otomatik bul
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE "postgres|db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
  echo "HATA: Postgres container bulunamadı. Mevcut container'lar:"
  docker ps --format '{{.Names}}'
  exit 1
fi

echo "Kullanılan container: $DB_CONTAINER"

run_sql() {
  docker exec "$DB_CONTAINER" psql -U ekolglass -d ekolglass -c "$1"
}

echo "defects tablosuna photo_uri kolonu ekleniyor..."
run_sql "ALTER TABLE defects ADD COLUMN IF NOT EXISTS photo_uri TEXT;"

echo "defects tablosuna added_by_role kolonu ekleniyor..."
run_sql "ALTER TABLE defects ADD COLUMN IF NOT EXISTS added_by_role TEXT DEFAULT 'field';"

echo "Köpük, Temizlik Bezi, Koruyucu Örtü kaldırılıyor..."
run_sql "DELETE FROM consumables WHERE name IN ('Köpük', 'Temizlik Bezi', 'Koruyucu Örtü');"

echo ""
echo "=== Migration Tamamlandı ==="
run_sql "SELECT column_name FROM information_schema.columns WHERE table_name='defects' ORDER BY ordinal_position;"
