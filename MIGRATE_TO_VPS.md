# Cam Montaj Takip — Hetzner VPS Tam Göç Rehberi

> Supabase bağımlılığı tamamen kaldırılır. PostgreSQL + Express API, Hetzner CPX22 üzerinde çalışır.
> Fotoğraflar Cloudflare R2'de saklanır. Yedekler otomatik alınır.

---

## Mimari

```
Mobil App (iOS / Android)
         │
         ▼
Cloudflare (DNS + DDoS koruması — ücretsiz)
         │
         ▼
Hetzner CPX22 (€8.49/ay)
├── Nginx (SSL — Let's Encrypt ücretsiz)
├── Express API (Docker container)
└── PostgreSQL 16 (Docker container)
         │
         ▼
Cloudflare R2 (fotoğraflar — ~€0.10/ay)
```

**Aylık toplam maliyet: ~€8.60**
Supabase Pro ($25) + Railway ($5) yerine.

---

## Kapasite Hesabı

| Kaynak | Kullanım | CPX22 Kapasitesi |
|--------|----------|------------------|
| RAM | ~1 GB (tüm servisler) | 4 GB |
| CPU | 10 araç/gün = %2-3 | 2 AMD vCPU |
| Disk | DB <1 GB/yıl, fotoğraf R2'de | 80 GB NVMe |
| Bant | ~7.5 GB/ay upload | Sınırsız (makul kullanım) |

**Fotoğraf depolama (Cloudflare R2):**
- 10 araç × 10 fotoğraf × 2.5 MB = 250 MB/gün
- Aylık: ~7.5 GB → R2 ücreti ~$0.11
- 1 yıl: ~90 GB → R2 ücreti ~$1.35/ay

---

## Bölüm 1 — Hetzner VPS Kurulumu

### 1.1 Sunucu Oluşturma

Hetzner Cloud Console → "Create Server":
- **Location:** Falkenstein (Almanya) veya Helsinki
- **Image:** Ubuntu 22.04
- **Type:** CPX22
- **SSH Key:** Kendi public key'inizi ekleyin
- **Firewall:** Yeni oluşturun (aşağıdaki kurallar)

**Firewall kuralları:**
| Port | Protokol | Kaynak | Açıklama |
|------|----------|--------|----------|
| 22 | TCP | Sizin IP'niz | SSH |
| 80 | TCP | Everywhere | HTTP (HTTPS yönlendirme) |
| 443 | TCP | Everywhere | HTTPS |

### 1.2 İlk Bağlantı ve Güvenlik

```bash
# Sunucuya bağlan
ssh root@SUNUCU_IP

# Sistem güncellemesi
apt update && apt upgrade -y

# Yeni admin kullanıcı oluştur
adduser deploy
usermod -aG sudo deploy

# SSH key'i yeni kullanıcıya kopyala
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Root SSH girişini kapat
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# Şifreden çık, yeni kullanıcıyla devam et
exit
ssh deploy@SUNUCU_IP
```

### 1.3 Docker Kurulumu

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
newgrp docker

# Docker Compose
sudo apt install -y docker-compose-plugin

# Doğrula
docker --version
docker compose version
```

---

## Bölüm 2 — PostgreSQL Kurulumu

### 2.1 Klasör Yapısı

```bash
sudo mkdir -p /opt/ekolglass/{postgres-data,backups,api}
sudo chown -R deploy:deploy /opt/ekolglass
```

### 2.2 docker-compose.yml

```yaml
# /opt/ekolglass/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: ekolglass-db
    restart: always
    environment:
      POSTGRES_DB: ekolglass
      POSTGRES_USER: ekolglass
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /opt/ekolglass/postgres-data:/var/lib/postgresql/data
      - /opt/ekolglass/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ekolglass"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ekolglass-api:latest
    container_name: ekolglass-api
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://ekolglass:${DB_PASSWORD}@postgres:5432/ekolglass
      JWT_SECRET: ${JWT_SECRET}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

networks:
  default:
    name: ekolglass-network
```

### 2.3 .env Dosyası

```bash
cat > /opt/ekolglass/.env << 'EOF'
DB_PASSWORD=GUCLU_BIR_SIFRE_YAZIN
JWT_SECRET=EN_AZ_64_KARAKTER_RASTGELE_STRING
R2_ACCOUNT_ID=cloudflare_account_id
R2_ACCESS_KEY_ID=r2_access_key
R2_SECRET_ACCESS_KEY=r2_secret_key
R2_BUCKET_NAME=ekolglass-photos
R2_PUBLIC_URL=https://photos.DOMAININIZ.com
EOF

