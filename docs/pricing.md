# Pricing

ANGREN TAXI pricing is tuned for local taxi trips in Angren.

## Tariff Classes

Supported classes:

- `ECONOMY`
- `COMFORT`
- `PREMIUM`

Default ANGREN TAXI tariffs:

| Class | baseFare | perKm | freeWaitingMinutes | waitingPerMinute | stopPerMinute | minimumFare |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ECONOMY` | 7000 | 2000 | 3 | 500 | 500 | 12000 |
| `COMFORT` | 10000 | 2500 | 3 | 500 | 500 | 16000 |
| `PREMIUM` | 15000 | 3500 | 3 | 500 | 500 | 25000 |

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
  baseFareAmount + distanceAmount,
  minimumFare
)
```

This estimate intentionally excludes waiting and stop time because those are not known before the trip starts.

The ride stores:

- `estimatedFare` - integer total in UZS
- `estimatedFareDetails` - JSON breakdown with tariff class, base fare amount, distance amount, minimum fare adjustment and total

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
- `finalFareDetails`
- `waitingMinutes`
- `stopMinutes`

The pending payment is created with `finalFare`.

## Fare Details JSON

Both estimate and final calculations use the same breakdown shape:

```json
{
  "tariffClass": "ECONOMY",
  "currency": "UZS",
  "distanceKm": 4,
  "baseFareAmount": 7000,
  "distanceAmount": 8000,
  "freeWaitingMinutes": 3,
  "waitingMinutes": 5,
  "paidWaitingMinutes": 2,
  "waitingAmount": 1000,
  "stopMinutes": 2,
  "stopAmount": 1000,
  "subtotal": 17000,
  "minimumFare": 12000,
  "minimumFareAdjustment": 0,
  "total": 17000
}
```

For `estimatedFareDetails`, waiting and stop fields are `0`.

## Backend Commands

```bash
cd backend
npm run prisma:generate
npm run test:pricing
npm test
npm run build
```
