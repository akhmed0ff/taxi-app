import { strict as assert } from 'node:assert';
import { PricingService } from './pricing.service';
import { TariffClassValue } from './tariff-class';

const tariff = {
  tariffClass: TariffClassValue.STANDARD,
  city: 'Angren',
  baseFare: 3800,
  perKm: 2000,
  freeWaitingMinutes: 3,
  waitingPerMinute: 500,
  stopPerMinute: 500,
  minimumFare: 3800,
  active: true,
};

async function main() {
  const service = new PricingService({} as never);

  assert.deepEqual(service.getDefaultTariff(TariffClassValue.STANDARD), tariff);
  assert.deepEqual(service.getDefaultTariff(TariffClassValue.COMFORT), {
    tariffClass: TariffClassValue.COMFORT,
    city: 'Angren',
    baseFare: 10000,
    perKm: 2500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 16000,
    active: true,
  });
  assert.deepEqual(service.getDefaultTariff(TariffClassValue.COMFORT_PLUS), {
    tariffClass: TariffClassValue.COMFORT_PLUS,
    city: 'Angren',
    baseFare: 6500,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 6500,
    active: true,
  });

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 4,
    }),
    11800,
  );
  assert.deepEqual(
    service.calculateEstimatedFareDetails({
      tariff,
      distanceKm: 4,
    }),
    {
      tariffClass: TariffClassValue.STANDARD,
      currency: 'UZS',
      distanceKm: 4,
      baseFareAmount: 3800,
      distanceAmount: 8000,
      freeWaitingMinutes: 3,
      waitingMinutes: 0,
      paidWaitingMinutes: 0,
      waitingAmount: 0,
      stopMinutes: 0,
      stopAmount: 0,
      subtotal: 11800,
      minimumFare: 3800,
      minimumFareAdjustment: 0,
      total: 11800,
    },
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 3,
      stopMinutes: 0,
    }),
    11800,
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 0,
    }),
    12800,
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 2,
    }),
    13800,
  );
  assert.deepEqual(
    service.calculateFinalFareDetails({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 2,
    }),
    {
      tariffClass: TariffClassValue.STANDARD,
      currency: 'UZS',
      distanceKm: 4,
      baseFareAmount: 3800,
      distanceAmount: 8000,
      freeWaitingMinutes: 3,
      waitingMinutes: 5,
      paidWaitingMinutes: 2,
      waitingAmount: 1000,
      stopMinutes: 2,
      stopAmount: 1000,
      subtotal: 13800,
      minimumFare: 3800,
      minimumFareAdjustment: 0,
      total: 13800,
    },
  );

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 1,
    }),
    5800,
  );
}

void main();
