import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { validateStartupEnv } from './env.validation';

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

function testProductionRequiresJwtSecret() {
  assert.throws(
    () => validateStartupEnv(config({ NODE_ENV: 'production' })),
    /JWT_SECRET is required/,
  );
}

function testProductionRejectsWeakJwtSecret() {
  assert.throws(
    () =>
      validateStartupEnv(
        config({
          NODE_ENV: 'production',
          JWT_SECRET: 'change-me',
          POSTGRES_PASSWORD: 'strong-postgres-password',
          NEXT_PUBLIC_ADMIN_PASSWORD: 'strong-admin-password',
        }),
      ),
    /JWT_SECRET must be at least 32 characters|JWT_SECRET cannot be change-me/,
  );
}

function testProductionRejectsWeakPasswords() {
  assert.throws(
    () =>
      validateStartupEnv(
        config({
          NODE_ENV: 'production',
          JWT_SECRET: '12345678901234567890123456789012',
          POSTGRES_PASSWORD: 'taxi',
          NEXT_PUBLIC_ADMIN_PASSWORD: 'strong-admin-password',
        }),
      ),
    /POSTGRES_PASSWORD uses an unsafe production value/,
  );

  assert.throws(
    () =>
      validateStartupEnv(
        config({
          NODE_ENV: 'production',
          JWT_SECRET: '12345678901234567890123456789012',
          POSTGRES_PASSWORD: 'strong-postgres-password',
          NEXT_PUBLIC_ADMIN_PASSWORD: 'password123',
        }),
      ),
    /NEXT_PUBLIC_ADMIN_PASSWORD uses an unsafe production value/,
  );
}

function testProductionAcceptsStrongValues() {
  assert.doesNotThrow(() =>
    validateStartupEnv(
      config({
        NODE_ENV: 'production',
        JWT_SECRET: '12345678901234567890123456789012',
        POSTGRES_PASSWORD: 'strong-postgres-password',
        NEXT_PUBLIC_ADMIN_PASSWORD: 'strong-admin-password',
      }),
    ),
  );
}

function testDevelopmentAllowsLocalDefaults() {
  assert.doesNotThrow(() =>
    validateStartupEnv(
      config({
        NODE_ENV: 'development',
        JWT_SECRET: 'change-me',
        POSTGRES_PASSWORD: 'taxi',
        NEXT_PUBLIC_ADMIN_PASSWORD: 'password123',
      }),
    ),
  );
}

testProductionRequiresJwtSecret();
testProductionRejectsWeakJwtSecret();
testProductionRejectsWeakPasswords();
testProductionAcceptsStrongValues();
testDevelopmentAllowsLocalDefaults();

console.log('env validation tests passed');
