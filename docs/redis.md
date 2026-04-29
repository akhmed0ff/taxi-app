# Redis GEO

Redis stores live driver coordinates for fast matching. PostgreSQL remains the source of truth for users, rides and driver status.

## Data Key

Driver coordinates are stored in a Redis GEO sorted set:

```text
drivers
```

Each member is the backend `driverId`.

## Writes

Driver location updates flow through:

```text
PATCH /drivers/:driverId/location
```

The backend allows location updates only when the driver is `ONLINE` or `BUSY`.

`GeoService.updateDriverLocation(driverId, lat, lng)` writes:

```text
GEOADD drivers <lng> <lat> <driverId>
```

When a driver goes `OFFLINE`, `GeoService.removeDriverLocation(driverId)` removes the member from Redis:

```text
ZREM drivers <driverId>
```

## Reads

Matching calls:

```ts
GeoService.findNearbyDrivers(lat, lng, radiusKm, limit)
```

It executes Redis `GEOSEARCH` with:

- `FROMLONLAT <lng> <lat>`
- `BYRADIUS <radiusKm> km`
- `WITHDIST`
- `ASC`
- `COUNT <limit>`

The result is converted to:

```ts
{
  driverId: string;
  distanceMeters: number;
}
```

`MatchingService` then verifies driver status in PostgreSQL and offers rides only to eligible drivers.

## Logs

`GeoService` logs:

- driver coordinate writes
- Redis write result
- driver coordinate removal
- GEO search input
- GEO search result count and distances

Example log shape:

```text
Redis GEO add driver=driver_123 lat=41.016700 lng=70.143600
Redis GEO search lat=41.016700 lng=70.143600 radiusKm=3 limit=10
Redis GEO search result count=2 drivers=driver_123:120m,driver_456:840m
```

## Local Redis

The normal local path is Docker Compose:

```bash
docker compose up -d redis
```

Verify:

```bash
redis-cli ping
```

Expected:

```text
PONG
```

Without Redis, `/health` fails and ride matching cannot search nearby drivers.
