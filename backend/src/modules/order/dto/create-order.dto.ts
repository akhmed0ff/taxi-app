import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  DEFAULT_TARIFF_CLASS,
  TariffClass,
  TariffClassValue,
} from '../../pricing/tariff-class';

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-user-id' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 41.0167 })
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ example: 70.1436 })
  @IsNumber()
  pickupLng: number;

  @ApiPropertyOptional({ example: 'Angren city center' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiProperty({ example: 41.024 })
  @IsNumber()
  dropoffLat: number;

  @ApiProperty({ example: 70.169 })
  @IsNumber()
  dropoffLng: number;

  @ApiPropertyOptional({ example: 'Angren railway station' })
  @IsOptional()
  @IsString()
  dropoffAddress?: string;

  @ApiPropertyOptional({
    enum: [
      TariffClassValue.ECONOMY,
      TariffClassValue.COMFORT,
      TariffClassValue.PREMIUM,
    ],
    default: DEFAULT_TARIFF_CLASS,
  })
  @IsOptional()
  @IsString()
  @IsIn([
    TariffClassValue.ECONOMY,
    TariffClassValue.COMFORT,
    TariffClassValue.PREMIUM,
  ])
  tariffClass?: TariffClass = DEFAULT_TARIFF_CLASS;
}
