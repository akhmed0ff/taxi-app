# Deployment

## Local Docker

Create `.env` in the repository root:

```env
POSTGRES_DB=taxi_app
POSTGRES_USER=taxi
POSTGRES_PASSWORD=taxi
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=3000
ADMIN_PORT=3001
JWT_SECRET=change-me
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Run the stack:

```bash
docker compose up -d --build
```

Services:

- Backend API: `http://localhost:3000`
- Admin panel: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## CI/CD

GitHub Actions workflow: `.github/workflows/ci-cd.yml`

Pipeline:

1. Install backend dependencies.
2. Generate Prisma client.
3. Apply migrations to CI Postgres.
4. Build backend.
5. Install admin dependencies.
6. Typecheck and build admin.
7. Build Docker images through `docker compose`.
8. Deploy to VPS on push to `main` when VPS secrets are configured.

Required GitHub secrets for deploy:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_APP_DIR
```

If these secrets are not configured, the deploy job is skipped successfully after CI and Docker build complete.

## VPS / Cloud

Minimum VPS:

- Ubuntu 22.04 or 24.04
- 2 CPU
- 2 GB RAM
- 30 GB SSD
- Docker Engine
- Docker Compose plugin
- Nginx or Caddy as reverse proxy

Server setup:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Clone and run:

```bash
git clone <repo-url> /opt/taxi-app
cd /opt/taxi-app
cp .env.example .env
docker compose up -d --build
```

Recommended domains:

- `api.example.com` -> backend port `3000`
- `admin.example.com` -> admin port `3001`

Production notes:

- Replace default database passwords and `JWT_SECRET`.
- Close direct Postgres and Redis ports in firewall if they are not needed externally.
- Enable HTTPS in the reverse proxy.
- Schedule Postgres backups for the `postgres-data` volume.
- Scrape `GET /metrics` with Prometheus or a hosted metrics service.
- Configure uptime checks and alerts against `GET /health`.
- For multiple backend replicas with Socket.IO, add sticky sessions at the load balancer or a Redis Socket.IO adapter.
