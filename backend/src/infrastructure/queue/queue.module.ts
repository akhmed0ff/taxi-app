import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';
import { RideMatchingProcessor } from './ride-matching.processor';

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
    BullModule.registerQueue({
      name: 'price-recalculation',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    }),
    RedisModule,
    SocketModule,
  ],
  providers: [RideMatchingProcessor],
})
export class QueueModule {}
