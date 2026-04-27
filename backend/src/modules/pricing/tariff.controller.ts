import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRoleValue } from '../../common/roles';
import { PricingService } from './pricing.service';
import { UpsertTariffDto } from './dto/upsert-tariff.dto';

@Controller('admin/tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleValue.ADMIN)
export class TariffController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  findTariffs() {
    return this.pricingService.findTariffs();
  }

  @Post()
  createTariff(@Body() dto: UpsertTariffDto) {
    return this.pricingService.createTariff(dto);
  }

  @Patch(':tariffId')
  updateTariff(
    @Param('tariffId') tariffId: string,
    @Body() dto: Partial<UpsertTariffDto>,
  ) {
    return this.pricingService.updateTariff(tariffId, dto);
  }
}
