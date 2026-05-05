import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/db/prisma.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { NotificationsModule } from './infrastructure/queue/notifications/notifications.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { createRedisOptions } from './infrastructure/redis/redis.service';
import { SocketModule } from './infrastructure/socket/socket.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriverModule } from './modules/driver/driver.module';
import { MatchingModule } from './modules/matching/matching.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: createRedisOptions(config),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        void config;

        return {
          throttlers: [{ ttl: 60_000, limit: 10 }],
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DriverModule,
    MatchingModule,
    RedisModule,
    OrderModule,
    PricingModule,
    PaymentModule,
    SocketModule,
    QueueModule,
    NotificationsModule,
    ObservabilityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
