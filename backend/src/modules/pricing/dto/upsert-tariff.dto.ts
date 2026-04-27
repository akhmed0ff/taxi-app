import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertTariffDto {
  @IsString()
  city: string;

  @IsNumber()
  baseFare: number;

  @IsNumber()
  perKm: number;

  @IsNumber()
  perMinute: number;

  @IsNumber()
  surgeMultiplier: number;

  @IsNumber()
  minimumFare: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
