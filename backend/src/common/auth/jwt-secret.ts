import { ConfigService } from '@nestjs/config';

export function getJwtSecret(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (
    isProduction &&
    (!secret || secret === 'change-me' || secret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET must be set to a secure value of at least 32 characters in production',
    );
  }

  return secret ?? 'change-me';
}
