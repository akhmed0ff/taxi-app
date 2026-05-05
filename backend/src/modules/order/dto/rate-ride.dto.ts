import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RateRideDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: 1 | 2 | 3 | 4 | 5;
}
