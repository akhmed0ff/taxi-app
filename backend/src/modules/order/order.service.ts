import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { AuthUser } from '../../common/auth/auth-user';
import { RealtimeEvent } from '../../common/realtime-events';
import { UserRoleValue } from '../../common/roles';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MapboxService } from '../../infrastructure/maps/mapbox.service';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { DriverStatusValue } from '../driver/driver-status';
import { PaymentMethod, PaymentMethodValue } from '../payment/payment-method';
import { PaymentService } from '../payment/payment.service';
import { PricingService } from '../pricing/pricing.service';
import {
  DEFAULT_TARIFF_CLASS,
  TariffClass,
} from '../pricing/tariff-class';
import { CreateOrderDto } from './dto/create-order.dto';
import { ORDER_STATUS_FLOW, OrderStatus, OrderStatusValue } from './order-status';
import { getRideStatusesForHistoryFilter } from './ride-history-filter';

interface CompleteTripInput {
  paymentMethod?: PaymentMethod;
  waitingMinutes?: number;
  stopMinutes?: number;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly redis: RedisService,
    private readonly socket: SocketGateway,
    @InjectQueue('ride-matching') private readonly rideMatchingQueue: Queue,
    @Optional() private readonly mapbox?: MapboxService,
  ) {}

  async create(dto: CreateOrderDto) {
    const estimate = await this.calculateEstimate(dto);

    const ride = await this.prisma.ride.create({
      data: {
        customerId: dto.customerId,
        tariffClass: dto.tariffClass ?? DEFAULT_TARIFF_CLASS,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupAddress: dto.pickupAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        dropoffAddress: dto.dropoffAddress,
        distanceMeters: estimate.distanceMeters,
        estimatedFare: estimate.fare,
        estimatedFareDetails: estimate.details as unknown as Prisma.InputJsonValue,
        status: OrderStatusValue.SEARCHING_DRIVER,
        statusHistory: {
          create: [
            { status: OrderStatusValue.CREATED },
            { status: OrderStatusValue.SEARCHING_DRIVER },
          ],
        },
      },
    });

    await this.rideMatchingQueue.add(
      'find-driver',
      {
        rideId: ride.id,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        attempt: 1,
      },
      {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.NEW_ORDER, ride);
    this.socket.emitToOrder(ride.id, RealtimeEvent.NEW_ORDER, ride);
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, ride);

    return ride;
  }

  async findOne(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: true,
        driver: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        payment: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  findActive() {
    return this.prisma.ride.findMany({
      where: {
        status: {
          in: [
            OrderStatusValue.SEARCHING_DRIVER,
            OrderStatusValue.DRIVER_ASSIGNED,
            OrderStatusValue.DRIVER_ARRIVED,
            OrderStatusValue.IN_PROGRESS,
          ],
        },
      },
      include: {
        customer: true,
        driver: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPassengerHistory(user: AuthUser, filter?: string) {
    const statuses = getRideStatusesForHistoryFilter(filter);

    return this.prisma.ride.findMany({
      where: {
        customerId: user.userId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: {
        driver: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findDriverHistory(user: AuthUser, filter?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const statuses = getRideStatusesForHistoryFilter(filter);

    return this.prisma.ride.findMany({
      where: {
        driverId: driver.id,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: {
        customer: true,
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async accept(rideId: string, driverId: string, user?: AuthUser) {
    await this.assertDriverActor(driverId, user);
    const lockAcquired = await this.redis.acceptRideWithLock(rideId, driverId);

    if (!lockAcquired) {
      throw new BadRequestException(
        'Ride is already being accepted by another driver',
      );
    }

    const ride = await this.prisma.$transaction(async (tx) => {
      const driverUpdate = await tx.driver.updateMany({
        where: {
          id: driverId,
          status: DriverStatusValue.ONLINE,
        },
        data: { status: DriverStatusValue.BUSY },
      });

      if (driverUpdate.count !== 1) {
        throw new BadRequestException('Only ONLINE drivers can accept new rides');
      }

      const rideUpdate = await tx.ride.updateMany({
        where: {
          id: rideId,
          driverId: null,
          status: OrderStatusValue.SEARCHING_DRIVER,
        },
        data: {
          driverId,
          status: OrderStatusValue.DRIVER_ASSIGNED,
        },
      });

      if (rideUpdate.count !== 1) {
        throw new BadRequestException(
          'Ride has already been assigned or is no longer searching for a driver',
        );
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: OrderStatusValue.DRIVER_ASSIGNED,
        },
      });

      const assignedRide = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          driver: {
            include: {
              user: true,
              vehicle: true,
            },
          },
        },
      });

      if (!assignedRide) {
        throw new NotFoundException('Ride not found');
      }

      return assignedRide;
    });

    this.socket.emitToDriver(driverId, RealtimeEvent.DRIVER_ACCEPTED, ride);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.DRIVER_ACCEPTED, ride);
    this.socket.emitToPassenger(
      ride.customerId,
      RealtimeEvent.DRIVER_ASSIGNED_LOWER,
      {
        driver: mapRideDriverForSocket(ride),
        ride,
      },
    );
    this.socket.emitToOrder(ride.id, RealtimeEvent.DRIVER_ACCEPTED, ride);
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, ride);
    this.socket.emitToAdmins(RealtimeEvent.DRIVER_UPDATED, {
      id: driverId,
      status: DriverStatusValue.BUSY,
    });

    return ride;
  }

  async markDriverArrived(rideId: string, user?: AuthUser) {
    await this.assertRideDriverAccess(rideId, user);
    const ride = await this.transitionRide(rideId, OrderStatusValue.DRIVER_ARRIVED);

    this.socket.emitToOrder(ride.id, RealtimeEvent.DRIVER_ARRIVED, ride);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.DRIVER_ARRIVED, ride);
    this.socket.emitToPassenger(
      ride.customerId,
      RealtimeEvent.DRIVER_ARRIVED_LOWER,
      { ride },
    );
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, ride);
    return ride;
  }

  async startTrip(rideId: string, user?: AuthUser) {
    await this.assertRideDriverAccess(rideId, user);
    const ride = await this.transitionRide(rideId, OrderStatusValue.IN_PROGRESS);

    this.socket.emitToOrder(ride.id, RealtimeEvent.TRIP_STARTED, ride);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.TRIP_STARTED, ride);
    this.socket.emitToPassenger(
      ride.customerId,
      RealtimeEvent.RIDE_STARTED_LOWER,
      { ride },
    );
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, ride);
    return ride;
  }

  async completeTrip(
    rideId: string,
    input: PaymentMethod | CompleteTripInput = PaymentMethodValue.CASH,
    user?: AuthUser,
  ) {
    await this.assertRideDriverAccess(rideId, user);
    const currentRide = await this.findOne(rideId);
    const completeInput =
      typeof input === 'string' ? { paymentMethod: input } : input;
    const distanceKm = (currentRide.distanceMeters ?? 0) / 1000;
    const tariff = await this.getActiveTariff(
      (currentRide.tariffClass as TariffClass) ?? DEFAULT_TARIFF_CLASS,
    );
    const waitingMinutes = completeInput.waitingMinutes ?? 0;
    const stopMinutes = completeInput.stopMinutes ?? 0;
    const finalFareDetails = this.pricingService.calculateFinalFareDetails({
      tariff,
      distanceKm,
      waitingMinutes,
      stopMinutes,
    });

    const ride = await this.transitionRide(rideId, OrderStatusValue.COMPLETED, {
      finalFare: finalFareDetails.total,
      finalFareDetails: finalFareDetails as unknown as Prisma.InputJsonValue,
      waitingMinutes,
      stopMinutes,
    });

    const payment = await this.paymentService.createPendingPayment(
      ride.id,
      ride.customerId,
      finalFareDetails.total,
      completeInput.paymentMethod ?? PaymentMethodValue.CASH,
    );

    if (ride.driverId) {
      await this.prisma.driver.update({
        where: { id: ride.driverId },
        data: { status: DriverStatusValue.ONLINE },
      });
      this.socket.emitToAdmins(RealtimeEvent.DRIVER_UPDATED, {
        id: ride.driverId,
        status: DriverStatusValue.ONLINE,
      });
    }

    const payload = { ride, payment };
    this.socket.emitToOrder(ride.id, RealtimeEvent.TRIP_COMPLETED, payload);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.TRIP_COMPLETED, payload);
    this.socket.emitToPassenger(
      ride.customerId,
      RealtimeEvent.RIDE_COMPLETED_LOWER,
      payload,
    );
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, payload);

    return payload;
  }

  async cancelRide(rideId: string, reason = 'CANCELLED_BY_USER', user?: AuthUser) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    this.assertCancelAllowed(ride, user);

    const cancelledRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: OrderStatusValue.CANCELLED,
        cancelReason: reason,
        statusHistory: {
          create: {
            status: OrderStatusValue.CANCELLED,
            reason,
          },
        },
      },
    });

    if (ride.driverId) {
      await this.prisma.driver.update({
        where: { id: ride.driverId },
        data: { status: DriverStatusValue.ONLINE },
      });
      this.socket.emitToAdmins(RealtimeEvent.DRIVER_UPDATED, {
        id: ride.driverId,
        status: DriverStatusValue.ONLINE,
      });
    }

    const payload = { ride: cancelledRide, reason };
    this.socket.emitToOrder(cancelledRide.id, RealtimeEvent.RIDE_CANCELLED, payload);
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, payload);
    this.socket.emitToPassenger(
      cancelledRide.customerId,
      RealtimeEvent.RIDE_CANCELLED,
      payload,
    );

    if (cancelledRide.driverId) {
      this.socket.emitToDriver(
        cancelledRide.driverId,
        RealtimeEvent.RIDE_CANCELLED,
        payload,
      );
    }

    return payload;
  }

  async pay(rideId: string, user?: AuthUser) {
    const ride = await this.findOne(rideId);

    if (
      user?.role === UserRoleValue.PASSENGER &&
      ride.customerId !== user.userId
    ) {
      throw new ForbiddenException('Cannot pay another passenger ride');
    }

    if (ride.status !== OrderStatusValue.COMPLETED) {
      throw new BadRequestException('Ride must be completed before payment');
    }

    const payment = await this.paymentService.markPaid(rideId);
    const payload = { ride, payment };

    this.socket.emitToOrder(ride.id, RealtimeEvent.PAYMENT_COMPLETED, payload);
    this.socket.emitToPassenger(ride.customerId, RealtimeEvent.PAYMENT_COMPLETED, payload);
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, payload);

    return payload;
  }

  private async transitionRide(
    rideId: string,
    nextStatus: OrderStatus,
    extraData: {
      finalFare?: number;
      finalFareDetails?: Prisma.InputJsonValue;
      waitingMinutes?: number;
      stopMinutes?: number;
    } = {},
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

  private assertCancelAllowed(
    ride: {
      customerId: string;
      driverId: string | null;
      status: string;
      driver?: { userId: string } | null;
    },
    user?: AuthUser,
  ) {
    if (
      ride.status === OrderStatusValue.COMPLETED ||
      ride.status === OrderStatusValue.CANCELLED
    ) {
      throw new BadRequestException('Ride cannot be cancelled in its current status');
    }

    if (user?.role !== UserRoleValue.ADMIN && ride.status === OrderStatusValue.IN_PROGRESS) {
      throw new BadRequestException('Ride cannot be cancelled after trip started');
    }

    if (!user || user.role === UserRoleValue.ADMIN) {
      return;
    }

    if (user.role === UserRoleValue.PASSENGER) {
      if (ride.customerId !== user.userId) {
        throw new ForbiddenException('Cannot cancel another passenger ride');
      }

      return;
    }

    if (user.role === UserRoleValue.DRIVER) {
      if (!ride.driverId || ride.driver?.userId !== user.userId) {
        throw new ForbiddenException('Cannot cancel another driver ride');
      }

      return;
    }

    throw new ForbiddenException('Cannot cancel ride');
  }

  private async assertDriverActor(driverId: string, user?: AuthUser) {
    if (!user || user.role === UserRoleValue.ADMIN) {
      return;
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { userId: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.userId !== user.userId) {
      throw new ForbiddenException('Cannot accept ride for another driver');
    }
  }

  private async assertRideDriverAccess(rideId: string, user?: AuthUser) {
    if (!user || user.role === UserRoleValue.ADMIN) {
      return;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { driver: { select: { userId: true } } },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driver?.userId !== user.userId) {
      throw new ForbiddenException('Cannot mutate another driver ride');
    }
  }

  private async calculateEstimate(dto: CreateOrderDto) {
    const distanceMeters = await this.calculateRouteDistanceMeters(
      dto.pickupLat,
      dto.pickupLng,
      dto.dropoffLat,
      dto.dropoffLng,
    );
    const distanceKm = distanceMeters / 1000;
    const tariff = await this.getActiveTariff(
      dto.tariffClass ?? DEFAULT_TARIFF_CLASS,
    );

    const details = this.pricingService.calculateEstimatedFareDetails({
      tariff,
      distanceKm,
    });

    return {
      distanceMeters,
      fare: details.total,
      details,
    };
  }

  private async calculateRouteDistanceMeters(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ) {
    if (this.mapbox?.isConfigured()) {
      try {
        const route = await this.mapbox.getRoute(
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng,
        );
        return route.distanceMeters;
      } catch {
        return calculateDistanceMeters(
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng,
        );
      }
    }

    return calculateDistanceMeters(pickupLat, pickupLng, dropoffLat, dropoffLng);
  }

  private async getActiveTariff(tariffClass: TariffClass) {
    const cacheKey = `tariff:${tariffClass}:active`;
    const cached = await this.redis.client.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as ReturnType<PricingService['getDefaultTariff']>;
    }

    const tariff =
      (await this.prisma.tariff.findFirst({
        where: { active: true, tariffClass },
      })) ?? this.pricingService.getDefaultTariff(tariffClass);

    await this.redis.client.set(cacheKey, JSON.stringify(tariff), 'EX', 60);
    return tariff;
  }
}

function mapRideDriverForSocket(ride: {
  driver?: {
    id: string;
    rating: number;
    user?: { name?: string | null; phone?: string | null } | null;
    vehicle?: {
      make: string;
      model: string;
      plateNumber: string;
    } | null;
  } | null;
  driverId?: string | null;
}) {
  if (!ride.driver) {
    return undefined;
  }

  return {
    id: ride.driver.id,
    driverName: ride.driver.user?.name ?? ride.driver.user?.phone ?? 'Водитель',
    rating: ride.driver.rating,
    car: ride.driver.vehicle
      ? `${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
      : 'ANGREN TAXI',
    plate: ride.driver.vehicle?.plateNumber,
    phone: ride.driver.user?.phone,
    eta: '3 мин',
    etaMinutes: 3,
  };
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
