# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL) — service role client in API server
- **Build**: esbuild (ESM bundle)

## Artifacts

### API Server (`artifacts/api-server`)
- Express 5, TypeScript, esbuild
- Routes: `/api/auth/login|refresh|logout|me`, `/api/assemblies` (CRUD + photos/bulk + defects), `/api/users` (admin CRUD), `/api/stock`, `/api/consumables`
- Auth: Supabase JWT via `requireAuth` middleware (validates Bearer token with anon key `getUser`)
- Role guard: `requireRole(...)` reads `user.user_metadata.role`
- Supabase client: `lib/supabase.ts` (service role — bypasses RLS)

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

### Database (Supabase)

#### Tables
- `app_users` — username/email/role/active, linked to `auth.users`
- `assemblies` — main record (vehicle_model, vin, status, status_timestamps, etc.)
- `photos` — assembly photos (type, uri, angle)
- `defects` — defect records per assembly
- `activity_log` — audit log per assembly
- `glass_stock` — glass product inventory
- `consumables` — chemical/tool stock

Migration: `supabase/migrations/001_initial_schema.sql`

#### User Emails (Supabase Auth)
Format: `<username>@cam-montaj.internal`
Default users to seed (via POST `/api/users` as admin or Supabase Dashboard):
- admin / admin123 (role: admin)
- mehmet / 1234, ali / 1234, hasan / 1234, murat / 1234 (role: field)
- isri / isri2024 (role: customer)

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/mobile run dev` — run mobile app
