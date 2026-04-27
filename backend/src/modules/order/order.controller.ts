import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRoleValue } from '../../common/roles';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.ADMIN)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orderService.create({
      ...dto,
      customerId:
        user.role === UserRoleValue.PASSENGER ? user.userId : dto.customerId,
    });
  }

  @Get('active')
  @Roles(UserRoleValue.ADMIN)
  findActive() {
    return this.orderService.findActive();
  }

  @Get('history/passenger')
  @Roles(UserRoleValue.PASSENGER)
  findPassengerHistory(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter?: string,
  ) {
    return this.orderService.findPassengerHistory(user, filter);
  }

  @Get('history/driver')
  @Roles(UserRoleValue.DRIVER)
  findDriverHistory(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter?: string,
  ) {
    return this.orderService.findDriverHistory(user, filter);
  }

  @Get(':rideId')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  findOne(@Param('rideId') rideId: string) {
    return this.orderService.findOne(rideId);
  }

  @Patch(':rideId/accept/:driverId')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  accept(
    @Param('rideId') rideId: string,
    @Param('driverId') driverId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.accept(rideId, driverId, user);
  }

  @Patch(':rideId/arrive')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  arrive(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.markDriverArrived(rideId, user);
  }

  @Patch(':rideId/start')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  start(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.startTrip(rideId, user);
  }

  @Patch(':rideId/cancel')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  cancel(
    @Param('rideId') rideId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.cancelRide(rideId, dto.reason, user);
  }

  @Patch(':rideId/complete')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  complete(
    @Param('rideId') rideId: string,
    @Body() dto: CompleteOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.completeTrip(
      rideId,
      {
        paymentMethod: dto.paymentMethod,
        waitingMinutes: dto.waitingMinutes,
        stopMinutes: dto.stopMinutes,
      },
      user,
    );
  }

  @Patch(':rideId/pay')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.ADMIN)
  pay(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.pay(rideId, user);
  }
}
