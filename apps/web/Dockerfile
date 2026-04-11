# Build from repository root:
#   docker build -f apps/web/Dockerfile .

FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web ./apps/web

RUN npm ci

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

RUN npm run build -w web

FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

WORKDIR /opt/aiml-migrate
COPY apps/web/docker/migrate-package.json ./package.json
RUN npm install --omit=dev && npm cache clean --force
COPY apps/web/drizzle ./drizzle
COPY apps/web/scripts/migrate.mjs ./migrate.mjs
COPY apps/web/scripts/seed.mjs ./seed.mjs
RUN chmod -R a+rX /opt/aiml-migrate

WORKDIR /app
COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

COPY apps/web/docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown nextjs:nodejs /app/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/app/entrypoint.sh"]
