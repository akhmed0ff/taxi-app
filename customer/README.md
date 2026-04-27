# Customer App

Passenger mobile app built with React Native and Expo.

## Screens

- Auth - login / registration
- Home map - current position and A to B route selection
- Tariff selection - economy, comfort, premium and price
- Driver search - searching status and animation
- Trip - map, driver, ETA, chat and call actions
- Completion - price and rating

## Realtime

The app connects to Socket.IO and joins `order:{id}` through the `order.join` event.

Expected backend rooms:

- `passenger:{id}`
- `order:{id}`

Expected events:

- `NEW_ORDER`
- `DRIVER_ACCEPTED`
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
