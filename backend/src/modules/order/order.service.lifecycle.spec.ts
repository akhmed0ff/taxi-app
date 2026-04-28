import { strict as assert } from 'node:assert';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRoleValue } from '../../common/roles';
import { DriverStatusValue } from '../driver/driver-status';
import { PaymentMethodValue } from '../payment/payment-method';
import { PaymentStatusValue } from '../payment/payment-status';
import { RealtimeEvent } from '../../common/realtime-events';
import { OrderService } from './order.service';
import { OrderStatusValue } from './order-status';

interface RideState {
  id: string;
  customerId: string;
  driverId: string | null;
  status: string;
  tariffClass?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceMeters?: number;
  waitingMinutes?: number;
  stopMinutes?: number;
  estimatedFare?: number;
  estimatedFareDetails?: unknown;
  finalFare?: number;
  finalFareDetails?: unknown;
  cancelReason?: string;
}

interface DriverState {
  id: string;
  userId: string;
  status: string;
}

function createCoreFlowMock() {
  let rideCounter = 0;
  const state = {
    drivers: new Map<string, DriverState>([
      [
        'driver-1',
        {
          id: 'driver-1',
          userId: 'driver-user-1',
          status: DriverStatusValue.ONLINE,
        },
      ],
    ]),
    rides: new Map<string, RideState>(),
    payments: [] as Array<{
      rideId: string;
      userId: string;
      amount: number;
      method: string;
      status: string;
    }>,
    statusHistory: [] as Array<{ rideId: string; status: string; reason?: string }>,
    queuedJobs: [] as Array<{ name: string; data: unknown }>,
    emittedEvents: [] as Array<{ room: string; event: string; payload: unknown }>,
  };

  const rideApi = {
    create: async ({ data }: { data: Partial<RideState> & { statusHistory?: { create: Array<{ status: string }> } } }) => {
      rideCounter += 1;
      const ride = {
        id: `ride-${rideCounter}`,
        customerId: data.customerId!,
        driverId: null,
        status: data.status!,
        tariffClass: data.tariffClass,
        pickupLat: data.pickupLat!,
        pickupLng: data.pickupLng!,
        dropoffLat: data.dropoffLat!,
        dropoffLng: data.dropoffLng!,
        distanceMeters: data.distanceMeters,
        estimatedFare: data.estimatedFare,
        estimatedFareDetails: data.estimatedFareDetails,
      };

      state.rides.set(ride.id, ride);
      for (const history of data.statusHistory?.create ?? []) {
        state.statusHistory.push({ rideId: ride.id, status: history.status });
      }

      return ride;
    },
    findUnique: async ({
      where,
      select,
      include,
    }: {
      where: { id: string };
      select?: { driver?: { select: { userId: boolean } } };
      include?: { driver?: boolean };
    }) => {
      const ride = state.rides.get(where.id);

      if (!ride) {
        return null;
      }

      if (select?.driver) {
        const driver = ride.driverId ? state.drivers.get(ride.driverId) : null;
        return {
          driver: driver ? { userId: driver.userId } : null,
        };
      }

      if (include?.driver) {
        return {
          ...ride,
          driver: ride.driverId ? state.drivers.get(ride.driverId) : null,
        };
      }

      return ride;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<RideState> & {
        statusHistory?: { create: { status: string; reason?: string } };
      };
    }) => {
      const ride = state.rides.get(where.id);
      assert.ok(ride, 'ride must exist before update');

      const nextRide = { ...ride, ...data };
      delete (nextRide as { statusHistory?: unknown }).statusHistory;
      state.rides.set(where.id, nextRide);

      if (data.statusHistory) {
        state.statusHistory.push({
          rideId: where.id,
          status: data.statusHistory.create.status,
          reason: data.statusHistory.create.reason,
        });
      }

      return nextRide;
    },
  };

  const makeTx = () => ({
    driver: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status: string };
        data: Partial<DriverState>;
      }) => {
        const driver = state.drivers.get(where.id);

        if (!driver || driver.status !== where.status) {
          return { count: 0 };
        }

        state.drivers.set(where.id, { ...driver, ...data });
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
        const ride = state.rides.get(where.id);

        if (
          !ride ||
          ride.driverId !== where.driverId ||
          ride.status !== where.status
        ) {
          return { count: 0 };
        }

        state.rides.set(where.id, { ...ride, ...data });
        return { count: 1 };
      },
      findUnique: rideApi.findUnique,
    },
    rideStatusHistory: {
      create: async ({ data }: { data: { rideId: string; status: string; reason?: string } }) => {
        state.statusHistory.push(data);
        return data;
      },
    },
  });

  const prisma = {
    ride: rideApi,
    driver: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.drivers.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<DriverState>;
      }) => {
        const driver = state.drivers.get(where.id);
        assert.ok(driver, 'driver must exist before update');
        const nextDriver = { ...driver, ...data };
        state.drivers.set(where.id, nextDriver);
        return nextDriver;
      },
    },
    tariff: {
      findFirst: async () => null,
    },
    payment: {
      create: async ({
        data,
      }: {
        data: {
          rideId: string;
          userId: string;
          amount: number;
          method: string;
          status: string;
        };
      }) => {
        state.payments.push(data);
        return data;
      },
    },
    $transaction: async <T>(callback: (tx: ReturnType<typeof makeTx>) => Promise<T>) =>
      callback(makeTx()),
  };

  const paymentService = {
    createPendingPayment: async (
      rideId: string,
      userId: string,
      amount: number,
      method = PaymentMethodValue.CASH,
    ) =>
      prisma.payment.create({
        data: {
          rideId,
          userId,
          amount,
          method,
          status: PaymentStatusValue.PENDING,
        },
      }),
  };

  const pricingService = {
    calculateEstimatedFare: () => 15000,
    calculateFinalFare: () => 17000,
    calculateEstimatedFareDetails: () => ({
      total: 15000,
      subtotal: 15000,
      baseFareAmount: 7000,
      distanceAmount: 8000,
      waitingAmount: 0,
      stopAmount: 0,
    }),
    calculateFinalFareDetails: () => ({
      total: 17000,
      subtotal: 17000,
      baseFareAmount: 7000,
      distanceAmount: 8000,
      waitingAmount: 1000,
      stopAmount: 1000,
    }),
    getDefaultTariff: () => ({
      tariffClass: 'ECONOMY',
      city: 'Angren',
      baseFare: 7000,
      perKm: 2000,
      freeWaitingMinutes: 3,
      waitingPerMinute: 500,
      stopPerMinute: 500,
      minimumFare: 12000,
      active: true,
    }),
  };

  const redis = {
    client: {
      get: async () => null,
      set: async () => 'OK',
    },
  };

  const socket = {
    emitToDriver: (room: string, event: string, payload: unknown) =>
      state.emittedEvents.push({ room, event, payload }),
    emitToPassenger: (room: string, event: string, payload: unknown) =>
      state.emittedEvents.push({ room, event, payload }),
    emitToOrder: (room: string, event: string, payload: unknown) =>
      state.emittedEvents.push({ room, event, payload }),
    emitToAdmins: (event: string, payload: unknown) =>
      state.emittedEvents.push({ room: 'admin', event, payload }),
  };

  const queue = {
    add: async (name: string, data: unknown) => {
      state.queuedJobs.push({ name, data });
    },
  };

  const service = new OrderService(
    prisma as never,
    paymentService as never,
    pricingService as never,
    redis as never,
    socket as never,
    queue as never,
  );

  return { service, state };
}

