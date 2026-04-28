import { strict as assert } from 'node:assert';
import { UserRoleValue } from '../../common/roles';
import { SocketGateway } from './socket.gateway';

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
  };

  return new SocketGateway(jwt as never, prisma as never);
}

async function testPassengerRoomsUseJwtIdentityOnly() {
  const gateway = createGateway();
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
  const gateway = createGateway();
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

async function testAuthorizationHeaderTokenIsRejected() {
  const gateway = createGateway();
  const socket = createSocket({}, { authorization: 'Bearer passenger-token' });

  await gateway.handleConnection(socket as never);

  assert.equal(socket.disconnected, true);
  assert.deepEqual(socket.joinedRooms, []);
}

async function testCannotJoinAnotherUsersRide() {
  const gateway = createGateway();
  const socket = createSocket({ accessToken: 'passenger-token' });

  await gateway.handleConnection(socket as never);

  assert.deepEqual(await gateway.joinOrder(socket as never, 'ride-1'), { ok: true });
  assert.deepEqual(await gateway.joinOrder(socket as never, 'ride-2'), { ok: false });
}

async function main() {
  await testPassengerRoomsUseJwtIdentityOnly();
  await testDriverRoomsUseDatabaseProfileFromJwtUser();
  await testAuthorizationHeaderTokenIsRejected();
  await testCannotJoinAnotherUsersRide();
}

void main();
