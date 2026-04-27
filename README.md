# ANGREN TAXI

Monorepo structure for the ANGREN TAXI platform.

## Folders

- `backend` - NestJS API, PostgreSQL, Redis, Socket.IO, BullMQ
- `customer` - passenger mobile app, React Native Expo
- `driver` - driver mobile app, React Native Expo
- `admin` - admin panel
- `web` - browser version of the app
- `docs` - architecture notes and project decisions

## System Model

The aggregator has five subsystems:

- Backend
- Mobile passenger app
- Mobile driver app
- Admin / dispatcher panel
- Web client version

They communicate through HTTP API, WebSocket realtime events and Queue background jobs.

See [docs/architecture.md](docs/architecture.md).

Development order is documented in [docs/roadmap.md](docs/roadmap.md).

## Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run infra:up
npm run prisma:migrate
npm run start:dev
```

Redis is configured in `docker-compose.yml`.

## Backend Architecture

```text
backend/src/
  modules/
    order/
    user/
    driver/
    pricing/
    payment/
    auth/
  infrastructure/
    db/
    redis/
    queue/
    socket/
```

Main rule: no business logic in controllers.

## Customer App

```bash
cd customer
npm install
npm run start
```

The passenger app includes Auth, Home map, Tariff selection, Driver search, Trip and Completion screens. It connects to Socket.IO and subscribes to `order:{id}` through `order.join`.

## Driver App

```bash
cd driver
npm install
npm run start
```

The driver app includes online/offline status, geotracking, incoming order offers with a timer, navigation, trip start/complete actions and balance.
