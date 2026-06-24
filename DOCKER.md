# Docker development setup

This guide runs the **full stack** in Docker for local development:

| Service | Container port | Host port | Notes |
|---------|----------------|-----------|--------|
| **Web** (Next.js) | 3001 | **3001** | Admin UI |
| **API** (NestJS) | 4000 | **4000** | Backend + collector sync |
| **MySQL** | 3306 | **3308** | Native Windows MySQL can keep **3306** |
| **Redis** | 6379 | **6379** | Optional — not required by the app yet |

Native development (without Docker) is unchanged and still uses the root `.env` file.

Docker uses a **separate** `.env.docker` file so your current setup is not affected.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows (or Docker Engine on Ubuntu)
- Git Bash or PowerShell
- Ports available: **3001**, **4000**, **3308**, **6379**

---

## First-time setup

### 1. Create `.env.docker`

```bash
copy .env.docker.example .env.docker
```

Edit `.env.docker`:

- Set `MYSQL_ROOT_PASSWORD` and matching `DATABASE_URL` password
- Set `JWT_SECRET` and `MIKROTIK_SECRET_KEY`
- Confirm `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`:
  - **Ubuntu dry-run server:** `http://10.250.106.199:4000`
  - **ZeroTier remote testing:** `http://172.27.201.182:4000`
  - **Docker on your Windows PC only (browser on same PC):** temporarily use `http://localhost:4000`

`DATABASE_URL` must use the Docker service name **`mysql`**, not `localhost`:

```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@mysql:3306/isp_billing
```

### 2. Build images

```bash
npm run docker:build
```

### 3. Start all services

```bash
npm run docker:up
```

On first start the API container will:

1. Wait for MySQL to be healthy
2. Run `prisma migrate deploy`
3. Run `prisma db seed` (idempotent upserts)
4. Start NestJS in watch mode

### 4. Open the app

| URL | Purpose |
|-----|---------|
| `http://localhost:3001` | Web admin (when Docker runs on your machine) |
| `http://10.250.106.199:3001` | Web admin (when Docker runs on Ubuntu server) |
| `http://10.250.106.199:4000` | API (mobile collector + direct API calls) |
| `http://172.27.201.182:4000` | API via ZeroTier (swap in `.env.docker` when needed) |

Default seeded admin (after seed):

- Email: `admin@ndtech.local`
- Password: `Admin@12345`

After the first successful seed, set `RUN_DB_SEED=false` in `.env.docker` to skip seeding on API restarts.

---

## Daily commands

```bash
# Build or rebuild images
npm run docker:build

# Start in background
npm run docker:up

# Stop containers (data volumes are kept)
npm run docker:down

# Restart all services
npm run docker:restart

# Follow logs (all services)
npm run docker:logs

# Container status
npm run docker:ps

# Re-run seed manually
npm run docker:seed
```

### Individual service logs

```bash
docker compose --env-file .env.docker logs -f api
docker compose --env-file .env.docker logs -f web
docker compose --env-file .env.docker logs -f mysql
```

### Rebuild one service after Dockerfile changes

```bash
docker compose --env-file .env.docker build api
docker compose --env-file .env.docker up -d api
```

---

## Flutter collector (mobile)

Point the collector app API URL to the **host** where Docker publishes port **4000**:

- Ubuntu LAN: `http://10.250.106.199:4000`
- ZeroTier: `http://172.27.201.182:4000`

Do **not** use `10.250.106.65` (Windows dev PC) unless you intentionally run Docker there and use that PC's LAN IP.

---

## Files added/changed

| File | Purpose |
|------|---------|
| `docker-compose.yml` | MySQL, Redis, API, Web services |
| `docker/api.Dockerfile.dev` | API dev image |
| `docker/web.Dockerfile.dev` | Web dev image |
| `docker/api-entrypoint.dev.sh` | Migrate, seed, start API watch mode |
| `.env.docker.example` | Template for Docker env vars |
| `apps/api/src/main.ts` | Loads `.env.docker` when `DOCKER_ENV=true`, binds `0.0.0.0` |
| `apps/web/next.config.ts` | Loads `.env.docker` in Docker |
| `apps/api/prisma.config.ts` | Uses `.env.docker` for Prisma CLI in Docker |
| `apps/api/prisma/seed.ts` | Uses `.env.docker` in Docker |

Your existing application code is not removed. Native `npm run dev` still works with the root `.env`.

---

## Troubleshooting

### API cannot connect to MySQL (`ECONNREFUSED`, `Access denied`)

1. Confirm `DATABASE_URL` host is **`mysql`** (not `127.0.0.1` or `localhost`) inside Docker.
2. Password in `DATABASE_URL` must match `MYSQL_ROOT_PASSWORD`.
3. Special characters in passwords must be URL-encoded in `DATABASE_URL` (e.g. `#` → `%23`).
4. Wait for MySQL healthcheck: `docker compose --env-file .env.docker ps` — `mysql` should be `healthy`.
5. From Windows host (optional DB tools): connect to `127.0.0.1:3308`, not `3306`.

### Port 3308 already in use

Change the host mapping in `docker-compose.yml`:

```yaml
ports:
  - "3309:3306"
```

### Port 3306 conflict with native MySQL

Docker MySQL is mapped to **3308** on purpose so native MySQL can keep **3306**. If `3308` is taken, change the left side of the mapping only.

### Web UI loads but API calls fail

`NEXT_PUBLIC_API_URL` must be reachable **from your browser**, not from inside Docker.

| Where you browse | Typical `NEXT_PUBLIC_API_URL` |
|------------------|-------------------------------|
| Same PC running Docker | `http://localhost:4000` |
| Ubuntu server deployment | `http://10.250.106.199:4000` |
| ZeroTier remote test | `http://172.27.201.182:4000` |

After changing `.env.docker`, rebuild/restart web:

```bash
docker compose --env-file .env.docker up -d --build web
```

### API works on server but not from phone

1. Open firewall ports **4000** (and **3001** for web) on the Ubuntu host.
2. Phone must reach `10.250.106.199` on the LAN (or ZeroTier IP when remote).
3. Collector app Settings → API URL must match `NEXT_PUBLIC_API_URL`.

### Hot reload not detecting file changes (Windows)

Compose sets `CHOKIDAR_USEPOLLING` and `WATCHPACK_POLLING` for API and Web. If watch still fails, restart the service:

```bash
docker compose --env-file .env.docker restart api web
```

### `.env` accidentally overriding Docker settings

Docker sets `DOCKER_ENV=true` and loads **only** `.env.docker` for API/Web/Prisma. Your root `.env` is ignored in containers.

### Fresh database reset

```bash
docker compose --env-file .env.docker down
docker volume rm ndtech-isp-management_mysql_docker_data
copy .env.docker.example .env.docker
# edit .env.docker, set RUN_DB_SEED=true
npm run docker:up
```

### Migrate existing `isp_billing` data later

1. Export from native MySQL: `mysqldump -u root -p isp_billing > backup.sql`
2. Import into Docker MySQL on host port 3308:

```bash
mysql -h 127.0.0.1 -P 3308 -u root -p isp_billing < backup.sql
```

---

## Port summary (unchanged)

| Port | Service |
|------|---------|
| 3001 | Web admin |
| 4000 | API |
| 3308 | Docker MySQL (host) → 3306 (container) |
| 3306 | Native Windows MySQL (unchanged) |
| 6379 | Redis (optional) |
| 8728 | MikroTik routers (external, per device) |
