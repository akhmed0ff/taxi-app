import { strict as assert } from 'node:assert';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RatingService } from './rating.service';

type DriverState = {
  id: string;
  userId: string;
  rating: number;
};

type RideState = {
  id: string;
  customerId: string;
  driverId: string | null;
  status: string;
  passengerRating: number | null;
  driverRating: number | null;
  createdAt: Date;
  driver?: DriverState | null;
};

function createPrismaMock() {
  const state = {
    drivers: new Map<string, DriverState>([
      ['driver-1', { id: 'driver-1', userId: 'driver-user-1', rating: 5 }],
    ]),
    rides: new Map<string, RideState>([
      {
        id: 'ride-1',
        customerId: 'passenger-1',
        driverId: 'driver-1',
        status: 'COMPLETED',
        passengerRating: null,
        driverRating: null,
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
      },
      {
        id: 'ride-2',
        customerId: 'passenger-2',
        driverId: 'driver-1',
        status: 'COMPLETED',
        passengerRating: 5,
        driverRating: null,
        createdAt: new Date('2026-05-04T10:00:00.000Z'),
      },
      {
        id: 'ride-3',
        customerId: 'passenger-3',
        driverId: 'driver-1',
        status: 'COMPLETED',
        passengerRating: 3,
        driverRating: null,
        createdAt: new Date('2026-05-03T10:00:00.000Z'),
      },
    ].map((ride) => [ride.id, ride])),
  };

  const tx = {
    ride: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const ride = state.rides.get(where.id);
        return ride ? withDriver(ride, state.drivers) : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<RideState>;
      }) => {
        const ride = state.rides.get(where.id);
        if (!ride) {
          throw new Error('Ride not found');
        }

        const updated = { ...ride, ...data };
        state.rides.set(where.id, updated);
        return withDriver(updated, state.drivers);
      },
      findMany: async ({
        where,
        take,
      }: {
        where: { driverId: string; passengerRating: { not: null } };
        take: number;
      }) =>
        [...state.rides.values()]
          .filter(
            (ride) =>
              ride.driverId === where.driverId &&
              ride.passengerRating !== null,
          )
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, take)
          .map((ride) => ({ passengerRating: ride.passengerRating })),
    },
    driver: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<DriverState>;
      }) => {
        const driver = state.drivers.get(where.id);
        if (!driver) {
          throw new Error('Driver not found');
        }

        const updated = { ...driver, ...data };
        state.drivers.set(where.id, updated);
        return updated;
      },
    },
  };

  return {
    state,
    prisma: {
      $transaction: async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
    },
  };
}

async function testPassengerRatingUpdatesDriverAverage() {
  const { prisma, state } = createPrismaMock();
  const service = new RatingService(prisma as never);

  const ride = await service.rateRide('ride-1', 'passenger-1', 4, 'PASSENGER');

  assert.equal(ride.passengerRating, 4);
  assert.equal(state.drivers.get('driver-1')?.rating, 4);
}

async function testRatingIsIdempotent() {
  const { prisma, state } = createPrismaMock();
  const service = new RatingService(prisma as never);

  await service.rateRide('ride-1', 'passenger-1', 4, 'PASSENGER');
  await service.rateRide('ride-1', 'passenger-1', 2, 'PASSENGER');

  assert.equal(state.rides.get('ride-1')?.passengerRating, 4);
  assert.equal(state.drivers.get('driver-1')?.rating, 4);
}

async function testRejectsWrongParticipant() {
  const { prisma } = createPrismaMock();
  const service = new RatingService(prisma as never);

  await assert.rejects(
    () => service.rateRide('ride-1', 'passenger-2', 5, 'PASSENGER'),
    ForbiddenException,
  );
}

async function testRejectsIncompleteRide() {
  const { prisma, state } = createPrismaMock();
  state.rides.set('ride-4', {
    id: 'ride-4',
    customerId: 'passenger-1',
    driverId: 'driver-1',
    status: 'IN_PROGRESS',
    passengerRating: null,
    driverRating: null,
    createdAt: new Date('2026-05-05T11:00:00.000Z'),
  });
  const service = new RatingService(prisma as never);

  await assert.rejects(
    () => service.rateRide('ride-4', 'passenger-1', 5, 'PASSENGER'),
    BadRequestException,
  );
}

function withDriver(ride: RideState, drivers: Map<string, DriverState>) {
  return {
    ...ride,
    driver: ride.driverId ? drivers.get(ride.driverId) ?? null : null,
  };
}

async function main() {
  await testPassengerRatingUpdatesDriverAverage();
  await testRatingIsIdempotent();
  await testRejectsWrongParticipant();
  await testRejectsIncompleteRide();
}

void main();
