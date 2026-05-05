import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRoleValue } from '../../common/roles';
import { DriverStatus } from './driver-status';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { DriverService } from './driver.service';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('drivers')
@ApiBearerAuth()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @Roles(UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'List drivers' })
  findAll(@Query() pagination: PaginationDto) {
    return this.driverService.findAll(pagination);
  }

  @Get('online')
  @Roles(UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'List online drivers' })
  findOnline() {
    return this.driverService.findOnline();
  }

  @Get(':driverId/rides')
  @Roles(UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'List driver rides' })
  findRides(
    @Param('driverId') driverId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.driverService.findRides(driverId, pagination);
  }

  @Patch(':driverId/status')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Update driver status' })
  updateStatus(
    @Param('driverId') driverId: string,
    @Body('status') status: DriverStatus,
    @CurrentUser() user: AuthUser,
  ) {
    return this.driverService.updateStatus(driverId, status, user);
  }

  @Patch(':driverId/location')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Update driver foreground location' })
  updateLocation(
    @Param('driverId') driverId: string,
    @Body() dto: UpdateDriverLocationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.driverService.updateLocation(driverId, dto.lat, dto.lng, user);
  }
}
