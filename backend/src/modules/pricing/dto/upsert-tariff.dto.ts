import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { TariffClassValue } from '../tariff-class';

export class UpsertTariffDto {
  @IsString()
  @IsIn([TariffClassValue.ECONOMY, TariffClassValue.COMFORT, TariffClassValue.PREMIUM])
  tariffClass: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsNumber()
  baseFare: number;

  @IsNumber()
  perKm: number;

  @IsNumber()
  freeWaitingMinutes: number;

  @IsNumber()
  waitingPerMinute: number;

  @IsNumber()
  stopPerMinute: number;

  @IsNumber()
  minimumFare: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
