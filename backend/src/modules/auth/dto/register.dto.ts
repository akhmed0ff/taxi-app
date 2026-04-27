import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRoleValue } from '../../../common/roles';

export class RegisterDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN])
  role?: string;
}
