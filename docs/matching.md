# Matching

ANGREN TAXI uses a dedicated `MatchingModule` to find drivers for rides in `SEARCHING_DRIVER`.

## Flow

1. `OrderService.create` creates a ride with status `SEARCHING_DRIVER`.
2. A `find-driver` job is added to the `ride-matching` queue.
3. `MatchingProcessor` searches drivers near the pickup point through Redis GEO.
4. `MatchingService` filters candidates by database status and sends `NEW_ORDER` only to `ONLINE` drivers.
5. The driver offer lives for `OFFER_TIMEOUT_MS` (`10_000` ms).
6. If no driver accepts before the timeout, the queue schedules the next attempt with a larger radius.
7. If the ride is accepted, its status changes from `SEARCHING_DRIVER` to `DRIVER_ASSIGNED`, and the next matching attempt stops.
8. If matching reaches `MAX_RADIUS_KM` and the ride is still searching, the ride is cancelled with reason `NO_DRIVER_FOUND`.

## Constants

Defined in `backend/src/modules/matching/matching.processor.ts`:

- `OFFER_TIMEOUT_MS = 10_000`
- `INITIAL_RADIUS_KM = 3`
- `MAX_RADIUS_KM = 12`

The radius grows by `3km` on each timeout until it reaches `MAX_RADIUS_KM`.

## Driver Eligibility

The backend must never send an order offer to drivers with these statuses:

- `BUSY`
- `OFFLINE`
- `BLOCKED`

Only drivers with status `ONLINE` pass the matching filter. Redis GEO is used for fast location lookup, but the database status remains the source of truth for driver availability.

## Accept Race Protection

`OrderService.accept` uses a Prisma transaction with conditional `updateMany`:

- the ride is assigned only when `status = SEARCHING_DRIVER`
- the ride must still have `driverId = null`
- the driver must be `ONLINE`

This prevents two drivers from accepting the same ride concurrently. The losing accept request receives a `400` error explaining that the ride has already been assigned or is no longer searching.

## Events

Driver events:

- `NEW_ORDER` - sent to eligible online drivers with `expiresInSeconds`
- `DRIVER_ACCEPTED` - emitted after successful accept

Passenger/order events:

- `DRIVER_ACCEPTED`
- `DRIVER_LOCATION`
- `TRIP_STARTED`
- `TRIP_COMPLETED`
- `MATCHING_FAILED`

## Tests

Run matching and core flow checks from `backend`:

```bash
npm run test:matching
npm run test:core-flow
```

