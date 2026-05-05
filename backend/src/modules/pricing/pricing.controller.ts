import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';

@Controller('pricing')
@ApiTags('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('tariffs')
  @ApiOperation({ summary: 'List active public tariffs' })
  findActiveTariffs() {
    return this.pricingService.findActiveTariffs();
  }
}
