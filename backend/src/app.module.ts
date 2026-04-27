import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './infrastructure/db/prisma.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { NotificationsModule } from './infrastructure/queue/notifications/notifications.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriverModule } from './modules/driver/driver.module';
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
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DriverModule,
    RedisModule,
    OrderModule,
    PricingModule,
    PaymentModule,
    SocketModule,
    QueueModule,
    NotificationsModule,
    ObservabilityModule,
  ],
})
export class AppModule {}
