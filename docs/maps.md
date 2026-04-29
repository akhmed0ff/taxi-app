# Maps

ANGREN TAXI uses a lightweight maps setup for the MVP. The goal is to show ride context, not to provide full navigation or geocoding yet.

## Web Mapbox

The passenger web app in `web/` uses Mapbox GL JS on `/order`.

Environment:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-public-token
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Behavior:

- The map is shown on `/order`.
- Pickup and dropoff markers update from the manual coordinate fields.
- If `NEXT_PUBLIC_MAPBOX_TOKEN` is missing, the page shows a coordinate fallback.
- No geocoding is performed in the MVP. Users still enter address text and lat/lng manually.

Local check:

```bash
cd web
npm run dev
```

Open:

```text
http://localhost:3002/order
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
