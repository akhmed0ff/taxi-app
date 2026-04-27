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

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 4,
    }),
    15000,
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

  assert.equal(
    service.calculateEstimatedFare({
      tariff,
      distanceKm: 1,
    }),
    12000,
  );
}

void main();
