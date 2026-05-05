import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../db/prisma.service';
import { MapboxService } from '../maps/mapbox.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mapbox: MapboxService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.ping();

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

  @Get('redis')
  async checkRedis() {
    const pong = await this.redis.ping();

    return {
      ok: pong === 'PONG',
      service: 'redis',
      response: pong,
      checkedAt: new Date().toISOString(),
    };
  }

  @Get('mapbox')
  async checkMapbox() {
    if (!this.mapbox.isConfigured()) {
      return {
        ok: false,
        service: 'mapbox',
        configured: false,
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const route = await this.mapbox.getRoute(41.0167, 70.1436, 41.024, 70.169);

      return {
        ok: true,
        service: 'mapbox',
        configured: true,
        distanceMeters: route.distanceMeters,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ok: false,
        service: 'mapbox',
        configured: true,
        error: error instanceof Error ? error.message : 'Mapbox check failed',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
