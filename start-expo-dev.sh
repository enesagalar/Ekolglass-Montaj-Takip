#!/bin/bash
# Hetzner VPS'te Expo dev server başlatma scripti (tunnel modu)
# Kullanım: bash start-expo-dev.sh

set -e

VPS_IP="46.225.233.65"
API_URL="http://${VPS_IP}:3000/api"

echo "=== Expo Dev Server Kurulum & Başlatma ==="

# Node.js kontrolü
if ! command -v node &>/dev/null; then
  echo "Node.js kuruluyor..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# pnpm kontrolü
if ! command -v pnpm &>/dev/null; then
  echo "pnpm kuruluyor..."
  npm install -g pnpm
fi

echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"

# Bağımlılıkları yükle
echo "Bağımlılıklar yükleniyor..."
cd /opt/ekolglass
pnpm install --filter @workspace/mobile...

# .env dosyası
cat > artifacts/mobile/.env <<EOF
EXPO_PUBLIC_API_URL=${API_URL}
EOF

echo ""
echo "API URL: ${API_URL}"
echo ""
echo "Expo başlatılıyor (tunnel modu)..."
echo "Birkaç saniye bekleyin, QR kodu çıkacak."
echo ""

cd /opt/ekolglass/artifacts/mobile
EXPO_PUBLIC_API_URL=${API_URL} \
pnpm exec expo start --tunnel
