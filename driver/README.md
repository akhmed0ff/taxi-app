# Driver App

Driver mobile app built with React Native and Expo.

## Logic

- Online / offline switch
- Geotracking starts when driver goes online
- Incoming orders through push/socket flow
- Accept order timer, currently 8 seconds
- Navigation/Trip screens use a stable fake map (Mapbox installed but disabled via flags)
- Trip controls: start / complete
- Balance: earnings and payout summary

## Geo Update

When online, the app sends driver coordinates periodically to the backend:
- `PATCH /drivers/:driverId/location`

## Realtime

Expected backend room:

- `driver:{id}`

Expected events:

- `new_ride_offer` (driver offer)
- `DRIVER_LOCATION`
- `TRIP_STARTED`
- `TRIP_COMPLETED`

## Quick Start

```bash
npm install
npm run start
```

## Feature flags

Flags live in `driver/src/config/flags.ts`.
While `FLAGS.USE_MOCK_MAP=true`, UI renders `FakeDriverMap` and does not require a Mapbox token.

Environment variables:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```
