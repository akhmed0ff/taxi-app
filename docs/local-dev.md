# Local Development

This guide keeps local development and production Docker builds separated.

## Env Files

Root `.env` is used by Docker Compose. It is intentionally ignored by git.
Use `.env.example` as the local template.

For local development, use:

```env
NODE_ENV=development

POSTGRES_DB=taxi_app
POSTGRES_USER=taxi
POSTGRES_PASSWORD=taxi

DATABASE_URL=postgresql://taxi:taxi@localhost:5432/taxi_app?schema=public
JWT_SECRET=dev-secret-change-later-123456789

NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_ADMIN_PHONE=+998900000001
NEXT_PUBLIC_ADMIN_PASSWORD=AdminDevPass123!

MAPBOX_ACCESS_TOKEN=replace_me

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
```

Do not use these values in production:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_PASSWORD=password123
JWT_SECRET=change-me
```

## Variant A: Infrastructure in Docker, Apps Locally

Start Postgres and Redis:

```bash
docker compose up -d postgres redis
```

Run backend locally:

```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

Run admin locally:

```bash
cd admin
npm install
npm run dev
```

For local backend without Docker, use localhost hosts:

```env
DATABASE_URL=postgresql://taxi:taxi@localhost:5432/taxi_app?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Variant B: Everything in Docker

Build and start the stack:

```bash
docker compose build backend admin
docker compose up -d postgres redis migrate backend admin
```

Inside Docker, service names are used instead of localhost:

```env
DATABASE_URL=postgresql://taxi:taxi@postgres:5432/taxi_app?schema=public
REDIS_URL=redis://redis:6379
MAPBOX_ACCESS_TOKEN=${MAPBOX_ACCESS_TOKEN}
```

## Checks

```bash
docker compose config
docker compose build backend admin
docker compose up -d postgres redis
docker compose ps
```

Backend health:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/redis
curl http://127.0.0.1:3000/health/mapbox
```
