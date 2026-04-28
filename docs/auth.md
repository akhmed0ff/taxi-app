# Backend Auth

ANGREN TAXI backend uses JWT access tokens for protected HTTP endpoints and Socket.IO connections.

## Auth Endpoints

Production-ready endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/register` | Create a user with `phone`, `password`, optional `name`, role `PASSENGER` or `DRIVER` |
| `POST /auth/login` | Login with `phone` and `password` |
| `POST /auth/refresh` | Rotate a valid refresh token and issue a new access/refresh pair |
| `POST /auth/logout` | Revoke a refresh token |

`POST /auth/dev-login` exists only for local development and test builds. It keeps the old shortcut behavior when `NODE_ENV !== production`, but returns `403 Forbidden` when `NODE_ENV=production`.

## Register/Login

Register:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901112233","password":"password123","name":"Driver","role":"DRIVER"}'
```

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901112233","password":"password123"}'
```

Both endpoints return:

- `accessToken`
- `refreshToken`
- `user`
- `driver` when the role is `DRIVER`

Passwords are stored as bcrypt hashes. Refresh tokens are stored hashed in the database.

## Development-Only Login

Local shortcut:

```bash
curl -X POST http://localhost:3000/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901112233","name":"Local Driver","role":"DRIVER"}'
```

Production behavior:

```bash
NODE_ENV=production
# POST /auth/dev-login -> 403 Forbidden
```

Use `/auth/register` and `/auth/login` for production users.

## Refresh/Logout

Refresh token rotation:

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

The used refresh token is revoked and a new refresh token is issued.

Refresh token rules:

- the client sends raw `refreshToken`
- the backend stores only `sha256(refreshToken)` in `RefreshToken.tokenHash`
- `/auth/refresh` accepts only tokens that exist, are not revoked, and have not expired
- a successful refresh revokes the used token and returns a new `accessToken` and `refreshToken`
- a revoked or expired refresh token returns `401 Unauthorized`

Logout:

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

Logout revokes the submitted refresh token and returns `{ "ok": true }`.
After logout, calling `/auth/refresh` with the same refresh token returns `401 Unauthorized`.

## Roles

Supported roles:

- `PASSENGER` - passenger mobile app
- `DRIVER` - driver mobile app
- `ADMIN` - admin panel and operational tools

Role checks are enforced with:

- `JwtAuthGuard` - reads `Authorization: Bearer <accessToken>` and stores `userId` / `role` on the request
- `RolesGuard` - allows access only when the endpoint role metadata includes the authenticated user's role

## HTTP Authorization

Protected requests must include:

```http
Authorization: Bearer <accessToken>
```

Current role matrix:

| Endpoint | Roles |
| --- | --- |
| `POST /orders` | `PASSENGER`, `ADMIN` |
| `GET /orders/active` | `ADMIN` |
| `GET /orders/:rideId` | `PASSENGER`, `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/accept/:driverId` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/arrive` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/start` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/complete` | `DRIVER`, `ADMIN` |
| `PATCH /orders/:rideId/pay` | `PASSENGER`, `ADMIN` |
| `GET /drivers` | `ADMIN` |
| `GET /drivers/online` | `ADMIN` |
| `PATCH /drivers/:driverId/status` | `DRIVER`, `ADMIN` |
| `PATCH /drivers/:driverId/location` | `DRIVER`, `ADMIN` |
| `GET /admin/tariffs` | `ADMIN` |
| `POST /admin/tariffs` | `ADMIN` |
| `PATCH /admin/tariffs/:tariffId` | `ADMIN` |
| `GET /users` | `ADMIN` |

`/health`, `/metrics`, `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/logout` are public by design.

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

The customer and driver apps use:

- `POST /auth/register` on first local run
- `POST /auth/login` when the phone is already registered
- `accessToken` for HTTP endpoints and Socket.IO
- `refreshToken` retained in the session object for refresh/logout flows

For MVP screens, the apps use environment-configurable development passwords:

- `EXPO_PUBLIC_CUSTOMER_PASSWORD`
- `EXPO_PUBLIC_DRIVER_PASSWORD`

Default local value is `password123`.
