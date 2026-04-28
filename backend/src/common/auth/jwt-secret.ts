import { ConfigService } from '@nestjs/config';

export function getJwtSecret(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (isProduction && (!secret || secret === 'change-me')) {
    throw new Error('JWT_SECRET must be set to a secure value in production');
  }

  return secret ?? 'change-me';
}
