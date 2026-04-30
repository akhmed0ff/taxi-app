import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TARIFF_CLASS_VALUES } from '../tariff-class';

export class UpsertTariffDto {
  @ApiProperty({
    enum: TARIFF_CLASS_VALUES,
  })
  @IsString()
  @IsIn(TARIFF_CLASS_VALUES)
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
