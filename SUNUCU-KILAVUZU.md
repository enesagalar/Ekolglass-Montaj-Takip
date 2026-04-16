# Ekolglass Montaj Takip — Sunucu Kılavuzu

## Bağlantı

```bash
ssh root@46.225.233.65
```

Şifre sormadan girmek için SSH key ekleyebilirsiniz:
```bash
ssh-copy-id root@46.225.233.65
```

---

## Servisler

| Servis | Teknoloji | Komut |
|--------|-----------|-------|
| **Veritabanı** | PostgreSQL (Docker) | `ekolglass-db` container |
| **API** | Node.js/Express (Docker) | `ekolglass-api` container |
| **Expo** | React Native Dev Server | pm2 → `expo-dev` |

---

## Durumu Kontrol Et

```bash
# Docker servisleri
docker ps

# Expo (pm2)
pm2 status

# API logları
docker logs ekolglass-api --tail 50

# Expo logları (QR kod buradan)
pm2 logs expo-dev --lines 50
```

---

## Güncelleme Yap (Kod Çektikten Sonra)

```bash
cd /opt/ekolglass

# 1. Son kodu çek
git pull

# 2. API'yi yeniden build et
docker compose --env-file .env.production up -d --build

# 3. Expo'yu yeniden başlat
pm2 restart expo-dev
```

---

## Sadece Expo'yu Yeniden Başlat

```bash
pm2 restart expo-dev

# QR kodu görmek için
pm2 logs expo-dev --lines 30
```

Expo Go'da bağlanmak için: `exp://46.225.233.65:8081`

---

## Sadece API'yi Yeniden Başlat

```bash
cd /opt/ekolglass
docker compose --env-file .env.production restart api
```

---

## Veritabanı Migration (Yeni Kolon Eklemek)

```bash
cd /opt/ekolglass && git pull
bash migrate-v2.sh
docker compose --env-file .env.production up -d --build
pm2 restart expo-dev
```

---

## Sıfırdan Ayağa Kaldırma

Sunucu yeniden başladıysa veya her şey durmuşsa:

```bash
cd /opt/ekolglass

# Docker servislerini başlat
docker compose --env-file .env.production up -d

# Birkaç saniye bekle, DB ayağa kalksın
sleep 5

# API sağlık kontrolü
curl http://localhost:3000/api/health

# Expo başlat
pm2 start expo-dev
# veya yoksa:
bash setup-expo-pm2.sh
```

Sunucu her yeniden başladığında pm2 otomatik başlamalı.
Değilse bir kez çalıştır:
```bash
pm2 startup
pm2 save
```

---

## Hata Çözümleri

### API `docker ps`'de görünmüyor

```bash
cd /opt/ekolglass
docker compose --env-file .env.production up -d --build
docker logs ekolglass-api --tail 100
```

### API "Database connection failed" hatası

```bash
# Postgres container'ı çalışıyor mu?
docker ps | grep ekolglass-db

# Çalışmıyorsa başlat
docker compose --env-file .env.production up -d postgres
sleep 5
docker compose --env-file .env.production up -d api
```

### Expo QR kodu çıkmıyor / pm2'de yok

```bash
pm2 list
# expo-dev yoksa:
bash /opt/ekolglass/setup-expo-pm2.sh
```

### Expo "Metro Bundler" başlamıyor

```bash
pm2 delete expo-dev
cd /opt/ekolglass/artifacts/mobile
pnpm install
pm2 start /opt/ekolglass/run-expo.sh --name expo-dev
pm2 save
```

### API 403 / 401 hatası

JWT_SECRET veya ortam değişkeni eksik olabilir:
```bash
cat /opt/ekolglass/.env.production | grep JWT_SECRET
# Boşsa ekle:
echo "JWT_SECRET=gizli_deger_buraya" >> /opt/ekolglass/.env.production
docker compose --env-file .env.production up -d --build
```

### Migration hatası (role "postgres" does not exist)

DB kullanıcısı `ekolglass`'tır, `postgres` değil. migrate-v2.sh bunu otomatik kullanır.
```bash
bash /opt/ekolglass/migrate-v2.sh
```

### Port 3000 / 8081 erişilemiyor

```bash
ufw status
ufw allow 3000/tcp
ufw allow 8081/tcp
```

---

## Hızlı Referans

```bash
# Tüm servisleri yeniden başlat
docker compose --env-file .env.production restart && pm2 restart expo-dev

# Veritabanına bağlan
docker exec -it ekolglass-db psql -U ekolglass -d ekolglass

# Tüm tabloları listele
docker exec ekolglass-db psql -U ekolglass -d ekolglass -c "\dt"

# API sağlık kontrolü
curl http://localhost:3000/api/health

# Expo URL
echo "exp://46.225.233.65:8081"
```

---

## Hesaplar

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| admin | admin123 | Admin |
| mehmet / ali / hasan / murat | 1234 | Personel |
| isri | isri2024 | Müşteri |
