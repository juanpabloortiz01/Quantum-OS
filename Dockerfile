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

# Variable dummy para que Prisma no falle durante el build
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy?schema=public"

# Genera el cliente Prisma antes del build
RUN npx prisma generate
RUN npm run build

# ── PRODUCCIÓN ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]