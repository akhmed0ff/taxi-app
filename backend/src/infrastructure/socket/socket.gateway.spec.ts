import { strict as assert } from 'node:assert';
import { UserRoleValue } from '../../common/roles';
import { RideOfferStatusValue } from '../../modules/matching/ride-offer-status';
import {
  getAllowedOrigins,
  isAllowedSocketOrigin,
  SocketGateway,
} from './socket.gateway';

interface TestSocket {
  handshake: {
    auth?: Record<string, unknown>;
    headers: Record<string, unknown>;
  };
  data: Record<string, unknown>;
  joinedRooms: string[];
  disconnected: boolean;
  join: (room: string) => void;
  disconnect: (close?: boolean) => void;
}

interface RideOfferState {
  rideId: string;
  driverId: string;
  status: string;
  rejectedAt: Date | null;
}

function createSocket(auth: Record<string, unknown>, headers: Record<string, unknown> = {}): TestSocket {
  const socket: TestSocket = {
    handshake: { auth, headers },
    data: {},
    joinedRooms: [],
    disconnected: false,
    join: (room: string) => {
      socket.joinedRooms.push(room);
    },
    disconnect: () => {
      socket.disconnected = true;
    },
  };

  return socket;
}

function createGateway() {
  const state = {
    rideOffers: new Map<string, RideOfferState>([
      [
        'ride-1:driver-1',
        {
          rideId: 'ride-1',
          driverId: 'driver-1',
          status: RideOfferStatusValue.SENT,
          rejectedAt: null as Date | null,
        },
      ],
    ]),
    redisRejectedOffers: [] as Array<{ rideId: string; driverId: string }>,
  };
  const jwt = {
    verifyAsync: async (token: string) => {
      if (token === 'passenger-token') {
        return {
          userId: 'passenger-1',
          sub: 'passenger-1',
          role: UserRoleValue.PASSENGER,
        };
      }

      if (token === 'driver-token') {
        return {
          userId: 'driver-user-1',
          sub: 'driver-user-1',
          role: UserRoleValue.DRIVER,
        };
      }

      if (token === 'admin-token') {
        return {
          userId: 'admin-1',
          sub: 'admin-1',
          role: UserRoleValue.ADMIN,
        };
      }

      throw new Error('invalid token');
    },
  };
  const prisma = {
    driver: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        where.userId === 'driver-user-1' ? { id: 'driver-1' } : null,
    },
    ride: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 'ride-1') {
          return {
            customerId: 'passenger-1',
            driverId: 'driver-1',
          };
        }

        if (where.id === 'ride-2') {
          return {
            customerId: 'passenger-2',
            driverId: 'driver-2',
          };
        }

        return null;
      },
    },
    rideOffer: {
      findUnique: async ({
        where,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
      }) =>
        state.rideOffers.get(
          `${where.rideId_driverId.rideId}:${where.rideId_driverId.driverId}`,
        ) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { rideId_driverId: { rideId: string; driverId: string } };
        data: { status: string; rejectedAt: Date };
      }) => {
        const key = `${where.rideId_driverId.rideId}:${where.rideId_driverId.driverId}`;
        const offer = state.rideOffers.get(key);
        assert.ok(offer, 'ride offer must exist before update');
        const nextOffer = { ...offer, ...data };
        state.rideOffers.set(key, nextOffer);
        return nextOffer;
      },
    },
  };
  const redis = {
    rejectRideOffer: async (rideId: string, driverId: string) => {
      state.redisRejectedOffers.push({ rideId, driverId });
      return { key: `ride:offer:${rideId}:${driverId}` };
    },
  };

  return {
    gateway: new SocketGateway(jwt as never, prisma as never, redis as never),
    state,
  };
}

async function testPassengerRoomsUseJwtIdentityOnly() {
  const { gateway } = createGateway();
  const socket = createSocket({
    accessToken: 'passenger-token',
    passengerId: 'passenger-2',
    driverId: 'driver-2',
  });

  await gateway.handleConnection(socket as never);

  assert.equal(socket.disconnected, false);
  assert.deepEqual(socket.data, {
    userId: 'passenger-1',
    role: UserRoleValue.PASSENGER,
  });
  assert.deepEqual(socket.joinedRooms, ['user:passenger-1', 'passenger:passenger-1']);
}

async function testDriverRoomsUseDatabaseProfileFromJwtUser() {
  const { gateway } = createGateway();
  const socket = createSocket({
    accessToken: 'driver-token',
    driverId: 'driver-2',
    passengerId: 'passenger-2',
  });

  await gateway.handleConnection(socket as never);

  assert.equal(socket.disconnected, false);
  assert.deepEqual(socket.data, {
    userId: 'driver-user-1',
    role: UserRoleValue.DRIVER,
    driverId: 'driver-1',
  });
  assert.deepEqual(socket.joinedRooms, ['user:driver-user-1', 'driver:driver-1']);
}

async function testAdminJoinsAdminRoom() {
  const { gateway } = createGateway();
  const socket = createSocket({ accessToken: 'admin-token' });

  await gateway.handleConnection(socket as never);

  assert.equal(socket.disconnected, false);
  assert.deepEqual(socket.data, {
    userId: 'admin-1',
    role: UserRoleValue.ADMIN,
  });
  assert.deepEqual(socket.joinedRooms, ['user:admin-1', 'admin']);
}

