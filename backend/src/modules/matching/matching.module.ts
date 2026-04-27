import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/db/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { SocketModule } from '../../infrastructure/socket/socket.module';
import { MatchingProcessor } from './matching.processor';
import { MatchingService } from './matching.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ride-matching',
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    }),
    PrismaModule,
    RedisModule,
    SocketModule,
  ],
  providers: [MatchingProcessor, MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
