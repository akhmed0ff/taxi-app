import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string;
}

const WEAK_PRODUCTION_PASSWORDS = new Set([
  'taxi',
  'password',
  'password123',
  'change-me',
]);

export function validateStartupEnv(config: ConfigService) {
  validateEnvironmentVariables(config);

  if (config.get<string>('NODE_ENV') !== 'production') {
    return;
  }

  const jwtSecret = config.get<string>('JWT_SECRET');
  const postgresPassword = config.get<string>('POSTGRES_PASSWORD');
  const adminPassword = config.get<string>('NEXT_PUBLIC_ADMIN_PASSWORD');
  const allowedOrigins = config.get<string>('ALLOWED_ORIGINS');

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required in production');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (jwtSecret === 'change-me') {
    throw new Error('JWT_SECRET cannot be change-me in production');
  }

  if (!allowedOrigins?.trim()) {
    throw new Error('ALLOWED_ORIGINS is required in production');
  }

  assertStrongProductionPassword('POSTGRES_PASSWORD', postgresPassword);
  assertStrongProductionPassword('NEXT_PUBLIC_ADMIN_PASSWORD', adminPassword);
}

function validateEnvironmentVariables(config: ConfigService) {
  const validatedConfig = plainToInstance(EnvironmentVariables, {
    ALLOWED_ORIGINS: config.get<string>('ALLOWED_ORIGINS'),
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .filter(Boolean)
        .join('; '),
    );
  }
}

function assertStrongProductionPassword(name: string, value?: string) {
  if (!value) {
    throw new Error(`${name} is required in production`);
  }

  if (WEAK_PRODUCTION_PASSWORDS.has(value)) {
    throw new Error(`${name} uses an unsafe production value`);
  }
}
