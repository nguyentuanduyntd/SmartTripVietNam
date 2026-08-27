# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# Cài dependency trong stage riêng để tận dụng Docker layer cache.
FROM base AS dependencies

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# Build ứng dụng Next.js.
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Next.js cần DATABASE_URL và một số cấu hình server khi collect page data.
# .env.local chỉ được mount tạm trong lệnh build, không bị copy vào image.
RUN --mount=type=secret,id=app_env,required=true \
    sh -c 'set -a && . /run/secrets/app_env && set +a && node node_modules/next/dist/bin/next build'

# Image chạy production.
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]