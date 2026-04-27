# Pricing

ANGREN TAXI pricing is tuned for local taxi trips in Angren.

## Tariff Classes

Supported classes:

- `ECONOMY`
- `COMFORT`
- `PREMIUM`

Each tariff stores:

- `baseFare`
- `perKm`
- `freeWaitingMinutes`
- `waitingPerMinute`
- `stopPerMinute`
- `minimumFare`

Default local rules:

- First `3` waiting minutes are free.
- Waiting after the free period costs `500 UZS/min`.
- Distance costs `2000 UZS/km` unless the tariff overrides `perKm`.
- Stops during the trip cost `500 UZS/min`.

## Estimated Fare

Estimated fare is calculated when a ride is created:

```text
estimatedFare = max(
  baseFare + distanceKm * perKm,
  minimumFare
)
```

This estimate intentionally excludes waiting and stop time because those are not known before the trip starts.

## Final Fare

Final fare is calculated when the ride is completed:

```text
paidWaitingMinutes = max(0, waitingMinutes - freeWaitingMinutes)

finalFare = max(
  baseFare
  + distanceKm * perKm
  + paidWaitingMinutes * waitingPerMinute
  + stopMinutes * stopPerMinute,
  minimumFare
)
```

The completed ride stores:

- `finalFare`
- `waitingMinutes`
- `stopMinutes`

The pending payment is created with `finalFare`.

## Backend Commands

```bash
cd backend
npm run prisma:generate
npm run test:pricing
npm test
npm run build
```

