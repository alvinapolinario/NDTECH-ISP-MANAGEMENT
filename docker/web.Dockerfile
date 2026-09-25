# syntax=docker/dockerfile:1
# Production web — next build + standalone server (no next dev).
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN npm ci

COPY apps/web ./apps/web
COPY packages ./packages

ARG NEXT_PUBLIC_BASE_PATH=/isp-billing
ARG NEXT_PUBLIC_API_URL=/isp-billing/backend
ARG NEXT_PUBLIC_SOCKET_URL=/isp-billing/backend

ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}

RUN npm run build --workspace=web

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
