# Redis GEO

Redis stores live driver coordinates for fast matching. PostgreSQL remains the source of truth for users, rides and driver status.

## Environment

For local Redis:

```env
REDIS_URL=redis://localhost:6379
```

For Upstash Redis:

```env
REDIS_URL=rediss://default:<password>@<host>:6379
```

Redis key names are configurable:

```env
REDIS_DRIVERS_GEO_KEY=drivers:geo
REDIS_DRIVER_STATUS_KEY_PREFIX=driver:status
REDIS_RIDE_OFFER_KEY_PREFIX=ride:offer
REDIS_RIDE_LOCK_KEY_PREFIX=ride:lock
```

## Data Key

Driver coordinates are stored in a Redis GEO sorted set:

```text
drivers:geo
```

Each member is the backend `driverId`.

## Writes

Driver location updates flow through:

```text
PATCH /drivers/:driverId/location
```

The backend allows location updates only when the driver is `ONLINE` or `BUSY`.

`RedisService.updateDriverLocation(driverId, lat, lng)` writes:

```text
GEOADD drivers:geo <lng> <lat> <driverId>
```

When a driver goes `OFFLINE`, `GeoService.removeDriverLocation(driverId)` removes the member from Redis:

```text
ZREM drivers:geo <driverId>
```

Driver status heartbeat:

```text
SET driver:status:{driverId} ONLINE EX 60
```

Ride offer TTL:

```text
SET ride:offer:{rideId}:{driverId} PENDING EX 10
```

Ride accept lock:

```text
SET ride:lock:{rideId} {driverId} NX EX 30
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

Backend health check:

```bash
curl http://localhost:3000/health/redis
```

Without Redis, `/health` fails and ride matching cannot search nearby drivers.
