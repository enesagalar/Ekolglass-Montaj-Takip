# Mobil Uygulama Yayımlama Rehberi
## TestFlight (iOS) + Google Play (Android)

---

## Ön Gereksinimler (Bir Seferlik)

### Apple Developer Hesabı
1. **developer.apple.com/programs** → Kayıt ol → $99/yıl öde
2. Onay süresi: 1-2 iş günü
3. Xcode gerektirmez — EAS Cloud üzerinde build alıyoruz

### Google Play Console Hesabı
1. **play.google.com/console/signup** → Kayıt ol → $25 tek seferlik
2. Anında aktif olur

### EAS (Expo Application Services)
1. **expo.dev/signup** → Ücretsiz hesap oluştur
2. Bilgisayarınızda terminal aç:
   ```bash
   npm install -g eas-cli
   eas login
   ```

---

## Bölüm 1 — Proje Hazırlığı

### 1.1 API URL Ayarı

VPS kurulumu tamamlandıktan sonra, üretim API URL'sini EAS'e tanıtın:

```bash
cd artifacts/mobile

# Üretim ortam değişkeni ekle (bir kez)
eas env:create \
  --scope project \
  --name EXPO_PUBLIC_API_URL \
  --value "https://api.DOMAININIZ.com/api" \
  --environment production
```

### 1.2 App Kimlik Bilgileri (app.json)

`artifacts/mobile/app.json` dosyasında şunları güncelleyin:

```json
{
  "expo": {
    "name": "Cam Montaj Takip",
    "slug": "cam-montaj-takip",
    "ios": {
      "bundleIdentifier": "com.SIRKETINIZ.cammontak"
    },
    "android": {
      "package": "com.SIRKETINIZ.cammontak"
    }
  }
}
```

**Not:** `com.SIRKETINIZ.cammontak` yerine gerçek bir değer yazın (örn: `com.ekolglass.montaj`). Bu değer sonradan **değiştirilemiyor**.

---

## Bölüm 2 — iOS / TestFlight

### 2.1 Apple Sertifikaları (Otomatik)

EAS sertifikaları otomatik oluşturur. Hiçbir şey yapmanıza gerek yok.

### 2.2 iOS Build Alma

```bash
cd artifacts/mobile

# Preview build (TestFlight için)
eas build --platform ios --profile preview
```

Bu komut:
1. EAS bulut sunucularında build başlatır (~15-20 dakika)
2. Biten build'i indirmenizi sağlar veya doğrudan TestFlight'a gönderebilirsiniz

**Build durumunu takip edin:** expo.dev → Projects → Builds

### 2.3 TestFlight'a Yükleme

```bash
# Build bittikten sonra otomatik gönder
eas submit --platform ios --latest
```

EAS sizden Apple Developer şifrenizi ister, sonra otomatik yükler.

**Alternatif:** expo.dev'den `.ipa` dosyasını indirip **Transporter** uygulamasıyla manuel yükleyin.

### 2.4 TestFlight'ta Test Kullanıcısı Ekleme

1. **appstoreconnect.apple.com** → Giriş yap
2. **My Apps** → Cam Montaj Takip
3. **TestFlight** sekmesi → **Internal Testing**
4. **+** → Test kullanıcısının Apple ID'sini girin
5. Kullanıcı e-posta ile davet alır → **TestFlight** uygulamasından yükler

**Dahili test limiti:** 100 kişi
**Harici test (beta):** 10.000 kişiye kadar, Apple onayı gerektirir (1-2 gün)

---

## Bölüm 3 — Android / Google Play

### 3.1 Android Build Alma

```bash
cd artifacts/mobile

# Preview build (AAB formatı — Play Store için)
eas build --platform android --profile preview
```

Build ~10-15 dakika sürer.

### 3.2 Google Play Console'a Yükleme

**Otomatik:**
```bash
eas submit --platform android --latest
```

**Manuel:**
1. **play.google.com/console** → Giriş yap
2. **Uygulamalar** → **Uygulama Oluştur**
   - Uygulama adı: Cam Montaj Takip
   - Dil: Türkçe
   - Tür: Uygulama (App)
   - Ücretsiz veya ücretli: Ücretsiz
3. **İç Test** → **Sürüm Oluştur**
4. **AAB Yükle** → Build'den indirdiğiniz `.aab` dosyasını seçin
5. **Kaydet** → **İnceleme**

### 3.3 Test Kullanıcısı Ekleme (Google Play)

1. **İç Test** → **Test Yapanları Yönet**
2. Liste oluştur → Test kullanıcılarının Gmail adreslerini girin
3. Kaydet → Kullanıcılar davet e-postası alır
4. E-postadaki link → Google Play'den yükler

---

## Bölüm 4 — Production Build (Mağazaya Gönderme)

TestFlight / dahili test başarılıysa, production build alıp mağazaya gönderin:

```bash
# iOS production
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android production
eas build --platform android --profile production
eas submit --platform android --latest
```

**App Store onayı:** 1-3 iş günü
**Google Play onayı:** 1-3 iş günü (ilk sürüm), güncellemeler genellikle birkaç saat

---

## Bölüm 5 — Güncelleme Gönderme (OTA)

Küçük düzeltmeler için (sunucu kodu değil, sadece UI/mantık) Expo'nun Over-The-Air güncelleme sistemi kullanılabilir:

```bash
# Mağazaya build göndermeden anında güncelle
eas update --branch production --message "Hata düzeltmeleri"
```

Bu özellik `eas.json`'da tanımlı `updates` kanalı sayesinde çalışır.

---

## Özet — Hızlı Referans

| Adım | Komut |
|------|-------|
| Login | `eas login` |
| iOS Test Build | `eas build --platform ios --profile preview` |
| iOS Gönder | `eas submit --platform ios --latest` |
| Android Test Build | `eas build --platform android --profile preview` |
| Android Gönder | `eas submit --platform android --latest` |
| OTA Güncelleme | `eas update --branch production --message "..."` |

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|-------|-------|
| Bundle ID zaten alınmış | Farklı bir ID deneyin (`com.ekolglass.camtakip`) |
| Apple sertifika hatası | `eas credentials` → sertifikaları sıfırla |
| Build başlamıyor | `expo.dev` → hesap aboneliğini kontrol edin |
| API bağlanamıyor | `EXPO_PUBLIC_API_URL` doğru mu kontrol edin |
| Android imzalama hatası | `eas credentials --platform android` → keystore oluştur |
