import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  DEFAULT_TARIFF_CLASS,
  TariffClass,
  TariffClassValue,
} from '../../pricing/tariff-class';

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsNumber()
  dropoffLat: number;

  @IsNumber()
  dropoffLng: number;

  @IsOptional()
  @IsString()
  dropoffAddress?: string;

  @IsOptional()
  @IsString()
  @IsIn([TariffClassValue.ECONOMY, TariffClassValue.COMFORT, TariffClassValue.PREMIUM])
  tariffClass?: TariffClass = DEFAULT_TARIFF_CLASS;
}
