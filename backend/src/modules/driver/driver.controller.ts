import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { DriverStatus } from './driver-status';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('online')
  findOnline() {
    return this.driverService.findOnline();
  }

  @Patch(':driverId/status')
  updateStatus(
    @Param('driverId') driverId: string,
    @Body('status') status: DriverStatus,
  ) {
    return this.driverService.updateStatus(driverId, status);
  }

  @Patch(':driverId/location')
  updateLocation(
    @Param('driverId') driverId: string,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.driverService.updateLocation(driverId, dto.lat, dto.lng);
  }
}
