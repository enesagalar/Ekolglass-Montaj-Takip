# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Mobile App (`artifacts/mobile`)
- **Framework**: Expo / React Native
- **Type**: Vehicle windshield glass installation tracking system (Cam Montaj Takip)
- **Routing**: Expo Router (file-based)
- **State**: React Context + AsyncStorage (local persistence)
- **UI**: Custom design tokens, Inter font, dark/light mode support

#### Features
- Role-based login: Field Staff, Admin, Customer
- Assembly record list with search and status filter
- New assembly creation form (VIN required, glass type, customer info, staff assignment)
- Assembly detail: status tracking, defect logging, status progression flow
- Admin dashboard: stats, staff workload chart, active records
- Profile screen with stats and logout

#### Screens
- `app/login.tsx` — role selection
- `app/(tabs)/index.tsx` — assembly list
- `app/(tabs)/admin.tsx` — admin panel
- `app/(tabs)/profile.tsx` — user profile
- `app/new-assembly.tsx` — new assembly form (modal)
- `app/assembly/[id].tsx` — assembly detail with defect management

#### Context
- `context/AppContext.tsx` — assemblies, user role, CRUD operations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
