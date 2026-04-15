# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL 16 (Replit built-in for dev, Docker on VPS for production)
- **Auth**: Custom JWT (bcryptjs + jsonwebtoken) — Supabase removed
- **Photo storage**: Cloudflare R2 (S3-compatible)
- **Build**: esbuild (ESM bundle)

## Artifacts

### API Server (`artifacts/api-server`)
- Express 5, TypeScript, esbuild
- Routes: `/api/auth/login|refresh|logout|me`, `/api/assemblies` (CRUD + photos/bulk + defects), `/api/users` (admin CRUD), `/api/stock`, `/api/consumables`, `/api/glass-requests`, `/api/upload`
- Auth: Custom JWT via `requireAuth` middleware (`jsonwebtoken` verify)
- Role guard: `requireRole(...)` reads `user.role` from JWT payload
- DB client: `lib/db.ts` — raw `pg` Pool with `query()` and `queryOne()` helpers
- JWT payload: `{ id, username, name, role, type: "access"|"refresh" }`
- Access token: 7 days, Refresh token: 30 days

### Mobile App (`artifacts/mobile`)
- **Framework**: Expo / React Native
- **Type**: Vehicle windshield glass installation tracking system (Cam Montaj Takip)
- **Routing**: Expo Router (file-based)
- **State**: React Context (`context/AppContext.tsx`) — all data from API server
- **Auth**: JWT stored in AsyncStorage (`@cam_montaj_token`), session user in `@cam_montaj_session_v2`
- **API client**: `lib/api.ts` — `apiGet/apiPost/apiPatch/apiDelete` with auto token refresh

#### Features
- Role-based login: Field Staff (`field`), Admin (`admin`), ISRI Yetkilisi (`customer`)
- Assembly record list with search and status filter
- New assembly creation form (VIN, glass types, staff assignment)
- Assembly detail: full status flow with photo capture, defect logging
- Status flow: pending → cutting → cutting_done → installation (4 before-photos) → installation_done (4 after-photos) → water_test → completed
- ISRI water test gate: buttons disabled for first 4 hours with countdown
- Admin dashboard: stats, staff workload chart
- Profile screen with stats and logout

#### Key Files
- `app/login.tsx` — username/password login
- `app/(tabs)/index.tsx` — assembly list
- `app/(tabs)/admin.tsx` — admin panel
- `app/(tabs)/profile.tsx` — user profile
- `app/new-assembly.tsx` — new assembly form (modal)
- `app/assembly/[id].tsx` — assembly detail
- `context/AppContext.tsx` — all state, API calls
- `lib/api.ts` — API base URL, fetch helpers, token management

### Database (PostgreSQL)

#### Tables
- `app_users` — username / password_hash / name / role / active
- `assemblies` — main record (vehicle_model, vin, status, status_timestamps, glass_product_ids JSONB, etc.)
- `photos` — assembly photos (type, uri, angle)
- `defects` — defect records per assembly
- `activity_log` — audit log per assembly
- `glass_stock` — glass product inventory (g1-g8)
- `consumables` — chemical/tool stock (c1-c6)
- `glass_requests` — glass request orders (items JSONB)

Schema file: `init.sql` (runs automatically on first Docker start)

#### Default Users (password hashes in init.sql)
- admin / admin123 (role: admin)
- mehmet / 1234, ali / 1234, hasan / 1234, murat / 1234 (role: field)
- isri / isri2024 (role: customer)

## Environment Variables Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key (min 64 chars) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public base URL |

## VPS Deployment

See `MIGRATE_TO_VPS.md` for full Hetzner CPX11 deployment guide including:
- Docker + PostgreSQL setup
- Nginx + Let's Encrypt SSL
- Automated daily backups
- Cloudflare R2 integration
- Cost analysis (~€8.60/month)

Files: `docker-compose.yml`, `init.sql`, `artifacts/api-server/Dockerfile`

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/mobile run dev` — run mobile app
