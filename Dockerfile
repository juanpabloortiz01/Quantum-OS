# ── BASE ──
FROM node:20-alpine AS base
WORKDIR /app

# ── DEPENDENCIAS ──
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── BUILD ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy?schema=public"

RUN npx prisma generate
RUN npm run build

# ── PRODUCCIÓN ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --fro