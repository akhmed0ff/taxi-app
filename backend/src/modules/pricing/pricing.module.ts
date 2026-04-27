import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/db/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TariffController } from './tariff.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TariffController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
