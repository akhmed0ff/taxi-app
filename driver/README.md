# Driver App

Driver mobile app built with React Native and Expo.

## Logic

- Online / offline switch
- Geotracking starts when driver goes online
- Incoming orders through push/socket flow
- Accept order timer, currently 8 seconds
- Navigation screen prepared for maps integration
- Trip controls: start / complete
- Balance: earnings and payout summary

## Geo Update

When online, the app sends driver coordinates every 2.5 seconds:

```ts
socket.emit('LOCATION_UPDATE', coords);
```

## Realtime

Expected backend room:

- `driver:{id}`

Expected events:

- `NEW_ORDER`
- `DRIVER_LOCATION`
- `TRIP_STARTED`
- `TRIP_COMPLETED`

## Quick Start

```bash
npm install
npm run start
```

Environment variables:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```
