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

Development auth:

- `POST /auth/dev-login` issues JWTs for local mobile flows until production login is implemented.
- Socket.IO still requires JWT; mobile apps use the dev-login token during local development.

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

- Dispatcher can see active orders.
- Admin can manage drivers and tariffs.
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
- Docker and CI/CD baseline.
- Health, metrics and request logging.

Next best focus:

1. Harden Stage 1 with real auth guards, role guards and endpoint tests.
2. Finish Stage 3 driver offer timeout and concurrent acceptance protection.
3. Connect mobile apps to real backend endpoints instead of mock flows.
