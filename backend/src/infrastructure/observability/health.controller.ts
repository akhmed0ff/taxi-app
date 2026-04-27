import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.client.ping();

    return {
      ok: true,
      services: {
        api: 'up',
        database: 'up',
        redis: 'up',
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
