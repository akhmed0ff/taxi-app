import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { UserRoleValue } from '../../../common/roles';

export class DevLoginDto {
  @ApiProperty({ example: '+998901112233' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'Local Driver' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: [UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN],
    required: false,
    default: UserRoleValue.PASSENGER,
  })
  @IsOptional()
  @IsString()
  @IsIn([UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN])
  role?: string;
}
