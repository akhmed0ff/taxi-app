import { strict as assert } from 'node:assert';
import { NotFoundException } from '@nestjs/common';
import { UserRoleValue } from '../../common/roles';
import { OrderService } from './order.service';
import { OrderStatusValue } from './order-status';

interface HistoryRide {
  id: string;
  customerId: string;
  driverId: string | null;
  status: string;
  createdAt: Date;
}

function historyRides(history: { data: unknown[] }): HistoryRide[] {
  return history.data as HistoryRide[];
}

function historyRideIds(history: { data: unknown[] }): string[] {
  return historyRides(history).map((ride) => ride.id);
}

function createHistoryMock() {
  const rides: HistoryRide[] = [
    {
      id: 'ride-active-searching',
      customerId: 'passenger-1',
      driverId: null,
      status: OrderStatusValue.SEARCHING_DRIVER,
      createdAt: new Date('2026-04-28T08:00:00.000Z'),
    },
    {
      id: 'ride-active-progress',
      customerId: 'passenger-1',
      driverId: 'driver-1',
      status: OrderStatusValue.IN_PROGRESS,
      createdAt: new Date('2026-04-28T09:00:00.000Z'),
    },
    {
      id: 'ride-completed',
      customerId: 'passenger-1',
      driverId: 'driver-1',
      status: OrderStatusValue.COMPLETED,
      createdAt: new Date('2026-04-28T10:00:00.000Z'),
    },
    {
      id: 'ride-cancelled',
      customerId: 'passenger-1',
      driverId: 'driver-1',
      status: OrderStatusValue.CANCELLED,
      createdAt: new Date('2026-04-28T11:00:00.000Z'),
    },
    {
      id: 'other-passenger-completed',
      customerId: 'passenger-2',
      driverId: 'driver-2',
      status: OrderStatusValue.COMPLETED,
      createdAt: new Date('2026-04-28T12:00:00.000Z'),
    },
  ];

  const prisma = {
    ride: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          customerId?: string;
          driverId?: string;
          status?: { in: string[] };
        };
        skip?: number;
        take?: number;
      }) =>
        rides
          .filter((ride) => {
            if (where.customerId && ride.customerId !== where.customerId) {
              return false;
            }

            if (where.driverId && ride.driverId !== where.driverId) {
              return false;
            }

            if (where.status && !where.status.in.includes(ride.status)) {
              return false;
            }

            return true;
          })
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip ?? 0, (skip ?? 0) + (take ?? 50)),
      count: async ({
        where,
      }: {
        where: {
          customerId?: string;
          driverId?: string;
          status?: { in: string[] };
        };
      }) =>
        rides.filter((ride) => {
          if (where.customerId && ride.customerId !== where.customerId) {
            return false;
          }

          if (where.driverId && ride.driverId !== where.driverId) {
            return false;
          }

          if (where.status && !where.status.in.includes(ride.status)) {
            return false;
          }

          return true;
        }).length,
    },
    driver: {
      findUnique: async ({
        where,
      }: {
        where: {
          userId: string;
        };
      }) => {
        if (where.userId === 'driver-user-1') {
          return { id: 'driver-1' };
        }

        return null;
      },
    },
  };

  const paymentService = {};
  const pricingService = {};
  const redis = {};
  const socket = {};
  const matching = {};
  const rideMatchingQueue = { add: async () => undefined };
  const service = new OrderService(
    prisma as never,
    paymentService as never,
    pricingService as never,
    redis as never,
    socket as never,
    matching as never,
    rideMatchingQueue as never,
  );

  return { service };
}

async function main() {
  await testPassengerHistoryActiveFilter();
  await testPassengerHistoryCompletedFilter();
  await testPassengerHistoryCancelledFilter();
  await testDriverHistoryCompletedFilter();
  await testPassengerHistoryPaginationSlice();
  await testUnknownDriverHistoryFails();
}

async function testPassengerHistoryActiveFilter() {
  const { service } = createHistoryMock();

  const history = await service.findPassengerHistory(
    { userId: 'passenger-1', role: UserRoleValue.PASSENGER },
    'active',
  );

  assert.deepEqual(
    historyRideIds(history),
    ['ride-active-progress', 'ride-active-searching'],
  );
}

async function testPassengerHistoryCompletedFilter() {
  const { service } = createHistoryMock();

  const history = await service.findPassengerHistory(
    { userId: 'passenger-1', role: UserRoleValue.PASSENGER },
    'completed',
  );

  assert.deepEqual(
    historyRideIds(history),
    ['ride-completed'],
  );
}

async function testPassengerHistoryCancelledFilter() {
  const { service } = createHistoryMock();

  const history = await service.findPassengerHistory(
    { userId: 'passenger-1', role: UserRoleValue.PASSENGER },
    'cancelled',
  );

  assert.deepEqual(
    historyRideIds(history),
    ['ride-cancelled'],
  );
}

async function testDriverHistoryCompletedFilter() {
  const { service } = createHistoryMock();

  const history = await service.findDriverHistory(
    { userId: 'driver-user-1', role: UserRoleValue.DRIVER },
    'completed',
  );

  assert.deepEqual(
    historyRideIds(history),
    ['ride-completed'],
  );
}

async function testPassengerHistoryPaginationSlice() {
  const rides: HistoryRide[] = Array.from({ length: 12 }, (_, index) => ({
    id: `ride-${index + 1}`,
    customerId: 'passenger-1',
    driverId: 'driver-1',
    status: OrderStatusValue.COMPLETED,
    createdAt: new Date(`2026-04-29T${String(index).padStart(2, '0')}:00:00.000Z`),
  }));
  const prisma = {
    ride: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: { customerId?: string; status?: { in: string[] } };
        skip?: number;
        take?: number;
      }) =>
        rides
          .filter((ride) => {
            if (where.customerId && ride.customerId !== where.customerId) {
              return false;
            }
            if (where.status && !where.status.in.includes(ride.status)) {
              return false;
            }
            return true;
          })
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip ?? 0, (skip ?? 0) + (take ?? 50)),
      count: async () => rides.length,
    },
    driver: {
      findUnique: async () => ({ id: 'driver-1' }),
    },
  };
  const paymentService = {};
  const pricingService = {};
  const redis = {};
  const socket = {};
  const matching = {};
  const rideMatchingQueue = { add: async () => undefined };
  const service = new OrderService(
    prisma as never,
    paymentService as never,
    pricingService as never,
    redis as never,
    socket as never,
    matching as never,
    rideMatchingQueue as never,
  );
  const history = await service.findPassengerHistory(
    { userId: 'passenger-1', role: UserRoleValue.PASSENGER },
    'completed',
    2,
    5,
  );

  assert.deepEqual(historyRideIds(history), [
    'ride-7',
    'ride-6',
    'ride-5',
    'ride-4',
    'ride-3',
  ]);
  assert.equal(history.page, 2);
  assert.equal(history.limit, 5);
  assert.equal(history.total, 12);
  assert.equal(history.hasMore, true);
}

async function testUnknownDriverHistoryFails() {
  const { service } = createHistoryMock();

  await assert.rejects(
    () =>
      service.findDriverHistory(
        { userId: 'missing-driver-user', role: UserRoleValue.DRIVER },
        'completed',
      ),
    (error) =>
      error instanceof NotFoundException && /Driver not found/.test(error.message),
  );
}

void main();
