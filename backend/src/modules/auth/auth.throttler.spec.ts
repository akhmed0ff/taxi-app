import { strict as assert } from 'node:assert';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot({
        throttlers: [{ ttl: 60_000, limit: 10 }],
      }),
    ],
    controllers: [AuthController],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
      {
        provide: AuthService,
        useValue: {
          login: async () => {
            throw new UnauthorizedException('Invalid credentials');
          },
          register: async () => undefined,
          refresh: async () => undefined,
          logout: async () => undefined,
          devLogin: async () => undefined,
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.listen(0);

  try {
    await assertLoginIsThrottled(app);
  } finally {
    await app.close();
  }
}

async function assertLoginIsThrottled(app: INestApplication) {
  const baseUrl = await app.getUrl();
  const requestBody = JSON.stringify({
    phone: '+998900000001',
    password: 'wrong-password',
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: requestBody,
    });

    assert.equal(response.status, 401);
  }

  const throttledResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: requestBody,
  });

  assert.equal(throttledResponse.status, 429);
}

void main();