async function main() {
  await testLifecycleCreatesPendingPayment();
  await testInvalidTransitionFails();
  await testPassengerCanCancelBeforeTripStarts();
  await testDriverCanCancelAssignedRideAndReturnsOnline();
  await testAdminCanCancelInProgressRide();
  await testPassengerCannotCancelInProgressRide();
  await testDriverCannotCancelAnotherRide();
  await testCompletedRideCannotBeCancelled();
  await testCancelledRideCannotBeCancelledAgain();
}

async function testLifecycleCreatesPendingPayment() {
  const { service, state } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  assert.equal(createdRide.status, OrderStatusValue.SEARCHING_DRIVER);
  assert.deepEqual(createdRide.estimatedFareDetails, {
    total: 15000,
    subtotal: 15000,
    baseFareAmount: 7000,
    distanceAmount: 8000,
    waitingAmount: 0,
    stopAmount: 0,
  });
  assert.equal(state.queuedJobs.length, 1);

  const acceptedRide = await service.accept(createdRide.id, 'driver-1', driverUser);
  assert.equal(acceptedRide.status, OrderStatusValue.DRIVER_ASSIGNED);
  assert.equal(acceptedRide.driverId, 'driver-1');

  const arrivedRide = await service.markDriverArrived(createdRide.id, driverUser);
  assert.equal(arrivedRide.status, OrderStatusValue.DRIVER_ARRIVED);
  assert.ok(
    state.emittedEvents.some(
      (event) =>
        event.room === createdRide.id && event.event === RealtimeEvent.DRIVER_ARRIVED,
    ),
  );

  const startedRide = await service.startTrip(createdRide.id, driverUser);
  assert.equal(startedRide.status, OrderStatusValue.IN_PROGRESS);
  assert.ok(
    state.emittedEvents.some(
      (event) =>
        event.room === createdRide.id && event.event === RealtimeEvent.TRIP_STARTED,
    ),
  );

  const completed = await service.completeTrip(
    createdRide.id,
    {
      paymentMethod: PaymentMethodValue.CASH,
      waitingMinutes: 5,
      stopMinutes: 2,
    },
    driverUser,
  );
  assert.equal(completed.ride.status, OrderStatusValue.COMPLETED);
  assert.equal(completed.ride.finalFare, 17000);
  assert.deepEqual(completed.ride.finalFareDetails, {
    total: 17000,
    subtotal: 17000,
    baseFareAmount: 7000,
    distanceAmount: 8000,
    waitingAmount: 1000,
    stopAmount: 1000,
  });
  assert.equal(completed.ride.waitingMinutes, 5);
  assert.equal(completed.ride.stopMinutes, 2);
  assert.equal(completed.payment.amount, 17000);
  assert.equal(completed.payment.status, PaymentStatusValue.PENDING);
  assert.equal(state.payments.length, 1);
  assert.equal(state.drivers.get('driver-1')?.status, DriverStatusValue.ONLINE);
  assert.deepEqual(
    state.statusHistory.map((item) => item.status),
    [
      OrderStatusValue.CREATED,
      OrderStatusValue.SEARCHING_DRIVER,
      OrderStatusValue.DRIVER_ASSIGNED,
      OrderStatusValue.DRIVER_ARRIVED,
      OrderStatusValue.IN_PROGRESS,
      OrderStatusValue.COMPLETED,
    ],
  );
}