async function testAuthorizationHeaderTokenIsRejected() {
  const { gateway } = createGateway();
  const socket = createSocket({}, { authorization: 'Bearer passenger-token' });

  await gateway.handleConnection(socket as never);

  assert.equal(socket.disconnected, true);
  assert.deepEqual(socket.joinedRooms, []);
}

async function testCannotJoinAnotherUsersRide() {
  const { gateway } = createGateway();
  const socket = createSocket({ accessToken: 'passenger-token' });

  await gateway.handleConnection(socket as never);

  assert.deepEqual(await gateway.joinOrder(socket as never, 'ride-1'), { ok: true });
  assert.deepEqual(await gateway.joinOrder(socket as never, 'ride-2'), { ok: false });
}

async function testDriverCanRejectActiveRideOffer() {
  const { gateway, state } = createGateway();
  const socket = createSocket({ accessToken: 'driver-token' });

  await gateway.handleConnection(socket as never);

  assert.deepEqual(
    await gateway.rejectRideOffer(socket as never, 'ride-1', 'driver-1'),
    { ok: true },
  );

  const offer = state.rideOffers.get('ride-1:driver-1');
  assert.equal(offer?.status, RideOfferStatusValue.REJECTED);
  assert.ok(offer?.rejectedAt instanceof Date);
  assert.deepEqual(state.redisRejectedOffers, [
    { rideId: 'ride-1', driverId: 'driver-1' },
  ]);
}

async function testRejectMissingRideOfferReturnsFalse() {
  const { gateway, state } = createGateway();
  const socket = createSocket({ accessToken: 'driver-token' });

  await gateway.handleConnection(socket as never);

  assert.deepEqual(
    await gateway.rejectRideOffer(socket as never, 'missing-ride', 'driver-1'),
    { ok: false },
  );
  assert.deepEqual(state.redisRejectedOffers, []);
}

async function testDriverCannotRejectAnotherDriversOffer() {
  const { gateway, state } = createGateway();
  const socket = createSocket({ accessToken: 'driver-token' });

  await gateway.handleConnection(socket as never);

  assert.deepEqual(
    await gateway.rejectRideOffer(socket as never, 'ride-1', 'driver-2'),
    { ok: false },
  );
  assert.equal(
    state.rideOffers.get('ride-1:driver-1')?.status,
    RideOfferStatusValue.SENT,
  );
  assert.deepEqual(state.redisRejectedOffers, []);
}

async function testOfferEmitAckReturnsTrueWhenDriverAcknowledges() {
  const { gateway } = createGateway();
  const emitted: Array<{ room: string; timeoutMs: number; event: string }> = [];
  gateway.server = {
    to: (room: string) => ({
      timeout: (timeoutMs: number) => ({
        emit: (event: string, _payload: unknown, callback: (error: Error | null, responses: unknown[]) => void) => {
          emitted.push({ room, timeoutMs, event });
          callback(null, [{ ok: true }]);
        },
      }),
    }),
  } as never;

  assert.equal(
    await gateway.emitOfferToDriverWithAck('driver-1', { rideId: 'ride-1' }, 3_000),
    true,
  );
  assert.deepEqual(emitted, [
    { room: 'driver:driver-1', timeoutMs: 3_000, event: 'ride.offer' },
  ]);
}

async function testOfferEmitAckReturnsFalseOnTimeoutError() {
  const { gateway } = createGateway();
  gateway.server = {
    to: () => ({
      timeout: () => ({
        emit: (_event: string, _payload: unknown, callback: (error: Error, responses: unknown[]) => void) => {
          callback(new Error('operation has timed out'), []);
        },
      }),
    }),
  } as never;

  assert.equal(
    await gateway.emitOfferToDriverWithAck('driver-1', { rideId: 'ride-1' }, 3_000),
    false,
  );
}

function testAllowedSocketOriginUsesAllowedOrigins() {
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'ALLOWED_ORIGINS'
        ? 'http://localhost:3001, https://admin.yourdomain.com'
        : fallback,
  };

  assert.deepEqual(getAllowedOrigins(config as never), [
    'http://localhost:3001',
    'https://admin.yourdomain.com',
  ]);
  assert.equal(
    isAllowedSocketOrigin('http://localhost:3001', config as never),
    true,
  );
  assert.equal(
    isAllowedSocketOrigin('https://evil.example', config as never),
    false,
  );
  assert.equal(isAllowedSocketOrigin(undefined, config as never), true);
}

async function main() {
  await testPassengerRoomsUseJwtIdentityOnly();
  await testDriverRoomsUseDatabaseProfileFromJwtUser();
  await testAdminJoinsAdminRoom();
  await testAuthorizationHeaderTokenIsRejected();
  await testCannotJoinAnotherUsersRide();
  await testDriverCanRejectActiveRideOffer();
  await testRejectMissingRideOfferReturnsFalse();
  await testDriverCannotRejectAnotherDriversOffer();
  await testOfferEmitAckReturnsTrueWhenDriverAcknowledges();
  await testOfferEmitAckReturnsFalseOnTimeoutError();
  testAllowedSocketOriginUsesAllowedOrigins();
}

void main();
