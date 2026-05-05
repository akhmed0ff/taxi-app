import { strict as assert } from 'node:assert';
import { RealtimeEvent } from '../../common/realtime-events';
import { DriverStatusValue } from '../driver/driver-status';
import { OrderStatusValue } from '../order/order-status';
import {
  INITIAL_RADIUS_KM,
  MAX_RADIUS_KM,
  OFFER_TIMEOUT_MS,
  MatchingProcessor,
} from './matching.processor';
import { MatchingService } from './matching.service';
import { RideOfferStatusValue } from './ride-offer-status';

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
      { id: 'driver-offline', status: DriverStatusValue.OFFLINE },
      { id: 'driver-blocked', status: DriverStatusValue.BLOCKED },
    ],
    geoDrivers: [
      { driverId: 'driver-online', distanceMeters: 240 },
      { driverId: 'driver-busy', distanceMeters: 160 },
      { driverId: 'driver-offline', distanceMeters: 180 },
      { driverId: 'driver-blocked', distanceMeters: 220 },
    ],
    emitted: [] as Array<{ driverId: string; event: string; payload: unknown }>,
    offers: [] as Array<{
      rideId: string;
      driverId: string;
      status: string;
      distanceMeters?: number;
      expiresAt: Date;
      acceptedAt?: Date | null;
      rejectedAt?: Date | null;
    }>,
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
    rideOffer: {
      findMany: async ({
        where,
      }: {
        where: { rideId: string; driverId: { in: string[] } };
        select: { driverId: true };
      }) =>
        state.offers
          .filter(
            (offer) =>
              offer.rideId === where.rideId &&
              where.driverId.in.includes(offer.driverId),
          )
          .map((offer) => ({ driverId: offer.driverId })),
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
        create: {
          rideId: string;
          driverId: string;
          status: string;
          distanceMeters?: number;
          expiresAt: Date;
        };
        update: {
          status: string;
          distanceMeters?: number;
          expiresAt: Date;
          acceptedAt: null;
          rejectedAt: null;
        };
      }) => {
        const existingIndex = state.offers.findIndex(
          (offer) =>
            offer.rideId === where.rideId_driverId.rideId &&
            offer.driverId === where.rideId_driverId.driverId,
        );

        if (existingIndex >= 0) {
          state.offers[existingIndex] = {
            ...state.offers[existingIndex],
            ...update,
          };
          return state.offers[existingIndex];
        }

        const nextOffer = { ...create };
        state.offers.push(nextOffer);
        return nextOffer;
      },
      update: async ({
        where,
        data,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
        data: { status: string };
      }) => {
        const offer = state.offers.find(
          (item) =>
            item.rideId === where.rideId_driverId.rideId &&
            item.driverId === where.rideId_driverId.driverId,
        );

        if (!offer) {
          throw new Error('Offer not found');
        }

        offer.status = data.status;
        return offer;
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
    findNearbyDrivers: async () => state.geoDrivers,
  };
  const socket = {
    emitToDriver: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
    emitToPassenger: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
    emitToOrder: (driverId: string, event: string, payload: unknown) =>
      state.emitted.push({ driverId, event, payload }),
    emitToAdmins: (event: string, payload: unknown) =>
      state.emitted.push({ driverId: 'admin', event, payload }),
  };
  const redis = {
    createRideOffer: async () => undefined,
  };
  const service = new MatchingService(
    prisma as never,
    geo as never,
    socket as never,
    redis as never,
  );

  return { service, state };
}

async function testOnlyOnlineDriversReceiveOffers() {
  const { service, state } = createMatchingMock();
  const result = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  assert.equal(result.offeredDrivers, 1);
  assert.equal(state.emitted.length, 1);
  assert.equal(state.offers.length, 1);
  assert.equal(state.offers[0].status, RideOfferStatusValue.SENT);
  assert.equal(state.offers[0].distanceMeters, 240);
  assert.deepEqual(
    state.emitted.map((event) => event.driverId),
    ['driver-online'],
  );
  assert.deepEqual(
    state.emitted.map((event) => event.event),
    [RealtimeEvent.NEW_RIDE_OFFER_LOWER],
  );
  assert.equal(
    (state.emitted[0].payload as { expiresInSeconds: number }).expiresInSeconds,
    10,
  );
}

