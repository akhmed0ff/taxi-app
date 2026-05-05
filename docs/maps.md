# Maps

ANGREN TAXI uses a lightweight maps setup for the MVP. The goal is to show ride context, not to provide full navigation or geocoding yet.

## Backend Mapbox

The backend uses `MAPBOX_ACCESS_TOKEN` through `MapboxService`.

Methods:

- `geocode(address)`
- `reverseGeocode(lat, lng)`
- `getRoute(originLat, originLng, destLat, destLng)`

`OrderService` uses Mapbox Directions for route distance when `MAPBOX_ACCESS_TOKEN` is configured. If Mapbox is unavailable locally, it falls back to the existing Haversine distance calculation.

Health check:

```bash
curl http://localhost:3000/health/mapbox
```

## Customer App

The Expo customer app uses `react-native-maps` for a minimal map:

- Home screen shows current/pickup position.
- Destination is represented as a simple dropoff marker.
- A straight `Polyline` shows the MVP route.
- Trip screen shows pickup, dropoff and live driver position when `DRIVER_LOCATION` arrives.

This is not production routing. It is a visual MVP layer over the backend flow.

## Driver App

The Expo driver app uses `react-native-maps` for:

- Current driver position.
- Pickup marker while driving to the passenger.
- Pickup/dropoff markers during the trip.
- Simple straight-line route display.

Driver coordinates continue to be sent through the existing foreground tracking hook every few seconds while the driver is `ONLINE` or `BUSY`.

## Not Included Yet

- Turn-by-turn navigation.
- Mapbox Directions API.
- Production geocoding.
- Route ETA based on road network.
- Offline map packs.
