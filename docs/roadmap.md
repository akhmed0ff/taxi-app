# Development Roadmap

This is the practical build order for the taxi platform. Each stage should leave the system in a working, testable state before moving to the next one.

## Stage 1 - Core Backend

Goal: build the business core first.

Scope:

- Auth: registration, login, JWT access tokens, refresh tokens, roles.
- Users: passenger, driver, admin roles.
- Orders: create order, calculate estimate, order lifecycle state machine.
- Drivers: driver profile, online/offline status, location update endpoint.
- Storage: PostgreSQL schema, Prisma migrations.
- Runtime data: Redis for driver geo and short-lived cache.

Done when:

- Backend starts locally.
- PostgreSQL migrations apply cleanly.
- Passenger can create an order.
- Driver can go online and update location.
- Order states cannot be changed through invalid transitions.

## Stage 2 - Realtime

Goal: make order and driver state visible immediately.

Scope:

- Socket.IO gateway.
- Rooms: `passenger:{id}`, `driver:{id}`, `order:{id}`.
- Events: `NEW_ORDER`, `DRIVER_ACCEPTED`, `DRIVER_LOCATION`, `TRIP_STARTED`, `TRIP_COMPLETED`, `PAYMENT_COMPLETED`.
- Driver location streaming to the active order room.

Done when:

- Passenger receives order updates without polling.
- Driver receives incoming order offers.
- Active trip screen receives driver coordinates in realtime.

## Stage 3 - Matching

Goal: reliably connect orders to nearby drivers.

Scope:

- BullMQ ride matching queue.
- Redis GEO search for nearby drivers.
- Retry with exponential backoff.
- Expanding search radius fallback.
- Failed matching result when no driver is found.
- Driver offer timeout and acceptance rules.

Done when:

- New order enters the matching queue.
- Nearby drivers receive offers.
- First valid driver acceptance assigns the ride.
- No-driver scenario is handled cleanly.

## Stage 4 - Mobile Apps

Goal: build the two operational mobile apps.

Passenger app:

- Auth.
- Pickup/dropoff selection.
- Tariff selection.
- Driver search screen.
- Active trip screen with driver location.
- Trip completion screen.
- Creates rides through `POST /orders`.
- Joins `order:{id}` over Socket.IO after ride creation.
- Reacts to `DRIVER_ACCEPTED`, `DRIVER_LOCATION`, `TRIP_STARTED` and `TRIP_COMPLETED`.

Driver app:

- Auth.
- Online/offline toggle.
- Background/location streaming.
- Incoming order offer screen.
- Arrived/start/complete controls.
- Balance and trip summary.
- Sends status through `PATCH /drivers/:driverId/status`.
- Sends location through `PATCH /drivers/:driverId/location` every few seconds while active.
- Receives `NEW_ORDER` over Socket.IO.
- Calls accept/arrive/start/complete ride endpoints.

Auth:

- Mobile apps use `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` and `POST /auth/logout`.
- Socket.IO requires JWT through `handshake.auth.accessToken`.

Localization:

- Passenger and driver apps support Russian and Uzbek UI dictionaries.
- Russian is the default language.

Done when:

- Passenger can request a ride from the app.
- Driver can accept and complete the ride from the app.
- Both apps receive realtime lifecycle events.

## Stage 5 - Admin

Goal: give operators control over the platform.

Scope:

- Monitoring dashboard.
- Active orders and trips.
- Driver management.
- Blocking/unblocking drivers.
- Document review.
- Tariff configuration.
- Analytics: trips, revenue, active drivers, conversion.

Done when:

- Dispatcher can see active orders from `GET /orders/active`.
- Admin can load drivers from `GET /drivers`.
- Admin can load and save tariffs through `/admin/tariffs`.
- Loading and error states are visible when backend calls are pending or fail.
- Mock data is used only as a development fallback and is disabled in production builds.
- Operations metrics are visible.

## Stage 6 - Payment

Goal: make completed trips financially correct.

Scope:

- Cash and card payment flows.
- Pending/paid/failed/refunded payment states.
- Commission calculation.
- Driver payouts.
- Payment provider integration when card payments are enabled.
- Receipt and transaction history.

Done when:

- Completed ride creates a payment.
- Payment can be marked paid or failed.
- Commission is calculated and stored.
- Driver balance reflects completed trips.

## Stage 7 - Scaling

Goal: prepare the system for production load.

Scope:

- Stateless backend containers.
- Dockerized deployment.
- CI/CD pipeline.
- Health checks.
- Metrics and logs.
- Alerts.
- Postgres backups.
- Redis persistence.
- Reverse proxy with HTTPS.
- Sticky sessions or Redis adapter for Socket.IO when running multiple backend replicas.

Done when:

- The stack can be deployed to VPS or cloud with Docker Compose.
- CI builds backend, admin and Docker images.
- `/health` and `/metrics` are available.
- A failed service can be detected and restarted.
- Production secrets are outside source code.

## Current Project Position

Already started:

- Core backend structure.
- Auth/order/driver/payment/pricing modules.
- PostgreSQL and Redis integration.
- Realtime Socket.IO gateway.
- Ride matching queue.
- Passenger and driver Expo app prototypes.
- Admin panel prototype.
- Admin panel connected to backend API for drivers, active orders, tariffs and basic analytics with development-only mock fallback.
- Docker and CI/CD baseline.
- Health, metrics and request logging.
- Backend hardening for Stage 1 and Stage 3:
  - JWT AuthGuard and role guard for protected HTTP endpoints.
  - Protected orders, drivers, users and admin tariffs endpoints.
  - Atomic ride accept with conditional `updateMany` so only one driver can claim a ride.
  - Matching offer timeout with Redis GEO search, online-driver filtering and radius expansion.
  - Service-level tests for order lifecycle, concurrent accept and matching timeout behavior.

Next best focus:

1. Add endpoint-level tests around protected admin/order/driver HTTP routes.
2. Replace local admin dev-login fallback with seeded production admin credentials.
3. Add backend aggregate endpoints for completed/cancelled analytics instead of deriving only basic live metrics from current admin API calls.
