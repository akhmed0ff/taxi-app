import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateDriverLocationDto {
  @ApiProperty({ example: 41.0167 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 70.1436 })
  @IsNumber()
  lng: number;
}
