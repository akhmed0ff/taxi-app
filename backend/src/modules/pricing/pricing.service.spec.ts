import { strict as assert } from 'node:assert';
import { PricingService } from './pricing.service';
import { TariffClassValue } from './tariff-class';

const tariff = {
  tariffClass: TariffClassValue.ECONOMY,
  city: 'Angren',
  baseFare: 7000,
  perKm: 2000,
  freeWaitingMinutes: 3,
  waitingPerMinute: 500,
  stopPerMinute: 500,
  minimumFare: 12000,
  active: true,
};

async function main() {
  const service = new PricingService({} as never);

  assert.deepEqual(service.getDefaultTariff(TariffClassValue.ECONOMY), tariff);
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
  assert.deepEqual(service.getDefaultTariff(TariffClassValue.PREMIUM), {
    tariffClass: TariffClassValue.PREMIUM,
    city: 'Angren',
    baseFare: 15000,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 25000,
    active: true,
  });

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 4,
    }),
    15000,
  );
  assert.deepEqual(
    service.calculateEstimatedFareDetails({
      tariff,
      distanceKm: 4,
    }),
    {
      tariffClass: TariffClassValue.ECONOMY,
      currency: 'UZS',
      distanceKm: 4,
      baseFareAmount: 7000,
      distanceAmount: 8000,
      freeWaitingMinutes: 3,
      waitingMinutes: 0,
      paidWaitingMinutes: 0,
      waitingAmount: 0,
      stopMinutes: 0,
      stopAmount: 0,
      subtotal: 15000,
      minimumFare: 12000,
      minimumFareAdjustment: 0,
      total: 15000,
    },
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 3,
      stopMinutes: 0,
    }),
    15000,
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 0,
    }),
    16000,
  );

  assert.equal(
    service.calculateFinalFare({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 2,
    }),
    17000,
  );
  assert.deepEqual(
    service.calculateFinalFareDetails({
      tariff,
      distanceKm: 4,
      waitingMinutes: 5,
      stopMinutes: 2,
    }),
    {
      tariffClass: TariffClassValue.ECONOMY,
      currency: 'UZS',
      distanceKm: 4,
      baseFareAmount: 7000,
      distanceAmount: 8000,
      freeWaitingMinutes: 3,
      waitingMinutes: 5,
      paidWaitingMinutes: 2,
      waitingAmount: 1000,
      stopMinutes: 2,
      stopAmount: 1000,
      subtotal: 17000,
      minimumFare: 12000,
      minimumFareAdjustment: 0,
      total: 17000,
    },
  );

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 1,
    }),
    12000,
  );
}

void main();