chmod 600 /opt/ekolglass/.env
```

---

## Bölüm 3 — Veritabanı Şeması (Supabase'den Göç)

### 3.1 init.sql — Tam Şema

```sql
-- /opt/ekolglass/init.sql
-- Bu dosya PostgreSQL ilk başladığında otomatik çalışır

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Kullanıcı rolleri
CREATE TYPE user_role AS ENUM ('admin', 'field', 'customer');

-- Kullanıcılar tablosu (Supabase auth yerine kendi auth)
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'field',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Araç markaları
CREATE TABLE vehicle_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

INSERT INTO vehicle_brands (code, name) VALUES
    ('DCT', 'DCT'),
    ('MNV', 'MNV'),
    ('BXR', 'BXR'),
    ('JMP', 'JMP');

-- Cam pozisyonları
CREATE TABLE glass_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO glass_positions (code, name, sort_order) VALUES
    ('ON_CAM', 'Ön Cam', 1),
    ('ARKA_CAM', 'Arka Cam', 2),
    ('SOL_ON', 'Sol Ön', 3),
    ('SOL_ARKA', 'Sol Arka', 4),
    ('SAG_ON', 'Sağ Ön', 5),
    ('SAG_ARKA', 'Sağ Arka', 6),
    ('SOL_SABIT', 'Sol Sabit', 7),
    ('SAG_SABIT', 'Sağ Sabit', 8);

-- Montaj kayıtları
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chassis_number VARCHAR(100) NOT NULL,
    vehicle_brand_id UUID NOT NULL REFERENCES vehicle_brands(id),
    glass_position_id UUID NOT NULL REFERENCES glass_positions(id),
    assigned_to_user_id UUID REFERENCES app_users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    chassis_photo_url TEXT,
    assembly_photo_url TEXT,
    work_order_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Cam talep tablosu
