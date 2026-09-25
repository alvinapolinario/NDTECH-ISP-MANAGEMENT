# syntax=docker/dockerfile:1
# Production API — compiled NestJS, no source bind-mount or watch mode.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN npm ci

COPY apps/api ./apps/api
COPY packages ./packages

WORKDIR /app/apps/api
ENV DATABASE_URL=mysql://root:build@localhost:3306/isp_billing
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DOCKER_ENV=true

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN npm ci

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker/api-entrypoint.prod.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
