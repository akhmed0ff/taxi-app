# ANGREN TAXI Web

Browser MVP for the passenger app.

## Features

- Passenger register/login/logout.
- Refresh token support through the shared API client.
- Create a ride from `/order`.
- Track ride status from `/trip/[id]` with Socket.IO `auth: { accessToken }`.
- Passenger ride history from `/history`.
- Manual address and coordinate input for the MVP.

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

If the variable is not set, the app uses `http://localhost:3000`.

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run dev
```
