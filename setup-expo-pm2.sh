#!/bin/bash
# Expo dev server'ı pm2 ile kalıcı arka plan servisi olarak kurar.
# VPS üzerinde bir kez çalıştırın: bash setup-expo-pm2.sh

set -e

VPS_IP="46.225.233.65"
API_URL="http://${VPS_IP}:3000/api"
APP_DIR="/opt/ekolglass"
WRAPPER="$APP_DIR/run-expo.sh"

echo "=== Expo pm2 Servis Kurulumu ==="

# Node.js
if ! command -v node &>/dev/null; then
  echo "Node.js kuruluyor..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  echo "pnpm kuruluyor..."
  npm install -g pnpm
fi

# pm2
if ! command -v pm2 &>/dev/null; then
  echo "pm2 kuruluyor..."
  npm install -g pm2
fi

echo "Node : $(node --version)"
echo "pnpm : $(pnpm --version)"
echo "pm2  : $(pm2 --version)"

# Bağımlılıkları kur
echo ""
echo "Bağımlılıklar yükleniyor..."
cd "$APP_DIR"
pnpm install --filter @workspace/mobile...

# .env dosyası
cat > "$APP_DIR/artifacts/mobile/.env" <<EOF
EXPO_PUBLIC_API_URL=${API_URL}
EOF

# Portları aç
ufw allow 8081/tcp 2>/dev/null || true
ufw allow 19000/tcp 2>/dev/null || true
ufw allow 19001/tcp 2>/dev/null || true
ufw allow 19002/tcp 2>/dev/null || true

# Wrapper script oluştur
cat > "$WRAPPER" <<EOF
#!/bin/bash
export CI=1
export REACT_NATIVE_PACKAGER_HOSTNAME=${VPS_IP}
export EXPO_PUBLIC_API_URL=${API_URL}
cd ${APP_DIR}/artifacts/mobile
exec pnpm exec expo start --port 8081 --lan
EOF
chmod +x "$WRAPPER"

# Mevcut pm2 prosesini durdur (varsa)
pm2 delete expo-dev 2>/dev/null || true

# pm2 ile başlat
echo ""
echo "Expo başlatılıyor (pm2)..."
pm2 start "$WRAPPER" --name "expo-dev"

# VPS yeniden başlayınca otomatik açılsın
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo\|systemctl" | bash 2>/dev/null || true

echo ""
echo "=== Kurulum Tamamlandı ==="
echo ""
echo "  API URL : ${API_URL}"
echo "  Metro   : http://${VPS_IP}:8081"
echo ""
echo "Expo Go ile http://${VPS_IP}:8081 adresini tarayın."
echo ""
echo "Kullanışlı komutlar:"
echo "  pm2 logs expo-dev      -- logları görüntüle (QR kod burada)"
echo "  pm2 restart expo-dev   -- yeniden başlat"
echo "  pm2 stop expo-dev      -- durdur"
echo "  pm2 status             -- durum"
