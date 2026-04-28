import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+998901112233' })
  @IsString()
  phone: string;

  @ApiProperty({ minLength: 6, example: 'strong-local-password' })
  @IsString()
  @MinLength(6)
  password: string;
}
