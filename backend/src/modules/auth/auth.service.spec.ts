import { strict as assert } from 'node:assert';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRoleValue } from '../../common/roles';
import { AuthService } from './auth.service';

interface UserState {
  id: string;
  phone: string;
  name?: string;
  role: string;
  passwordHash?: string | null;
}

interface RefreshTokenState {
  id: string;
  userId: string;
  tokenHash: string;
  revoked: boolean;
  expiresAt: Date;
  user?: UserState;
}

function createAuthMock() {
  let userCounter = 0;
  let refreshTokenCounter = 0;
  const state = {
    users: new Map<string, UserState>(),
    refreshTokens: new Map<string, RefreshTokenState>(),
    drivers: new Map<string, { id: string; userId: string }>(),
    signedTokens: [] as Array<{ sub: string; role: string }>,
  };

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { phone?: string; id?: string } }) =>
        findUser(state.users, where),
      create: async ({ data }: { data: Omit<UserState, 'id'> }) => {
        userCounter += 1;
        const user = { id: `user-${userCounter}`, ...data };
        state.users.set(user.id, user);
        return user;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<UserState>;
      }) => {
        const user = state.users.get(where.id);
        assert.ok(user, 'user must exist before update');
        const nextUser = { ...user, ...data };
        state.users.set(where.id, nextUser);
        return nextUser;
      },
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { phone: string };
        update: Partial<UserState>;
        create: Omit<UserState, 'id'>;
      }) => {
        const existingUser = findUser(state.users, where);

        if (existingUser) {
          const nextUser = { ...existingUser, ...update };
          state.users.set(existingUser.id, nextUser);
          return nextUser;
        }

        userCounter += 1;
        const user = { id: `user-${userCounter}`, ...create };
        state.users.set(user.id, user);
        return user;
      },
    },
    driver: {
      upsert: async ({
        where,
        create,
      }: {
        where: { userId: string };
        create: { userId: string };
      }) => {
        const existingDriver = state.drivers.get(where.userId);

        if (existingDriver) {
          return existingDriver;
        }

        const driver = { id: `driver-${state.drivers.size + 1}`, ...create };
        state.drivers.set(where.userId, driver);
        return driver;
      },
    },
    refreshToken: {
      create: async ({
        data,
      }: {
        data: Omit<RefreshTokenState, 'id' | 'revoked'>;
      }) => {
        refreshTokenCounter += 1;
        const refreshToken = {
          id: `refresh-${refreshTokenCounter}`,
          revoked: false,
          ...data,
        };
        state.refreshTokens.set(refreshToken.id, refreshToken);
        return refreshToken;
      },
      findFirst: async ({
        where,
      }: {
        where: {
          tokenHash: string;
          revoked: boolean;
          expiresAt: { gt: Date };
        };
      }) => {
        const refreshToken = [...state.refreshTokens.values()].find(
          (token) =>
            token.tokenHash === where.tokenHash &&
            token.revoked === where.revoked &&
            token.expiresAt > where.expiresAt.gt,
        );

        if (!refreshToken) {
          return null;
        }

        return {
          ...refreshToken,
          user: state.users.get(refreshToken.userId),
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<RefreshTokenState>;
      }) => {
        const refreshToken = state.refreshTokens.get(where.id);
        assert.ok(refreshToken, 'refresh token must exist before update');
        const nextRefreshToken = { ...refreshToken, ...data };
        state.refreshTokens.set(where.id, nextRefreshToken);
        return nextRefreshToken;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { tokenHash: string; revoked: boolean };
        data: Partial<RefreshTokenState>;
      }) => {
        let count = 0;

        for (const [id, token] of state.refreshTokens) {
          if (token.tokenHash === where.tokenHash && token.revoked === where.revoked) {
            state.refreshTokens.set(id, { ...token, ...data });
            count += 1;
          }
        }

        return { count };
      },
    },
  };
  const jwt = {
    signAsync: async (payload: { sub: string; role: string }) => {
      state.signedTokens.push(payload);
      return `access-${state.signedTokens.length}`;
    },
  };
  const service = new AuthService(jwt as never, prisma as never);

  return { service, state };
}

async function testRegisterLoginRefreshLogout() {
  const { service, state } = createAuthMock();
  const registered = await service.register({
    phone: '+998900001111',
    password: 'password123',
    name: 'Passenger',
    role: UserRoleValue.PASSENGER,
  });

  assert.equal(registered.user.phone, '+998900001111');
  assert.ok(registered.user.passwordHash);
  assert.ok(registered.accessToken);
  assert.ok(registered.refreshToken);

  const loggedIn = await service.login({
    phone: '+998900001111',
    password: 'password123',
  });
  assert.ok(loggedIn.accessToken);
  assert.ok(loggedIn.refreshToken);

  await assert.rejects(
    () => service.login({ phone: '+998900001111', password: 'wrong-pass' }),
    UnauthorizedException,
  );

  const refreshed = await service.refresh({
    refreshToken: loggedIn.refreshToken,
  });
  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
  assert.notEqual(refreshed.refreshToken, loggedIn.refreshToken);

  await assert.rejects(
    () => service.refresh({ refreshToken: loggedIn.refreshToken }),
    UnauthorizedException,
  );

  const logout = await service.logout({
    refreshToken: refreshed.refreshToken,
  });
  assert.deepEqual(logout, { ok: true });
  assert.equal([...state.refreshTokens.values()].filter((token) => token.revoked).length, 2);
}

async function testDevLoginDisabledInProduction() {
  const { service } = createAuthMock();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    await assert.rejects(
      () =>
        service.devLogin({
          phone: '+998900002222',
          name: 'Dev',
          role: UserRoleValue.PASSENGER,
        }),
      ForbiddenException,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
}

async function testRegisterCreatesDriverProfile() {
  const { service } = createAuthMock();
  const registered = await service.register({
    phone: '+998900003333',
    password: 'password123',
    name: 'Driver',
    role: UserRoleValue.DRIVER,
  });

  assert.equal(registered.driver?.userId, registered.user.id);
}

async function main() {
  await testRegisterLoginRefreshLogout();
  await testDevLoginDisabledInProduction();
  await testRegisterCreatesDriverProfile();
}

function findUser(users: Map<string, UserState>, where: { phone?: string; id?: string }) {
  return [...users.values()].find(
    (user) => user.phone === where.phone || user.id === where.id,
  ) ?? null;
}

void main();
