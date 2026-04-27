# Backend

NestJS backend for the ANGREN TAXI platform.

## Stack

- NestJS
- PostgreSQL through Prisma
- Redis for cache, live geo and BullMQ
- Socket.IO for realtime events
- BullMQ for background queues

## Quick Start

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run infra:up
npm run prisma:migrate
npm run start:dev
```

PostgreSQL and Redis must be running.

From the repository root, infrastructure can be started with:

```bash
docker compose up -d postgres redis
```

## Initial API

- `GET /users`
- `GET /drivers/online`
- `PATCH /drivers/:driverId/status`
- `PATCH /drivers/:driverId/location`
- `POST /orders`
- `GET /orders/:rideId`
- `PATCH /orders/:rideId/accept/:driverId`

## Modules

- `auth` - JWT, refresh tokens and roles: passenger, driver, admin
- `user` - passenger/admin/driver user profiles
- `driver` - status, rating and Redis GEO location
- `order` - order lifecycle and state machine
- `pricing` - base fare, price per km/minute and surge
- `payment` - cash/card payments and commission

## Architecture Rule

Controllers only receive HTTP input and delegate to services. Business logic lives in `src/modules/*` services and infrastructure concerns live in `src/infrastructure/*`.
