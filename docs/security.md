# Security

This document covers the current ANGREN TAXI security baseline for environment variables, auth shortcuts and API documentation.

## Production ENV Rules

Do not copy `.env.example` to a VPS. It contains local development values only.

Use `.env.production.example` as the production template and replace every placeholder before starting Docker Compose.

Required production values:

- `NODE_ENV=production`
- `JWT_SECRET` with at least 32 random characters
- `POSTGRES_PASSWORD` with a strong unique value
- `NEXT_PUBLIC_ADMIN_PASSWORD` with a strong unique value
- `NEXT_PUBLIC_API_URL` with the public HTTPS API URL
- `PUBLIC_API_URL` and `PUBLIC_ADMIN_URL` with public HTTPS URLs
- `ENABLE_DEV_LOGIN=false`

The backend refuses to start in production when:

- `JWT_SECRET` is missing
- `JWT_SECRET` is shorter than 32 characters
- `JWT_SECRET=change-me`
- `POSTGRES_PASSWORD` is `taxi`, `password`, `password123` or `change-me`
- `NEXT_PUBLIC_ADMIN_PASSWORD` is `taxi`, `password`, `password123` or `change-me`

## Generate Secrets

Recommended:

```bash
openssl rand -hex 32
```

Node.js alternative:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use different values for `JWT_SECRET`, `POSTGRES_PASSWORD` and `NEXT_PUBLIC_ADMIN_PASSWORD`.

## Dev Login

`POST /auth/dev-login` is a local integration shortcut only.

It works only when both conditions are true:

- `NODE_ENV !== production`
- `ENABLE_DEV_LOGIN=true`

Production must keep:

```env
ENABLE_DEV_LOGIN=false
```

Unset `ENABLE_DEV_LOGIN` also disables the endpoint.

## Updating ENV On VPS

```bash
cd /opt/taxi-app
nano .env
docker compose build backend admin
docker compose up -d postgres redis
docker compose run --rm migrate
docker compose up -d backend admin
docker compose ps
curl http://127.0.0.1:3000/health
```

After changing `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_ADMIN_PASSWORD`, rebuild the admin image because these values are used during the Next.js build.

## API Documentation

Swagger/OpenAPI is mounted at:

```text
GET /docs
```

The route is enabled only outside production. In production, use a local or staging environment to inspect the API spec.

Protected endpoints use Bearer auth:

```http
Authorization: Bearer <accessToken>
```

## Metrics

The backend exposes `/metrics` for observability. The production Nginx example blocks public access and allows only `127.0.0.1` by default. Add a private monitoring server IP only when needed.