async function testInvalidTransitionFails() {
  const { service } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };
  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.accept(createdRide.id, 'driver-1', driverUser);

  await assert.rejects(
    () => service.startTrip(createdRide.id, driverUser),
    (error) =>
      error instanceof BadRequestException &&
      /Invalid ride status transition: DRIVER_ASSIGNED -> IN_PROGRESS/.test(
        error.message,
      ),
  );
}

async function testPassengerCanCancelBeforeTripStarts() {
  const { service, state } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });

  const cancelled = await service.cancelRide(
    createdRide.id,
    'PASSENGER_CHANGED_PLANS',
    passengerUser,
  );

  assert.equal(cancelled.ride.status, OrderStatusValue.CANCELLED);
  assert.equal(cancelled.ride.cancelReason, 'PASSENGER_CHANGED_PLANS');
  assert.equal(
    state.statusHistory.at(-1)?.reason,
    'PASSENGER_CHANGED_PLANS',
  );
  assert.ok(
    state.emittedEvents.some((event) => event.event === 'RIDE_CANCELLED'),
  );
}

async function testDriverCanCancelAssignedRideAndReturnsOnline() {
  const { service, state } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.accept(createdRide.id, 'driver-1', driverUser);

  const cancelled = await service.cancelRide(
    createdRide.id,
    'DRIVER_UNAVAILABLE',
    driverUser,
  );

  assert.equal(cancelled.ride.status, OrderStatusValue.CANCELLED);
  assert.equal(cancelled.ride.cancelReason, 'DRIVER_UNAVAILABLE');
  assert.equal(state.drivers.get('driver-1')?.status, DriverStatusValue.ONLINE);
}

