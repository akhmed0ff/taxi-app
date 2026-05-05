import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/db/prisma.module';
import { RatingService } from './rating.service';

@Module({
  imports: [PrismaModule],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
