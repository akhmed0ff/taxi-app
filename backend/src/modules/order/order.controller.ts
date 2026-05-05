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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRoleValue } from '../../common/roles';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateRideDto } from './dto/rate-ride.dto';
import { OrderService } from './order.service';
import { RatingService } from '../rating/rating.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('orders')
@ApiBearerAuth()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly ratingService: RatingService,
  ) {}

  @Post()
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Create a ride order' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orderService.create({
      ...dto,
      customerId:
        user.role === UserRoleValue.PASSENGER ? user.userId : dto.customerId,
    });
  }

  @Get('active')
  @Roles(UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'List active ride orders' })
  findActive() {
    return this.orderService.findActive();
  }

  @Get('history/passenger')
  @Roles(UserRoleValue.PASSENGER)
  @ApiOperation({ summary: 'Passenger ride history' })
  findPassengerHistory(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<unknown> {
    return this.orderService.findPassengerHistory(
      user,
      filter,
      parsePositiveInt(page, 1),
      parsePositiveInt(limit, 20),
    );
  }

  @Get('history/driver')
  @Roles(UserRoleValue.DRIVER)
  @ApiOperation({ summary: 'Driver ride history' })
  findDriverHistory(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<unknown> {
    return this.orderService.findDriverHistory(
      user,
      filter,
      parsePositiveInt(page, 1),
      parsePositiveInt(limit, 20),
    );
  }

  @Get(':rideId')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Get ride order details' })
  findOne(@Param('rideId') rideId: string) {
    return this.orderService.findOne(rideId);
  }

  @Patch(':rideId/accept/:driverId')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Accept a ride as driver' })
  accept(
    @Param('rideId') rideId: string,
    @Param('driverId') driverId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.accept(rideId, driverId, user);
  }

  @Patch(':rideId/arrive')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Mark driver arrived' })
  arrive(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.markDriverArrived(rideId, user);
  }

  @Patch(':rideId/start')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Start a ride' })
  start(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.startTrip(rideId, user);
  }

  @Patch(':rideId/cancel')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Cancel a ride before completion' })
  cancel(
    @Param('rideId') rideId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.cancelRide(rideId, dto.reason, user);
  }

  @Patch(':rideId/complete')
  @Roles(UserRoleValue.DRIVER, UserRoleValue.ADMIN)
  @ApiOperation({ summary: 'Complete a ride' })
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
  @ApiOperation({ summary: 'Mark ride payment as paid' })
  pay(@Param('rideId') rideId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.pay(rideId, user);
  }

  @Patch(':rideId/rate')
  @Roles(UserRoleValue.PASSENGER, UserRoleValue.DRIVER)
  @ApiOperation({ summary: 'Rate a completed ride' })
  rate(
    @Param('rideId') rideId: string,
    @Body() dto: RateRideDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ratingService.rateRide(
      rideId,
      user.userId,
      dto.rating,
      user.role === UserRoleValue.DRIVER ? 'DRIVER' : 'PASSENGER',
    );
  }
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
