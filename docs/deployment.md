# Deployment

This guide prepares the ANGREN TAXI MVP for a single VPS deployment with Docker Compose, Nginx and Certbot. Kubernetes is intentionally out of scope for the MVP.

## Target

`docker compose up -d --build` should start:

- `postgres`
- `redis`
- `backend`
- `admin`

Default local ports:

- Backend API: `http://localhost:3000`
- Admin panel: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Environment

For local development, copy `.env.example`:

```bash
cp .env.example .env
```

For VPS deployment, copy `.env.production.example`:

```bash
cp .env.production.example .env
```

Before starting production, replace:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `NEXT_PUBLIC_ADMIN_PASSWORD`
- `NEXT_PUBLIC_API_URL`
- `PUBLIC_API_URL`
- `PUBLIC_ADMIN_URL`

`NEXT_PUBLIC_API_URL` is passed to the admin image at build time, so rebuild admin after changing it:

```bash
docker compose build admin
docker compose up -d admin
```

## Docker Compose

The root `docker-compose.yml` contains:

- Postgres 16 with persistent `postgres-data` volume.
- Redis 7 with AOF persistence and `redis-data` volume.
- Backend image built from `backend/Dockerfile`.
- Admin image built from `admin/Dockerfile`.
- Healthchecks for Postgres, Redis, backend and admin.
- Docker JSON log rotation through `DOCKER_LOG_MAX_SIZE` and `DOCKER_LOG_MAX_FILE`.
- Postgres and Redis bound to `127.0.0.1` by default through `POSTGRES_BIND` and `REDIS_BIND`.

Start the stack:

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f backend
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

Apply Prisma migrations manually if needed:

```bash
docker compose exec backend npx prisma migrate deploy
```

The backend container also runs `prisma migrate deploy` before `node dist/main`.

## VPS Setup

Minimum VPS:

- Ubuntu 22.04 or 24.04
- 2 CPU
- 2 GB RAM
- 30 GB SSD
- Docker Engine
- Docker Compose plugin
- Nginx
- Certbot

Install Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Clone and start:

```bash
sudo mkdir -p /opt/taxi-app
sudo chown "$USER":"$USER" /opt/taxi-app
git clone https://github.com/akhmed0ff/taxi-app.git /opt/taxi-app
cd /opt/taxi-app
cp .env.production.example .env
nano .env
docker compose up -d --build
```

Recommended DNS:

- `api.example.com` -> VPS IP
- `admin.example.com` -> VPS IP

## Nginx Reverse Proxy

Example config:

```text
infra/nginx/taxi-app.conf
```

Install it on the VPS:

```bash
sudo cp infra/nginx/taxi-app.conf /etc/nginx/sites-available/taxi-app.conf
sudo ln -s /etc/nginx/sites-available/taxi-app.conf /etc/nginx/sites-enabled/taxi-app.conf
sudo nginx -t
sudo systemctl reload nginx
```

Replace `api.example.com` and `admin.example.com` before enabling it.

The API location includes WebSocket upgrade headers for Socket.IO and separate access/error logs:

- `/var/log/nginx/taxi-api.access.log`
- `/var/log/nginx/taxi-api.error.log`
- `/var/log/nginx/taxi-admin.access.log`
- `/var/log/nginx/taxi-admin.error.log`

The provided config assumes Nginx runs directly on the VPS host and proxies to Docker-published local ports:

- `127.0.0.1:3000` -> backend
- `127.0.0.1:3001` -> admin

## HTTPS With Certbot

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue certificates:

```bash
sudo certbot --nginx -d api.example.com -d admin.example.com
```

Verify renewal:

```bash
sudo certbot renew --dry-run
```

Certbot will update the Nginx config to listen on HTTPS and redirect HTTP to HTTPS.

## Postgres Backups

Backup script:

```text
scripts/backup-postgres.sh
```

Run manually:

```bash
BACKUP_DIR=/opt/taxi-app/backups/postgres ./scripts/backup-postgres.sh
```

Cron example, daily at 03:15 UTC:

```cron
15 3 * * * cd /opt/taxi-app && BACKUP_DIR=/opt/taxi-app/backups/postgres ./scripts/backup-postgres.sh >> /var/log/taxi-postgres-backup.log 2>&1
```

Restore example:

```bash
gunzip -c backups/postgres/taxi_app_YYYYMMDDTHHMMSSZ.sql.gz | docker compose exec -T postgres psql -U taxi taxi_app
```

Store production backups outside the repo working tree or sync them to object storage.

## Healthchecks

Backend health endpoint:

```bash
curl https://api.example.com/health
```

Expected response:

```json
{
  "ok": true,
  "services": {
    "api": "up",
    "database": "up",
    "redis": "up"
  }
}
```

Docker Compose backend healthcheck calls `GET /health` from inside the backend container.

Metrics endpoint:

```bash
curl https://api.example.com/metrics
```

It exposes Prometheus-style HTTP counters and uptime from the NestJS observability module.

Admin healthcheck:

```bash
docker compose ps admin
curl http://127.0.0.1:3001
```

## Logging

Application logs are written to stdout/stderr and collected by Docker:

```bash
docker compose logs -f backend
docker compose logs -f admin
docker compose logs --tail=200 backend
```

The backend has an HTTP logging interceptor that records method, route, status code and duration. Matching flow logs are emitted by `MatchingService` and `MatchingProcessor`.

Docker log rotation is controlled by:

```env
DOCKER_LOG_MAX_SIZE=10m
DOCKER_LOG_MAX_FILE=5
```

Nginx access/error logs are separate per domain as shown above.

## Firewall

Recommended public ports:

- `80/tcp`
- `443/tcp`
- `22/tcp`

Postgres and Redis should not be public in production. If direct host ports are not needed, block `5432` and `6379` with the VPS firewall.

## CI/CD

GitHub Actions workflow:

```text
.github/workflows/ci-cd.yml
```

Deployment runs on `main` only when these secrets are configured:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_APP_DIR
```

If secrets are missing, CI still runs build checks and skips VPS deployment.

Deploy steps:

1. `git pull --ff-only`
2. `docker compose build backend admin`
3. `docker compose up -d postgres redis backend admin`
4. `docker compose ps`
5. backend container health probe against `http://127.0.0.1:3000/health` with retries
6. `docker image prune -f`

## Production Checklist

- Replace all default secrets in `.env`.
- Set `NEXT_PUBLIC_API_URL=https://api.example.com`.
- Rebuild admin after env changes.
- Run `docker compose up -d --build`.
- Confirm `docker compose ps` shows healthy backend.
- Confirm `https://api.example.com/health`.
- Confirm `https://api.example.com/metrics`.
- Confirm `https://admin.example.com` loads.
- Confirm Socket.IO works through Nginx by creating a ride and watching live admin updates.
- Enable Certbot renewal.
- Configure daily Postgres backups.
- Keep Kubernetes out of MVP until one VPS is no longer enough.
