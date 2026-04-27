import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Get(':rideId')
  findOne(@Param('rideId') rideId: string) {
    return this.orderService.findOne(rideId);
  }

  @Patch(':rideId/accept/:driverId')
  accept(
    @Param('rideId') rideId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.orderService.accept(rideId, driverId);
  }

  @Patch(':rideId/arrive')
  arrive(@Param('rideId') rideId: string) {
    return this.orderService.markDriverArrived(rideId);
  }

  @Patch(':rideId/start')
  start(@Param('rideId') rideId: string) {
    return this.orderService.startTrip(rideId);
  }

  @Patch(':rideId/complete')
  complete(@Param('rideId') rideId: string, @Body() dto: CompleteOrderDto) {
    return this.orderService.completeTrip(rideId, dto.paymentMethod);
  }

  @Patch(':rideId/pay')
  pay(@Param('rideId') rideId: string) {
    return this.orderService.pay(rideId);
  }
}
