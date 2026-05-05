# Customer App

Passenger mobile app built with React Native and Expo.

## Screens

- Auth - login / registration
- Home - dev-mode без карты/маршрутов (фиксированный pickup + mock destinations)
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

- `ride.new_order` / `NEW_ORDER`
- `DRIVER_ACCEPTED`
- `DRIVER_LOCATION`
- `TRIP_STARTED`
- `TRIP_COMPLETED`

## Quick Start

```bash
npm install
npm run start
```

## Dev-mode (без карты и маршрутов)

- Управляется через `customer/src/config/flags.ts` (`FLAGS`)
- Pickup/Destinations берутся из `customer/src/dev/devLocations.ts` через `services/locations/locationProvider.ts`
- Маршруты выключены через `FLAGS.ENABLE_ROUTE_FETCHING=false`
- Цена считается временно через mock distance: `services/fare/fareService.ts` → `mapAdapter.getDistance(...)`

Environment variables:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```
