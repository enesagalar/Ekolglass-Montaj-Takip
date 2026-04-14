FROM node:22-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN corepack enable && pnpm install --frozen-lockfile --filter @workspace/api-server

COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