async function testAdminCanCancelInProgressRide() {
  const { service, state } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };
  const adminUser = {
    userId: 'admin-1',
    role: UserRoleValue.ADMIN,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.accept(createdRide.id, 'driver-1', driverUser);
  await service.markDriverArrived(createdRide.id, driverUser);
  await service.startTrip(createdRide.id, driverUser);

  const cancelled = await service.cancelRide(
    createdRide.id,
    'ADMIN_FORCE_CANCEL',
    adminUser,
  );

  assert.equal(cancelled.ride.status, OrderStatusValue.CANCELLED);
  assert.equal(cancelled.ride.cancelReason, 'ADMIN_FORCE_CANCEL');
  assert.equal(state.drivers.get('driver-1')?.status, DriverStatusValue.ONLINE);
}

async function testPassengerCannotCancelInProgressRide() {
  const { service } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.accept(createdRide.id, 'driver-1', driverUser);
  await service.markDriverArrived(createdRide.id, driverUser);
  await service.startTrip(createdRide.id, driverUser);

  await assert.rejects(
    () => service.cancelRide(createdRide.id, 'TOO_LATE', passengerUser),
    (error) =>
      error instanceof BadRequestException &&
      /cannot be cancelled after trip started/.test(error.message),
  );
}

async function testDriverCannotCancelAnotherRide() {
  const { service } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });

  await assert.rejects(
    () => service.cancelRide(createdRide.id, 'NOT_MY_RIDE', driverUser),
    (error) =>
      error instanceof ForbiddenException &&
      /Cannot cancel another driver ride/.test(error.message),
  );
}

async function testCompletedRideCannotBeCancelled() {
  const { service } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };
  const driverUser = {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
  };
  const adminUser = {
    userId: 'admin-1',
    role: UserRoleValue.ADMIN,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.accept(createdRide.id, 'driver-1', driverUser);
  await service.markDriverArrived(createdRide.id, driverUser);
  await service.startTrip(createdRide.id, driverUser);
  await service.completeTrip(createdRide.id, PaymentMethodValue.CASH, driverUser);

  await assert.rejects(
    () => service.cancelRide(createdRide.id, 'ADMIN_LATE_CANCEL', adminUser),
    (error) =>
      error instanceof BadRequestException &&
      /cannot be cancelled in its current status/.test(error.message),
  );
}

async function testCancelledRideCannotBeCancelledAgain() {
  const { service } = createCoreFlowMock();
  const passengerUser = {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  };

  const createdRide = await service.create({
    customerId: passengerUser.userId,
    pickupLat: 41.0167,
    pickupLng: 70.1436,
    dropoffLat: 41.03,
    dropoffLng: 70.16,
  });
  await service.cancelRide(createdRide.id, 'FIRST_CANCEL', passengerUser);

  await assert.rejects(
    () => service.cancelRide(createdRide.id, 'SECOND_CANCEL', passengerUser),
    (error) =>
      error instanceof BadRequestException &&
      /cannot be cancelled in its current status/.test(error.message),
  );
}

void main();
