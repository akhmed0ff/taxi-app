# ANGREN TAXI

ANGREN TAXI is a taxi platform monorepo for Angren. It includes a NestJS backend, passenger and driver Expo apps, an admin dispatcher panel and deployment infrastructure.

## Stack

- Backend: NestJS, Prisma, PostgreSQL, Redis, Socket.IO, BullMQ
- Customer app: Expo, React Native, socket.io-client
- Driver app: Expo, React Native, expo-location, socket.io-client
- Admin: Next.js, Ant Design
- Infrastructure: Docker Compose, GitHub Actions CI/CD

## Structure

```text
backend/   NestJS API, order lifecycle, matching, realtime, payments
customer/  passenger mobile app
driver/    driver mobile app
admin/     dispatcher/admin panel
web/       browser client placeholder
docs/      architecture, deployment and roadmap
```

## Current Features

- Dev auth endpoint with JWT tokens: `POST /auth/dev-login`
- Order lifecycle: create, accept, arrive, start, complete, pay
- Dedicated `MatchingModule`
- Redis GEO driver search
- Driver status rules: `ONLINE`, `BUSY`, `OFFLINE`, `BLOCKED`
- Socket.IO rooms protected by JWT
- Customer app creates orders and tracks trip events
- Driver app goes online/offline, sends location, receives offers and completes trips
- Admin panel for monitoring, drivers, tariffs and analytics
- Health and metrics endpoints: `/health`, `/metrics`
- Docker and CI/CD baseline

## Quick Start

Install dependencies per app:

```bash
cd backend
npm install

cd ../admin
npm install

cd ../customer
npm install

cd ../driver
npm install
```

Start infrastructure if Docker is available:

```bash
docker compose up -d postgres redis
```

Run backend:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Run admin:

```bash
cd admin
npm run dev
```

Run mobile apps:

```bash
cd customer
npm run start

cd ../driver
npm run start
```

Default URLs:

- Backend: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Core Flow

1. Passenger logs in through dev auth and receives JWT.
2. Passenger creates an order with `POST /orders`.
3. Backend estimates fare and queues `find-driver`.
4. `MatchingModule` searches nearby `ONLINE` drivers in Redis GEO.
5. Driver receives `NEW_ORDER` over Socket.IO.
6. Driver accepts, arrives, starts and completes the trip.
7. Driver location is sent every few seconds while active.
8. Passenger receives realtime trip events.
9. Completion creates a pending payment; payment can be marked paid.

## Realtime Security

Socket.IO clients must send:

```ts
auth: { accessToken }
```

The gateway verifies JWT before joining rooms. Room IDs are derived from the token and database state, not from client-provided `driverId` or `passengerId`.

## Useful Commands

Backend:

```bash
cd backend
npm run build
npm run start:dev
```

Admin:

```bash
cd admin
npm run typecheck
npm run build
npm run dev
```

Mobile:

```bash
cd customer
npm run typecheck

cd ../driver
npm run typecheck
```

Docker:

```bash
docker compose up -d --build
```

## Documentation

- Architecture: [docs/architecture.md](docs/architecture.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
- Deployment: [docs/deployment.md](docs/deployment.md)

## CI/CD

GitHub Actions runs backend build, admin typecheck/build and Docker image build. VPS deploy is skipped unless these GitHub secrets are configured:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`