CREATE TABLE glass_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_id UUID REFERENCES assemblies(id),
    vehicle_brand_id UUID NOT NULL REFERENCES vehicle_brands(id),
    glass_position_id UUID NOT NULL REFERENCES glass_positions(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sarf malzeme takibi
CREATE TABLE consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sarf malzeme kullanım logu
CREATE TABLE consumable_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumable_id UUID NOT NULL REFERENCES consumables(id),
    assembly_id UUID REFERENCES assemblies(id),
    user_id UUID REFERENCES app_users(id),
    quantity DECIMAL(10,2) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'use' | 'restock'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksler (performans)
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_assemblies_assigned_to ON assemblies(assigned_to_user_id);
CREATE INDEX idx_assemblies_created_at ON assemblies(created_at DESC);
CREATE INDEX idx_assemblies_chassis ON assemblies(chassis_number);
CREATE INDEX idx_glass_requests_status ON glass_requests(status);

-- Updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assemblies_updated_at
    BEFORE UPDATE ON assemblies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Başlangıç kullanıcıları (şifreler bcrypt ile hashlenmiş)
-- Şifre: admin123
INSERT INTO app_users (email, password_hash, full_name, role) VALUES
    ('admin@ekolglass.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbkkATlj8C/GK.QOJ5i5v.2', 'Sistem Admin', 'admin'),
    ('isri@ekolglass.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbkkATlj8C/GK.QOJ5i5v.2', 'ISRI Müşteri', 'customer');

-- Şifre: 1234
INSERT INTO app_users (email, password_hash, full_name, role) VALUES
    ('mehmet@ekolglass.com', '$2b$12$Ke7fH1I0r4NTlxNyEHa2e.i3BIV4lcKFM8dR.qJH.lGT7EJhVBpKW', 'Mehmet', 'field'),
    ('ali@ekolglass.com', '$2b$12$Ke7fH1I0r4NTlxNyEHa2e.i3BIV4lcKFM8dR.qJH.lGT7EJhVBpKW', 'Ali', 'field'),
    ('hasan@ekolglass.com', '$2b$12$Ke7fH1I0r4NTlxNyEHa2e.i3BIV4lcKFM8dR.qJH.lGT7EJhVBpKW', 'Hasan', 'field'),
    ('murat@ekolglass.com', '$2b$12$Ke7fH1I0r4NTlxNyEHa2e.i3BIV4lcKFM8dR.qJH.lGT7EJhVBpKW', 'Murat', 'field');
```

### 3.2 Supabase'den Veri Aktarımı

Mevcut verilerinizi taşımak için Supabase Dashboard → SQL Editor:

```sql
-- Supabase'den CSV export (her tablo için)
COPY assemblies TO STDOUT WITH CSV HEADER;
COPY app_users TO STDOUT WITH CSV HEADER;
-- vb.
```

Sonra VPS'te:
```bash
docker exec -i ekolglass-db psql -U ekolglass ekolglass < mevcut_veriler.sql
```

---

## Bölüm 4 — Nginx + SSL Kurulumu

### 4.1 Nginx Kurulumu

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Domain'i sunucuya yönlendirdiniz mi kontrol edin
# Cloudflare'da A kaydı: api.DOMAININIZ.com → SUNUCU_IP
```

### 4.2 Nginx Konfigürasyonu

```bash
sudo nano /etc/nginx/sites-available/ekolglass
```

```nginx
server {
    listen 80;
    server_name api.DOMAININIZ.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.DOMAININIZ.com;

    ssl_certificate /etc/letsencrypt/live/api.DOMAININIZ.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.DOMAININIZ.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Güvenlik başlıkları
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Dosya yükleme limiti (fotoğraflar için)
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ekolglass /etc/nginx/sites-enabled/
sudo nginx -t

# SSL sertifikası al
sudo certbot --nginx -d api.DOMAININIZ.com

sudo systemctl reload nginx
```

---

## Bölüm 5 — API Deploy

### 5.1 Proje Klonlama

```bash
cd /opt/ekolglass
git clone https://github.com/enesagalar/Ekolglass-Montaj-Takip.git app
cd app
```

### 5.2 API Build ve Başlatma

```bash
cd /opt/ekolglass

# İlk çalıştırma
docker compose --env-file .env up -d --build

# Logları izle
docker compose logs -f api
docker compose logs -f postgres

# Durum kontrolü
docker compose ps
```

### 5.3 Güncelleme (Her Yeni Sürüm)

```bash
cd /opt/ekolglass/app
git pull
docker build -t ekolglass-api:latest ./artifacts/api-server/
cd /opt/ekolglass
docker compose up -d --no-deps api
```

---

## Bölüm 6 — Otomatik Yedekleme Sistemi

### 6.1 Yedekleme Scripti

```bash
sudo nano /opt/ekolglass/backup.sh
```

```bash
#!/bin/bash
# Cam Montaj Takip — Otomatik Yedekleme Scripti

set -euo pipefail

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/opt/ekolglass/backups"
DB_NAME="ekolglass"
DB_USER="ekolglass"
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=3

source /opt/ekolglass/.env

mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}

# Veritabanı dump al
BACKUP_FILE="$BACKUP_DIR/daily/db_${DATE}.sql.gz"

docker exec ekolglass-db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date)] Yedek alındı: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"

# Haftalık yedek (Pazar günleri)
if [ "$(date +%u)" = "7" ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/weekly/db_${DATE}.sql.gz"
    echo "[$(date)] Haftalık yedek kopyalandı"
fi

# Aylık yedek (Ayın 1'inde)
if [ "$(date +%d)" = "01" ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/monthly/db_${DATE}.sql.gz"
    echo "[$(date)] Aylık yedek kopyalandı"
fi

# Eski yedekleri sil
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +${KEEP_DAILY} -delete
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete
find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +$((KEEP_MONTHLY * 30)) -delete

echo "[$(date)] Temizlik tamamlandı. Kalan yedekler:"
ls -lh "$BACKUP_DIR/daily/" | tail -5
```

```bash
sudo chmod +x /opt/ekolglass/backup.sh
```

### 6.2 Otomatik Zamanlama (Cron)

```bash
sudo crontab -e
```

Şunu ekleyin:
```cron
# Her gece 03:00'te veritabanı yedeği
0 3 * * * /opt/ekolglass/backup.sh >> /var/log/ekolglass-backup.log 2>&1
```

### 6.3 Cloudflare R2'ye Yedek Gönderme (Opsiyonel)

Yedekleri R2'ye de göndermek için (ofsite backup):

```bash
# rclone kur
curl https://rclone.org/install.sh | sudo bash

# rclone yapılandır
rclone config
# new remote → s3 → Cloudflare → access key / secret key
```

```bash
# backup.sh sonuna ekle:
rclone sync "$BACKUP_DIR" r2:ekolglass-backups/$(hostname) --log-level INFO
```

### 6.4 Yedekten Geri Yükleme

```bash
# Geri yüklenecek yedeği seç
ls -lh /opt/ekolglass/backups/daily/

# Geri yükle
gunzip -c /opt/ekolglass/backups/daily/db_2025-01-15_03-00.sql.gz | \
  docker exec -i ekolglass-db psql -U ekolglass ekolglass
```

---

## Bölüm 7 — İzleme ve Uyarılar

### 7.1 Sistem Durumu Kontrolü

```bash
# Tüm servislerin durumu
docker compose -f /opt/ekolglass/docker-compose.yml ps

# RAM ve CPU kullanımı
docker stats --no-stream

# Disk kullanımı
df -h && du -sh /opt/ekolglass/postgres-data/
```

### 7.2 Otomatik Yeniden Başlatma

Docker Compose `restart: always` ayarı sayesinde sunucu yeniden başladığında
tüm servisler otomatik olarak ayağa kalkar.

```bash
# Docker'ın açılışta başlamasını sağla
sudo systemctl enable docker
```

### 7.3 Log Takibi

```bash
# API logları (canlı)
docker logs -f ekolglass-api --tail 100

# PostgreSQL logları
docker logs -f ekolglass-db --tail 50

# Nginx logları
sudo tail -f /var/log/nginx/error.log
```

---

## Bölüm 8 — Cloudflare Yapılandırması

### 8.1 DNS Ayarları

Cloudflare Dashboard → DNS:
| Tür | Ad | Değer | Proxy |
|-----|-----|-------|-------|
| A | api | SUNUCU_IP | ✅ Açık |
| A | @ | SUNUCU_IP | ✅ Açık |

**Proxy açık olursa:** Cloudflare DDoS koruma + CDN + IP gizleme sağlar.

### 8.2 R2 Bucket Oluşturma

Cloudflare Dashboard → R2:
1. "Create bucket" → isim: `ekolglass-photos`
2. Settings → Public access → "Allow Access"
3. Custom domain: `photos.DOMAININIZ.com`
4. API Tokens → "Create API Token" → R2 Edit izni

---

## Bölüm 9 — Maliyet Özeti

| Servis | Aylık | Yıllık |
|--------|-------|--------|
| Hetzner CPX22 | €8.49 | €101.88 |
| Cloudflare R2 (fotoğraflar) | ~€0.10 | ~€1.20 |
| Let's Encrypt (SSL) | Ücretsiz | Ücretsiz |
| Cloudflare DNS/DDoS | Ücretsiz | Ücretsiz |
| **Toplam** | **~€8.60** | **~€103** |

**Supabase Pro ($25) + Railway ($5) ile kıyasla yıllık €257 tasarruf.**

---

## Bölüm 10 — Kontrol Listesi

### VPS Kurulumu
- [ ] Ubuntu 22.04 kuruldu
- [ ] `deploy` kullanıcısı oluşturuldu
- [ ] Root SSH girişi kapatıldı
- [ ] Firewall (UFW) aktif
- [ ] Docker kuruldu

### Veritabanı
- [ ] `init.sql` oluşturuldu
- [ ] `docker compose up` çalıştı
- [ ] Kullanıcılar oluşturuldu
- [ ] Supabase verileri aktarıldı

### API
- [ ] `.env` dosyası oluşturuldu
- [ ] API Docker image build edildi
- [ ] Health check: `curl https://api.DOMAININIZ.com/health`

### SSL & Domain
- [ ] Cloudflare'da A kaydı eklendi
- [ ] Nginx yapılandırıldı
- [ ] Certbot çalıştı, SSL aktif
- [ ] HTTPS testi: `curl -I https://api.DOMAININIZ.com`

### Yedekleme
- [ ] `backup.sh` oluşturuldu ve çalıştırıldı
- [ ] Cron job eklendi
- [ ] Manuel test: `sudo /opt/ekolglass/backup.sh`
- [ ] Yedek dosyası görüntülendi: `ls -lh /opt/ekolglass/backups/daily/`

### Mobil Uygulama
- [ ] `EXPO_PUBLIC_API_URL=https://api.DOMAININIZ.com/api` ayarlandı
- [ ] EAS build tetiklendi
- [ ] TestFlight / Google Play iç test

---

## Önemli Notlar

1. **`.env` dosyasını asla Git'e commit etmeyin** — zaten `.gitignore`'da.
2. **DB_PASSWORD** en az 20 karakter, büyük/küçük harf + rakam + sembol içermeli.
3. **JWT_SECRET** en az 64 karakter rastgele string — `openssl rand -hex 64` ile üretin.
4. Sunucu IP'si değişirse Cloudflare DNS kaydını güncelleyin.
5. Let's Encrypt sertifikaları 90 günde bir otomatik yenilenir (`certbot renew` cron'u otomatik kuruyor).
