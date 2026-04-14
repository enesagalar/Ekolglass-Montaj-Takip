# Ekolglass Montaj Takip — Tam Dağıtım Rehberi

> **Hedef:** VPS üzerinde API, Cloudflare R2'de fotoğraflar, TestFlight (iOS) ve Google Play (Android) beta

---

## 1. Gereksinimler & Hesaplar

| Hizmet | Ücret | Açıklama |
|---|---|---|
| **Apple Developer Program** | $99/yıl | TestFlight + App Store |
| **Google Play Console** | $25 (tek sefer) | Android beta + Play Store |
| **Expo / EAS hesabı** | Ücretsiz | Build servisi |
| **VPS** (Hetzner önerilir) | ~€4/ay | CX21 = 2vCPU/4GB RAM |
| **Alan adı** | ~$10/yıl | api.sizeaitmarka.com |
| **Cloudflare** | Ücretsiz/R2 | Fotoğraf depolama (10GB ücretsiz) |

---

## 2. VPS Kurulumu (Hetzner CX21 — Ubuntu 22.04)

### 2.1 Sunucu Hazırlığı

```bash
# Root olarak bağlan
ssh root@SUNUCU_IP

# Sistem güncelle
apt update && apt upgrade -y

# Docker yükle
curl -fsSL https://get.docker.com | sh

# Docker Compose yükle
apt install -y docker-compose-plugin

# Node.js yükle (EAS için değil, yedek olarak)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Güvenlik duvarı
ufw allow 22 && ufw allow 80 && ufw allow 443
ufw enable
```

### 2.2 Projeyi Çek

```bash
# GitHub'dan çek
git clone https://github.com/enesagalar/Ekolglass-Montaj-Takip.git /opt/ekolglass
cd /opt/ekolglass

# Üretim env dosyasını oluştur
cp .env.production.example .env.production
nano .env.production    # Değerleri doldur (bkz. Bölüm 4)
```

### 2.3 SSL Sertifikası (Certbot + Nginx)

```bash
apt install -y certbot

# Geçici HTTP sunucusuyla sertifika al (domain DNS'i sunucuya yönlendirilmiş olmalı)
certbot certonly --standalone -d api.YOUR_DOMAIN.com

# Sertifikaları nginx klasörüne kopyala
mkdir -p /opt/ekolglass/nginx/certs
cp /etc/letsencrypt/live/api.YOUR_DOMAIN.com/fullchain.pem /opt/ekolglass/nginx/certs/
cp /etc/letsencrypt/live/api.YOUR_DOMAIN.com/privkey.pem /opt/ekolglass/nginx/certs/

# nginx.conf içindeki YOUR_DOMAIN.com ifadesini güncelle
nano /opt/ekolglass/nginx/nginx.conf
```

### 2.4 Servisi Başlat

```bash
cd /opt/ekolglass
docker compose up -d --build

# Durum kontrol
docker compose ps
docker compose logs api

# Sağlık testi
curl https://api.YOUR_DOMAIN.com/api/healthz
```

### 2.5 Otomatik Güncelleme (deploy scripti)

```bash
cat > /opt/ekolglass/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/ekolglass
git pull origin main
docker compose build api
docker compose up -d --no-deps api
echo "Dağıtım tamamlandı: $(date)"
EOF

chmod +x /opt/ekolglass/deploy.sh
```

Bundan sonra güncellemek için sadece:
```bash
/opt/ekolglass/deploy.sh
```

---

## 3. Cloudflare R2 Kurulumu

### 3.1 Bucket Oluştur

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket**
2. Bucket adı: `ekolglass-photos`
3. Bölge: **Auto** (en yakın)

### 3.2 API Token Oluştur

1. **Manage R2 API Tokens** → **Create API Token**
2. İzinler: **Object Read & Write**
3. Yalnızca `ekolglass-photos` bucket'ı seç
4. Oluştur → `Access Key ID` ve `Secret Access Key`'i not al

### 3.3 Public URL Ayarla

1. Bucket → **Settings** → **Custom Domain**
2. `photos.YOUR_DOMAIN.com` ekle (Cloudflare üzerinden DNS yönetiyorsan otomatik)

veya `r2.dev` üzerinden genel erişim aç (test için).

