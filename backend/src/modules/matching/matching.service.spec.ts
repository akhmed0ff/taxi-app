import { strict as assert } from 'node:assert';
import { RealtimeEvent } from '../../common/realtime-events';
import { DriverStatusValue } from '../driver/driver-status';
import { OrderStatusValue } from '../order/order-status';
import { MatchingProcessor } from './matching.processor';
import { MatchingService } from './matching.service';

function createMatchingMock() {
  const state = {
    ride: {
      id: 'ride-1',
      customerId: 'passenger-1',
      status: OrderStatusValue.SEARCHING_DRIVER as string,
      pickupLat: 41.0167,
      pickupLng: 70.1436,
    },
    drivers: [
      { id: 'driver-online', status: DriverStatusValue.ONLINE },
      { id: 'driver-busy', status: DriverStatusValue.BUSY },
    ],
    emitted: [] as Array<{ driverId: string; event: string; payload: unknown }>,
  };

  const prisma = {
    ride: {
      findUnique: async () => state.ride,
      update: async ({
        data,
      }: {
        data: { status: string; statusHistory: { create: { reason: string } } };
      }) => {
        state.ride = { ...state.ride, status: data.status };
        return state.ride;
      },
    },
    driver: {
      findMany: async ({
        where,
      }: {
        where: { id: { in: string[] }; status: string };
      }) =>
        state.drivers
          .filter(
            (driver) =>
              where.id.in.includes(driver.id) && driver.status === where.status,
          )
          .map((driver) => ({ id: driver.id })),
    },
  };
  const geo = {
    findNearbyDrivers: async () => [
      { driverId: 'driver-online', distanceMeters: 240 },
      { driverId: 'driver-busy', distanceMeters: 160 },
    ],
  };
  const socket = {
    emitToDriver: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
    emitToPassenger: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
    emitToOrder: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
  };
  const service = new MatchingService(
    prisma as never,
    geo as never,
    socket as never,
  );

  return { service, state };
}

async function testOnlyOnlineDriversReceiveOffers() {
  const { service, state } = createMatchingMock();
  const result = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: 3,
    offerTtlSeconds: 25,
  });

  assert.equal(result.offeredDrivers, 1);
  assert.equal(state.emitted.length, 1);
  assert.equal(state.emitted[0].driverId, 'driver-online');
  assert.equal(state.emitted[0].event, RealtimeEvent.NEW_ORDER);
}

async function testOfferTimeoutSchedulesNextSearchAttempt() {
  const scheduledJobs: Array<{
    name: string;
    data: { attempt: number };
    options: { delay: number };
  }> = [];
  const matchingService = {
    offerRideToNearbyDrivers: async () => ({
      ride: { id: 'ride-1' },
      offeredDrivers: 1,
      shouldContinueSearch: true,
    }),
    cancelNoDriverRide: async () => undefined,
  };
  const queue = {
    add: async (
      name: string,
      data: { attempt: number },
      options: { delay: number },
    ) => scheduledJobs.push({ name, data, options }),
  };
  const processor = new MatchingProcessor(
    matchingService as never,
    queue as never,
  );

  await processor.process({
    name: 'find-driver',
    data: {
      rideId: 'ride-1',
      pickupLat: 41.0167,
      pickupLng: 70.1436,
      attempt: 1,
    },
  } as never);

  assert.equal(scheduledJobs.length, 1);
  assert.equal(scheduledJobs[0].name, 'find-driver');
  assert.equal(scheduledJobs[0].data.attempt, 2);
  assert.equal(scheduledJobs[0].options.delay, 25000);
}

async function testNoDriverAfterMaxAttemptsCancelsRide() {
  let cancelledRideId: string | undefined;
  const matchingService = {
    offerRideToNearbyDrivers: async () => ({
      ride: { id: 'ride-1' },
      offeredDrivers: 0,
      shouldContinueSearch: true,
    }),
    cancelNoDriverRide: async (rideId: string) => {
      cancelledRideId = rideId;
    },
  };
  const processor = new MatchingProcessor(
    matchingService as never,
    { add: async () => undefined } as never,
  );

  await processor.process({
    name: 'find-driver',
    data: {
      rideId: 'ride-1',
      pickupLat: 41.0167,
      pickupLng: 70.1436,
      attempt: 4,
    },
  } as never);

  assert.equal(cancelledRideId, 'ride-1');
}

async function main() {
  await testOnlyOnlineDriversReceiveOffers();
  await testOfferTimeoutSchedulesNextSearchAttempt();
  await testNoDriverAfterMaxAttemptsCancelsRide();
}

void main();
