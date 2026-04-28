import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRoleValue } from '../../../common/roles';

export class RegisterDto {
  @ApiProperty({ example: '+998901112233' })
  @IsString()
  phone: string;

  @ApiProperty({ minLength: 6, example: 'strong-local-password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Akmal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: [UserRoleValue.PASSENGER, UserRoleValue.DRIVER] })
  @IsString()
  @IsIn([UserRoleValue.PASSENGER, UserRoleValue.DRIVER])
  role: string;
}
