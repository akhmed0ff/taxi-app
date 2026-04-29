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
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-public-token
```

If `NEXT_PUBLIC_API_URL` is not set, the app uses `http://localhost:3000`.
If `NEXT_PUBLIC_MAPBOX_TOKEN` is not set, the order page shows a coordinate fallback instead of the Mapbox map.

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run dev
```
