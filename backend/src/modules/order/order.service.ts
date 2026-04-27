import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RealtimeEvent } from '../../common/realtime-events';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { DriverStatusValue } from '../driver/driver-status';
import { PaymentMethod, PaymentMethodValue } from '../payment/payment-method';
import { PaymentService } from '../payment/payment.service';
import { PricingService } from '../pricing/pricing.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ORDER_STATUS_FLOW, OrderStatus, OrderStatusValue } from './order-status';

const FALLBACK_TARIFF = {
  baseFare: 8000,
  perKm: 2500,
  perMinute: 400,
  surgeMultiplier: 1,
  minimumFare: 12000,
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly redis: RedisService,
    private readonly socket: SocketGateway,
    @InjectQueue('ride-matching') private readonly rideMatchingQueue: Queue,
  ) {}

  async create(dto: CreateOrderDto) {
    const estimate = await this.calculateEstimate(dto);

    const ride = await this.prisma.ride.create({
      data: {
        customerId: dto.customerId,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupAddress: dto.pickupAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        dropoffAddress: dto.dropoffAddress,
        distanceMeters: estimate.distanceMeters,
        estimatedFare: estimate.fare,
        status: OrderStatusValue.SEARCHING_DRIVER,
        statusHistory: {
          create: [
            { status: OrderStatusValue.CREATED },
            { status: OrderStatusValue.SEARCHING_DRIVER },
          ],
        },
      },
    });

    await this.rideMatchingQueue.add('find-driver', {
      rideId: ride.id,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
    }, {
      attempts: 4,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    });

    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.NEW_ORDER, ride);
    this.socket.emitToOrder(ride.id, RealtimeEvent.NEW_ORDER, ride);

    return ride;
  }

  async findOne(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { customer: true, driver: true, statusHistory: true, payment: true },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  async accept(rideId: string, driverId: string) {
    const ride = await this.transitionRide(rideId, OrderStatusValue.DRIVER_ASSIGNED, {
      driverId,
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatusValue.BUSY },
    });

    this.socket.emitToDriver(driverId, RealtimeEvent.DRIVER_ACCEPTED, ride);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.DRIVER_ACCEPTED, ride);
    this.socket.emitToOrder(ride.id, RealtimeEvent.DRIVER_ACCEPTED, ride);

    return ride;
  }

  async markDriverArrived(rideId: string) {
    const ride = await this.transitionRide(rideId, OrderStatusValue.DRIVER_ARRIVED);

    this.socket.emitToOrder(ride.id, RealtimeEvent.DRIVER_ACCEPTED, ride);
    return ride;
  }

  async startTrip(rideId: string) {
    const ride = await this.transitionRide(rideId, OrderStatusValue.IN_PROGRESS);

    this.socket.emitToOrder(ride.id, RealtimeEvent.TRIP_STARTED, ride);
    return ride;
  }

  async completeTrip(
    rideId: string,
    paymentMethod: PaymentMethod = PaymentMethodValue.CASH,
  ) {
    const currentRide = await this.findOne(rideId);
    const finalFare = currentRide.finalFare ?? currentRide.estimatedFare ?? 0;

    const ride = await this.transitionRide(rideId, OrderStatusValue.COMPLETED, {
      finalFare,
    });

    const payment = await this.paymentService.createPendingPayment(
      ride.id,
      ride.customerId,
      finalFare,
      paymentMethod,
    );

    if (ride.driverId) {
      await this.prisma.driver.update({
        where: { id: ride.driverId },
        data: { status: DriverStatusValue.ONLINE },
      });
    }

    const payload = { ride, payment };
    this.socket.emitToOrder(ride.id, RealtimeEvent.TRIP_COMPLETED, payload);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.TRIP_COMPLETED, payload);

    return payload;
  }

  async pay(rideId: string) {
    const ride = await this.findOne(rideId);

    if (ride.status !== OrderStatusValue.COMPLETED) {
      throw new BadRequestException('Ride must be completed before payment');
    }

    const payment = await this.paymentService.markPaid(rideId);
    const payload = { ride, payment };

    this.socket.emitToOrder(ride.id, RealtimeEvent.PAYMENT_COMPLETED, payload);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.PAYMENT_COMPLETED, payload);

    return payload;
  }

  private async transitionRide(
    rideId: string,
    nextStatus: OrderStatus,
    extraData: { driverId?: string; finalFare?: number } = {},
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    this.assertTransition(ride.status as OrderStatus, nextStatus);

    return this.prisma.ride.update({
      where: { id: rideId },
      data: {
        ...extraData,
        status: nextStatus,
        statusHistory: {
          create: { status: nextStatus },
        },
      },
    });
  }

  private assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
    if (!ORDER_STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid ride status transition: ${currentStatus} -> ${nextStatus}`,
      );
    }
  }

  private async calculateEstimate(dto: CreateOrderDto) {
    const distanceMeters = calculateDistanceMeters(
      dto.pickupLat,
      dto.pickupLng,
      dto.dropoffLat,
      dto.dropoffLng,
    );
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = Math.max(4, Math.round((distanceKm / 35) * 60));
    const tariff = await this.getActiveTariff();

    return {
      distanceMeters,
      durationMinutes,
      fare: this.pricingService.calculateFare({
        baseFare: tariff.baseFare,
        distanceKm,
        durationMinutes,
        pricePerKm: tariff.perKm,
        pricePerMinute: tariff.perMinute,
        surgeMultiplier: tariff.surgeMultiplier,
        minimumFare: tariff.minimumFare,
      }),
    };
  }

  private async getActiveTariff() {
    const cacheKey = 'tariff:active';
    const cached = await this.redis.client.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as typeof FALLBACK_TARIFF;
    }

    const tariff =
      (await this.prisma.tariff.findFirst({ where: { active: true } })) ??
      FALLBACK_TARIFF;

    await this.redis.client.set(cacheKey, JSON.stringify(tariff), 'EX', 60);
    return tariff;
  }
}

function calculateDistanceMeters(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(endLat - startLat);
  const deltaLng = toRadians(endLng - startLng);
  const startLatRad = toRadians(startLat);
  const endLatRad = toRadians(endLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLatRad) *
      Math.cos(endLatRad) *
      Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
