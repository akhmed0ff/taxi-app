import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';

@Controller('tariffs')
@ApiTags('tariffs')
export class PublicTariffsController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Public tariff list for passenger apps (active, sorted)' })
  findForPassengerApps() {
    return this.pricingService.findCustomerTariffs();
  }
}
