# Ekolglass Hetzner Clean Cutover Guide

The production runtime is:

- Expo / React Native mobile app in `artifacts/mobile`
- Express API in `artifacts/api-server`
- PostgreSQL 16 via Docker Compose
- Cloudflare R2 for photo storage through the API
- PM2 for the temporary Expo Go development server

## Current Cutover Strategy

Use this guide when replacing an active server with a clean install. The old `/opt/ekolglass` folder is archived first so rollback remains possible.

## 1. Inspect Current Server

```bash
hostname
docker ps
pm2 status || true
ls -la /opt
cd /opt/ekolglass 2>/dev/null && git status --short --branch || true
```

## 2. Archive Existing Install

```bash
mkdir -p /opt/backups
cd /opt
tar -czf /opt/backups/ekolglass-files-$(date +%Y%m%d-%H%M%S).tar.gz ekolglass 2>/dev/null || true
docker ps --format '{{.Names}}' | grep -E 'ekolglass-db|postgres' || true
```

## 3. Stop Existing Services

```bash
pm2 stop expo-dev || true
pm2 delete expo-dev || true
cd /opt/ekolglass 2>/dev/null && docker compose --env-file .env.production down || true
```

## 4. Clone Fresh Repo

```bash
cd /opt
mv ekolglass ekolglass.old.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
git clone https://github.com/enesagalar/Ekolglass-Montaj-Takip.git /opt/ekolglass
cd /opt/ekolglass
cp .env.production.example .env.production
nano .env.production
```

Fill these values in `.env.production` without committing the file:

- `DB_PASSWORD`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `API_BASE_URL=http://46.225.233.65:3000`

## 5. Start API and Database

```bash
cd /opt/ekolglass
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
curl -fsS http://localhost:3000/api/healthz
```

## 6. Start Expo Go Dev Server

```bash
cd /opt/ekolglass
bash setup-expo-pm2.sh
pm2 status
pm2 logs expo-dev --lines 30
```

Expo Go URL:

```text
exp://46.225.233.65:8081
```

## 7. Normal Deploy After Future Commits

```bash
cd /opt/ekolglass
git pull --ff-only origin main
pnpm install --frozen-lockfile --filter @workspace/mobile...
docker compose --env-file .env.production up -d --build
pm2 restart expo-dev
curl -fsS http://localhost:3000/api/healthz
```

## 8. Rollback

```bash
cd /opt
mv ekolglass ekolglass.failed.$(date +%Y%m%d-%H%M%S)
mv ekolglass.old.* ekolglass
cd /opt/ekolglass
docker compose --env-file .env.production up -d --build
pm2 restart expo-dev || true
```

## Notes

- Store builds should use an HTTPS API domain before public production release.
- Demo passwords in `init.sql` must be changed before real production use.
- R2 credentials must be bucket-scoped and kept only in `.env.production`.
