# Architecture

## 0. System Model

The taxi aggregator is split into five subsystems:

- `backend` - core business logic and integrations
- `customer` - passenger mobile app
- `driver` - driver mobile app
- `admin` - admin and dispatcher panel
- `web` - browser client version

All subsystems communicate through three channels:

- HTTP API - commands, queries, profile data, order lifecycle actions
- WebSocket - realtime order, driver, location and status updates
- Queue - background jobs, matching, notifications, cleanup and analytics

## Backend

Stack:

- NestJS
- PostgreSQL
- Redis
- Socket.IO
- BullMQ

Backend structure:

```text
backend/src/
  modules/
    auth/
    user/
    driver/
    matching/
    order/
    pricing/
    payment/
  infrastructure/
    db/
    redis/
    queue/
    socket/
  common/
```

Main rule: controllers do not contain business logic. Controllers receive input and delegate to module services.

## Key Services

Auth Service:

- JWT access token
- refresh token storage
- roles: `PASSENGER`, `DRIVER`, `ADMIN`

Driver Service:

- online/offline status
- current geolocation through Redis GEO
- rating
- `OFFLINE` and `BLOCKED` drivers are removed from Redis GEO
- only `ONLINE` and `BUSY` drivers can update location
- only `ONLINE` drivers can receive and accept new ride offers

Order Service:

- order creation
- order state machine
- cancel rules for passenger, driver and admin
- persistent `cancelReason` on cancelled rides

Order states:

```text
CREATED
  -> SEARCHING_DRIVER
  -> DRIVER_ASSIGNED
  -> DRIVER_ARRIVED
  -> IN_PROGRESS
  -> COMPLETED
  -> CANCELLED
```

Matching Engine:

- takes order pickup coordinates
- searches drivers through Redis GEO
- filters drivers by `ONLINE` status
- sends offers with a short TTL
- schedules the next matching attempt if nobody accepts
- expands search radius on each attempt
- cancels the ride with `NO_DRIVER_FOUND` after the final attempt

Pricing Service:

- base fare
- price per km
- price per minute
- dynamic surge multiplier

Payment Service:

- cash payment mode for MVP
- commission calculation

## Realtime

Socket rooms:

- `user:{id}`
- `driver:{id}`
- `passenger:{id}`
- `order:{id}`

Socket authentication:

- clients send `accessToken` in `handshake.auth.accessToken`
- gateway verifies JWT before joining any room
- passenger rooms use `sub` from token
- driver rooms use `Driver.id` resolved by token `sub`
- `order.join` checks that the passenger owns the ride, the driver is assigned to it, or the user is an admin

Events:

- `NEW_ORDER`
- `DRIVER_ACCEPTED`
- `DRIVER_LOCATION`
- `TRIP_STARTED`
- `TRIP_COMPLETED`
- `RIDE_CANCELLED`
- `PAYMENT_COMPLETED`

## Queues

BullMQ queues:

- driver matching
- notifications
- price recalculation

## Order Lifecycle

Full lifecycle:

```text
POST /orders
  -> backend estimates distance and fare
  -> ride status SEARCHING_DRIVER
  -> job ride-matching/find-driver
  -> matching emits NEW_ORDER to nearby driver rooms

PATCH /orders/:rideId/accept/:driverId
  -> ride status DRIVER_ASSIGNED
  -> driver status BUSY
  -> emits DRIVER_ACCEPTED

PATCH /orders/:rideId/arrive
  -> ride status DRIVER_ARRIVED

PATCH /orders/:rideId/start
  -> ride status IN_PROGRESS
  -> emits TRIP_STARTED

PATCH /drivers/:driverId/location
  -> updates Redis GEO
  -> emits DRIVER_LOCATION to order room while ride is active

PATCH /orders/:rideId/complete
  -> ride status COMPLETED
  -> creates pending payment
  -> driver status ONLINE
  -> emits TRIP_COMPLETED

PATCH /orders/:rideId/cancel
  -> validates actor-specific cancel rules
  -> stores cancelReason on Ride and RideStatusHistory
  -> ride status CANCELLED
  -> assigned BUSY driver returns ONLINE
  -> emits RIDE_CANCELLED

PATCH /orders/:rideId/pay
  -> payment status PAID
  -> emits PAYMENT_COMPLETED
```

## Production Baseline

Reliability:

- BullMQ jobs use retry with exponential backoff.
- Ride matching expands the search radius on each retry.
- If no driver is found after all attempts, the ride is cancelled with `NO_DRIVER_FOUND` and the passenger receives `MATCHING_FAILED`.

Speed:

- Driver geo is stored in Redis GEO, not queried from Postgres.
- Active tariff lookup is cached in Redis for short periods to avoid hitting DB on every order estimate.

State control:

- Ride status transitions are validated through `ORDER_STATUS_FLOW`.
- Invalid transitions return a bad request instead of mutating the ride.
- Cancel flow is actor-aware: passengers and drivers can cancel before `IN_PROGRESS`; admins can cancel any non-completed ride; `COMPLETED` and already `CANCELLED` rides are immutable.

Scalability:

- Backend instances are stateless.
- Shared runtime state lives in Postgres, Redis, Socket.IO rooms and BullMQ queues.
- Multiple backend containers can run behind a reverse proxy when Socket.IO sticky sessions or a Redis adapter are configured.

Observability:

- `GET /health` checks API, database and Redis.
- `GET /metrics` exposes Prometheus-style HTTP counters and uptime.
- HTTP requests are logged with method, route, status and duration.

## Geo

Redis GEO commands:

```text
GEOADD drivers lng lat driverId
GEORADIUS drivers ...
```

In implementation, modern Redis clients may use `GEOSEARCH` instead of deprecated `GEORADIUS`.
