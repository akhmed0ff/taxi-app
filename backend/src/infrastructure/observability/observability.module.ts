import { Module } from '@nestjs/common';
import { PrismaModule } from '../db/prisma.module';
import { MapsModule } from '../maps/maps.module';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { LoggingInterceptor } from './logging.interceptor';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [PrismaModule, RedisModule, MapsModule],
  controllers: [HealthController, MetricsController],
  providers: [LoggingInterceptor, MetricsService],
  exports: [LoggingInterceptor, MetricsService],
})
export class ObservabilityModule {}
