import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TariffClassValue } from '../tariff-class';

export class UpsertTariffDto {
  @ApiProperty({
    enum: [
      TariffClassValue.ECONOMY,
      TariffClassValue.COMFORT,
      TariffClassValue.PREMIUM,
    ],
  })
  @IsString()
  @IsIn([
    TariffClassValue.ECONOMY,
    TariffClassValue.COMFORT,
    TariffClassValue.PREMIUM,
  ])
  tariffClass: string;

  @ApiPropertyOptional({ example: 'Angren' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  baseFare: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  perKm: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  freeWaitingMinutes: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  waitingPerMinute: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  stopPerMinute: number;

  @ApiProperty({ example: 8000 })
  @IsNumber()
  minimumFare: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
