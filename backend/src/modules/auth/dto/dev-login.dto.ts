import { IsIn, IsOptional, IsString } from 'class-validator';
import { UserRoleValue } from '../../../common/roles';

export class DevLoginDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsIn([UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN])
  role: string;
}
