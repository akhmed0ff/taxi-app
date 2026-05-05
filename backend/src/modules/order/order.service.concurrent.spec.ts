import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { UserRoleValue } from '../../common/roles';
import { DriverStatusValue } from '../driver/driver-status';
import { RideOfferStatusValue } from '../matching/ride-offer-status';
import { OrderService } from './order.service';
import { OrderStatusValue } from './order-status';

interface DriverState {
  id: string;
  status: string;
}

interface RideState {
  id: string;
  customerId: string;
  driverId: string | null;
  status: string;
}

interface RideOfferState {
  rideId: string;
  driverId: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
}

function createPrismaMock() {
  let transactionLock = Promise.resolve();
  const state = {
    drivers: new Map<string, DriverState>([
      ['driver-1', { id: 'driver-1', status: DriverStatusValue.ONLINE }],
      ['driver-2', { id: 'driver-2', status: DriverStatusValue.ONLINE }],
    ]),
    rides: new Map<string, RideState>([
      [
        'ride-1',
        {
          id: 'ride-1',
          customerId: 'passenger-1',
          driverId: null,
          status: OrderStatusValue.SEARCHING_DRIVER,
        },
      ],
    ]),
    rideOffers: new Map<string, RideOfferState>([
      [
        'ride-1:driver-1',
        {
          rideId: 'ride-1',
          driverId: 'driver-1',
          status: RideOfferStatusValue.SENT,
          expiresAt: new Date(Date.now() + 60_000),
          acceptedAt: null,
        },
      ],
      [
        'ride-1:driver-2',
        {
          rideId: 'ride-1',
          driverId: 'driver-2',
          status: RideOfferStatusValue.SENT,
          expiresAt: new Date(Date.now() + 60_000),
          acceptedAt: null,
        },
      ],
    ]),
    statusHistory: [] as Array<{ rideId: string; status: string }>,
    redisCleanups: [] as string[],
  };

  const makeTx = (txState: typeof state) => ({
    driver: {
      updateMany: async ({ where, data }: { where: DriverState; data: Partial<DriverState> }) => {
        const driver = txState.drivers.get(where.id);

        if (!driver || driver.status !== where.status) {
          return { count: 0 };
        }

        txState.drivers.set(where.id, { ...driver, ...data });
        return { count: 1 };
      },
    },
    ride: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; driverId: null; status: string };
        data: Partial<RideState>;
      }) => {
        const ride = txState.rides.get(where.id);

        if (
          !ride ||
          ride.driverId !== where.driverId ||
          ride.status !== where.status
        ) {
          return { count: 0 };
        }

        txState.rides.set(where.id, { ...ride, ...data });
        return { count: 1 };
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        txState.rides.get(where.id) ?? null,
    },
    rideStatusHistory: {
      create: async ({ data }: { data: { rideId: string; status: string } }) => {
        txState.statusHistory.push(data);
        return data;
      },
    },
    rideOffer: {
      findUnique: async ({
        where,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
      }) =>
        txState.rideOffers.get(
          `${where.rideId_driverId.rideId}:${where.rideId_driverId.driverId}`,
        ) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
        data: { status: string; acceptedAt?: Date };
      }) => {
        const key = `${where.rideId_driverId.rideId}:${where.rideId_driverId.driverId}`;
        const offer = txState.rideOffers.get(key);

        assert.ok(offer, 'ride offer must exist before update');
        const nextOffer = { ...offer, ...data };
        txState.rideOffers.set(key, nextOffer);
        return nextOffer;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { rideId: string; driverId: { not: string }; status: { in: string[] } };
        data: { status: string };
      }) => {
        let count = 0;

        for (const [key, offer] of txState.rideOffers.entries()) {
          if (
            offer.rideId === where.rideId &&
            offer.driverId !== where.driverId.not &&
            where.status.in.includes(offer.status)
          ) {
            txState.rideOffers.set(key, { ...offer, ...data });
            count += 1;
          }
        }

        return { count };
      },
    },
  });

  return {
    state,
    prisma: {
      $transaction: async <T>(callback: (tx: ReturnType<typeof makeTx>) => Promise<T>) => {
        const previousTransaction = transactionLock;
        let releaseTransaction: () => void = () => undefined;
        transactionLock = new Promise<void>((resolve) => {
          releaseTransaction = resolve;
        });

        await previousTransaction;

        try {
          const txState = {
            drivers: new Map(state.drivers),
            rides: new Map(state.rides),
            rideOffers: new Map(state.rideOffers),
            statusHistory: [...state.statusHistory],
            redisCleanups: [...state.redisCleanups],
          };
          const result = await callback(makeTx(txState));

          state.drivers = txState.drivers;
          state.rides = txState.rides;
          state.rideOffers = txState.rideOffers;
          state.statusHistory = txState.statusHistory;
          state.redisCleanups = txState.redisCleanups;

          return result;
        } finally {
          releaseTransaction();
        }
      },
    },
  };
}

async function main() {
  const { prisma, state } = createPrismaMock();
  let rideLocked = false;
  const service = new OrderService(
    prisma as never,
    {} as never,
    {} as never,
    {
      acceptRideWithLock: async () => {
        if (rideLocked) {
          return false;
        }

        rideLocked = true;
        return true;
      },
      cleanupOffersForRide: async (rideId: string) => {
        state.redisCleanups.push(rideId);
        return { rideId, deleted: 2 };
      },
    } as never,
    {
      emitToDriver: () => undefined,
      emitToPassenger: () => undefined,
      emitToOrder: () => undefined,
      emitToAdmins: () => undefined,
    } as never,
    {
      offerRideToNearbyDrivers: async () => ({
        offeredDrivers: 0,
        shouldContinueSearch: false,
      }),
    } as never,
    { add: async () => undefined } as never,
  );
  const adminUser = {
    userId: 'admin-1',
    role: UserRoleValue.ADMIN,
  };

  const results = await Promise.allSettled([
    service.accept('ride-1', 'driver-1', adminUser),
    service.accept('ride-1', 'driver-2', adminUser),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');
  const ride = state.rides.get('ride-1');
  const busyDrivers = [...state.drivers.values()].filter(
    (driver) => driver.status === DriverStatusValue.BUSY,
  );
  const onlineDrivers = [...state.drivers.values()].filter(
    (driver) => driver.status === DriverStatusValue.ONLINE,
  );

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(ride?.status, OrderStatusValue.DRIVER_ASSIGNED);
  assert.ok(ride?.driverId === 'driver-1' || ride?.driverId === 'driver-2');
  assert.equal(busyDrivers.length, 1);
  assert.equal(onlineDrivers.length, 1);
  assert.equal(busyDrivers[0].id, ride?.driverId);
  assert.equal(state.statusHistory.length, 1);
  assert.equal(
    state.rideOffers.get(`ride-1:${ride?.driverId}`)?.status,
    RideOfferStatusValue.ACCEPTED,
  );
  const expiredOffer = [...state.rideOffers.values()].find(
    (offer) => offer.driverId !== ride?.driverId,
  );
  assert.equal(expiredOffer?.status, RideOfferStatusValue.EXPIRED);
  assert.deepEqual(state.redisCleanups, ['ride-1']);

  const rejectedReason =
    rejected[0].status === 'rejected' ? rejected[0].reason : undefined;
  assert.ok(rejectedReason instanceof BadRequestException);
  assert.match(
    rejectedReason.message,
    /already been assigned|no longer searching|already being accepted/,
  );
}

void main();
