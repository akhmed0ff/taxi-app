import { IsNumber } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