async function testMatchingEmitsExactlyOncePerDriver() {
  const { service, state } = createMatchingMock();
  state.drivers = Array.from({ length: 3 }, (_, index) => ({
    id: `driver-${index + 1}`,
    status: DriverStatusValue.ONLINE,
  }));
  state.geoDrivers = Array.from({ length: 3 }, (_, index) => ({
    driverId: `driver-${index + 1}`,
    distanceMeters: (index + 1) * 100,
  }));

  const result = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  assert.equal(result.offeredDrivers, 3);
  assert.equal(state.emitted.length, 3);
  assert.deepEqual(
    state.emitted.map((event) => event.event),
    [
      RealtimeEvent.NEW_RIDE_OFFER_LOWER,
      RealtimeEvent.NEW_RIDE_OFFER_LOWER,
      RealtimeEvent.NEW_RIDE_OFFER_LOWER,
    ],
  );
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
  assert.equal(scheduledJobs[0].options.delay, OFFER_TIMEOUT_MS);
}

async function testOffersOnlyFirstBatchOfOnlineDrivers() {
  const { service, state } = createMatchingMock();
  state.drivers = Array.from({ length: 10 }, (_, index) => ({
    id: `driver-${index + 1}`,
    status: DriverStatusValue.ONLINE,
  }));
  state.geoDrivers = Array.from({ length: 10 }, (_, index) => ({
    driverId: `driver-${index + 1}`,
    distanceMeters: (index + 1) * 100,
  }));

  const result = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  assert.equal(result.offeredDrivers, 3);
  assert.deepEqual(
    state.offers.map((offer) => offer.driverId),
    ['driver-1', 'driver-2', 'driver-3'],
  );
  assert.deepEqual(
    state.emitted
      .filter((event) => event.event === RealtimeEvent.NEW_RIDE_OFFER_LOWER)
      .map((event) => event.driverId),
    ['driver-1', 'driver-2', 'driver-3'],
  );
}

async function testNextAttemptSkipsPreviousBatchAndOffersNextBatch() {
  const { service, state } = createMatchingMock();
  state.drivers = Array.from({ length: 10 }, (_, index) => ({
    id: `driver-${index + 1}`,
    status: DriverStatusValue.ONLINE,
  }));
  state.geoDrivers = Array.from({ length: 10 }, (_, index) => ({
    driverId: `driver-${index + 1}`,
    distanceMeters: (index + 1) * 100,
  }));

  const firstResult = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });
  state.emitted = [];

  const secondResult = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  assert.equal(firstResult.offeredDrivers, 3);
  assert.equal(secondResult.offeredDrivers, 3);
  assert.deepEqual(
    state.emitted
      .filter((event) => event.event === RealtimeEvent.NEW_RIDE_OFFER_LOWER)
      .map((event) => event.driverId),
    ['driver-4', 'driver-5', 'driver-6'],
  );
  assert.deepEqual(
    state.offers.map((offer) => offer.driverId),
    [
      'driver-1',
      'driver-2',
      'driver-3',
      'driver-4',
      'driver-5',
      'driver-6',
    ],
  );
}

async function testNoRepeatedOfferStillContinuesSearch() {
  const { service, state } = createMatchingMock();
  state.offers.push({
    rideId: 'ride-1',
    driverId: 'driver-online',
    status: RideOfferStatusValue.SENT,
    expiresAt: new Date(Date.now() + 60_000),
  });

  const result = await service.offerRideToNearbyDrivers({
    rideId: 'ride-1',
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    radiusKm: INITIAL_RADIUS_KM,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  assert.equal(result.offeredDrivers, 0);
  assert.equal(result.shouldContinueSearch, true);
  assert.equal(state.emitted.length, 0);
  assert.equal(state.offers.length, 1);
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
      attempt: Math.ceil((MAX_RADIUS_KM - INITIAL_RADIUS_KM) / 3) + 1,
    },
  } as never);

  assert.equal(cancelledRideId, 'ride-1');
}

async function main() {
  await testOnlyOnlineDriversReceiveOffers();
  await testMatchingEmitsExactlyOncePerDriver();
  await testOffersOnlyFirstBatchOfOnlineDrivers();
  await testNextAttemptSkipsPreviousBatchAndOffersNextBatch();
  await testNoRepeatedOfferStillContinuesSearch();
  await testOfferTimeoutSchedulesNextSearchAttempt();
  await testNoDriverAfterMaxAttemptsCancelsRide();
}

void main();
