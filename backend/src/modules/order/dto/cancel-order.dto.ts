import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    maxLength: 200,
    example: 'Passenger cancelled before pickup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