### 3.4 CORS Ayarla (Bucket → Settings → CORS Policy)

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3.5 `.env.production` içine R2 bilgilerini ekle

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ekolglass-photos
R2_PUBLIC_URL=https://photos.YOUR_DOMAIN.com
```

---

## 4. Mobil Uygulama — EAS Build

### 4.1 EAS CLI Kurulumu

```bash
# Bilgisayarında (Mac/Windows)
npm install -g eas-cli
eas login
```

### 4.2 Proje Bağla

```bash
cd artifacts/mobile

# EAS projesini oluştur (app.json'a projectId yazar)
eas build:configure
```

### 4.3 Üretim API URL'ini EAS'e Ekle

```bash
eas env:create \
  --scope project \
  --name EXPO_PUBLIC_API_URL \
  --value "https://api.YOUR_DOMAIN.com/api"
```

### 4.4 eas.json Güncelle (submit bölümü)

`artifacts/mobile/eas.json` dosyasında şunları düzenle:
- `appleId`: Apple Developer e-posta adresin
- `ascAppId`: App Store Connect → Uygulamanın ID'si (ileride)
- `appleTeamId`: Apple Developer → Membership → Team ID

---

## 5. iOS — TestFlight Beta

### 5.1 İlk Kurulum (bir kez)

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**
2. Platform: iOS
3. Bundle ID: `com.ekolglassmontajtakip.app`
4. Uygulamayı kaydet, App ID'yi not al

### 5.2 Build Al ve Gönder

```bash
cd artifacts/mobile

# Build al (TestFlight'a gönderilecek)
eas build --platform ios --profile preview

# Build bittikten sonra TestFlight'a gönder
eas submit --platform ios --latest
```

### 5.3 Test Kullanıcısı Ekle

1. App Store Connect → Uygulamana → **TestFlight** sekmesi
2. **Internal Testing** → Grup oluştur → E-posta ile davet et
3. Müşteri/test kullanıcısı e-postasını gir → Davet gönder
4. Kullanıcı iPhone'a **TestFlight** uygulamasını indirir → Daveti kabul eder → Uygulamayı kurar

---

## 6. Android — Google Play İç Test

### 6.1 İlk Kurulum (bir kez)

1. [play.google.com/console](https://play.google.com/console) → **Create app**
2. Uygulama adı: **Ekolglass Montaj Takip**
3. Package name: `com.ekolglassmontajtakip.app`

### 6.2 Build Al

```bash
cd artifacts/mobile

# APK build (dahili test için daha hızlı)
eas build --platform android --profile preview
```

### 6.3 Google Play'e Yükle

1. EAS Dashboard → Build → **Download** → `.apk` dosyasını indir
2. Play Console → Uygulamana → **Internal testing** → **Create new release**
3. APK'yı yükle → Kaydet → Yayınla

### 6.4 Test Kullanıcısı Ekle

1. **Internal testing** → **Testers** → **Manage testers**
2. E-posta adresi ekle → Kaydet
3. Kullanıcı **opt-in link** ile Google Play'den uygulamayı indirir

---

## 7. Sonraki Güncellemeler

```bash
# Yeni kod değişikliği sonrası

# 1. API güncelle
ssh root@SUNUCU_IP '/opt/ekolglass/deploy.sh'

# 2. Mobil güncelle (her iki platform)
cd artifacts/mobile
eas build --platform all --profile preview
eas submit --platform all --latest
```

---

## 8. Tam Sürüme Geçiş (App Store + Play Store)

```bash
# Production build
eas build --platform all --profile production

# App Store'a gönder (App Review süreci ~1-2 gün)
eas submit --platform ios --latest

# Google Play'e gönder (otomatik veya manuel review)
eas submit --platform android --latest
```

---

## Kontrol Listesi

- [ ] VPS kuruldu ve Docker çalışıyor
- [ ] SSL sertifikası alındı (`https://api.YOUR_DOMAIN.com/api/healthz` çalışıyor)
- [ ] Cloudflare R2 bucket oluşturuldu
- [ ] `.env.production` tüm değerlerle dolduruldu
- [ ] `docker compose up -d` çalışıyor
- [ ] Apple Developer hesabı açıldı ($99/yıl)
- [ ] Google Play Console hesabı açıldı ($25)
- [ ] EAS hesabı açıldı (ücretsiz)
- [ ] `eas build:configure` çalıştırıldı (projectId app.json'a yazıldı)
- [ ] `EXPO_PUBLIC_API_URL` EAS'e eklendi
- [ ] iOS build alındı ve TestFlight'a gönderildi
- [ ] Android build alındı ve Google Play'e yüklendi
- [ ] Test kullanıcıları davet edildi
