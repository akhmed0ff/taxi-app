import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  DEFAULT_TARIFF_CLASS,
  TariffClass,
  TARIFF_CLASS_VALUES,
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
    enum: TARIFF_CLASS_VALUES,
    default: DEFAULT_TARIFF_CLASS,
  })
  @IsOptional()
  @IsString()
  @IsIn(TARIFF_CLASS_VALUES)
  tariffClass?: TariffClass = DEFAULT_TARIFF_CLASS;

  @ApiPropertyOptional({
    description:
      'Optional Tariff row id from GET /tariffs; must be active and match tariffClass when both are sent.',
    example: 'cltxyz123',
  })
  @IsOptional()
  @IsString()
  tariffId?: string;
}
