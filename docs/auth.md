# Backend Auth

ANGREN TAXI backend uses JWT access tokens for protected HTTP endpoints and Socket.IO connections.

## Roles

Supported roles:

- `PASSENGER` - passenger mobile app
- `DRIVER` - driver mobile app
- `ADMIN` - admin panel and operational tools

Role checks are enforced with:

- `JwtAuthGuard` - reads `Authorization: Bearer <accessToken>` and stores `userId` / `role` on the request
- `RolesGuard` - allows access only when the endpoint role metadata includes the authenticated user's role

## Development Login

`POST /auth/dev-login` is intentionally left open for local development and mobile integration.

This endpoint is development-only. It creates or updates a test user, optionally creates a driver profile, and returns `accessToken` / `refreshToken`.

Example:

```bash
curl -X POST http://localhost:3000/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901112233","name":"Driver","role":"DRIVER"}'
```

Before production, replace this endpoint with OTP/password auth or disable it outside development environments.

## HTTP Authorization

Protected requests must include:

```http
Authorization: Bearer <accessToken>
```

Current role matrix:

| Endpoint | Roles |
| --- | --- |
| `POST /orders` | `PASSENGER`, `ADMIN` |
| `GET /orders/:rideId` | `PASSENGER`, `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/accept/:driverId` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/arrive` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/start` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/complete` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/pay` | `PASSENGER`, `ADMIN` |
| `GET /drivers/online` | `ADMIN` |
| `PATCH /drivers/:driverId/status` | `DRIVER`, `ADMIN` |
| `PATCH /drivers/:driverId/location` | `DRIVER`, `ADMIN` |
| `GET /admin/tariffs` | `ADMIN` |
| `POST /admin/tariffs` | `ADMIN` |
| `PATCH /admin/tariffs/:tariffId` | `ADMIN` |
| `GET /users` | `ADMIN` |

`/health`, `/metrics`, and `/auth/dev-login` are public by design.

## Socket.IO Authorization

Socket clients must send `accessToken` in the handshake:

```ts
io(SOCKET_URL, {
  transports: ['websocket'],
  auth: { accessToken },
});
```

The gateway verifies the JWT and derives `userId`, role, and `driverId` from the token/database. Clients cannot choose another driver or passenger room through handshake data.

`order.join` is allowed only when:

- passenger owns the ride
- driver is assigned to the ride
- user is `ADMIN`

## Mobile Flow

The customer and driver apps should keep using `dev-login` during development, then pass the returned `accessToken` to:

- HTTP endpoints via `Authorization: Bearer <accessToken>`
- Socket.IO via `auth.accessToken`

