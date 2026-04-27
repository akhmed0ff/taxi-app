import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SocketModule } from '../../infrastructure/socket/socket.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PaymentModule } from '../payment/payment.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ride-matching',
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    }),
    PaymentModule,
    PricingModule,
    RedisModule,
    SocketModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
