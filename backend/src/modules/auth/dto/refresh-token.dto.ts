import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-value' })
  @IsString()
  refreshToken: string;
}
