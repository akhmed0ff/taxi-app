import { Injectable, Logger } from '@nestjs/common';
import { RealtimeEvent } from '../../common/realtime-events';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { GeoService, NearbyDriver } from '../../infrastructure/redis/geo.service';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { DriverStatusValue } from '../driver/driver-status';
import { OrderStatusValue } from '../order/order-status';

export interface MatchRideInput {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  radiusKm: number;
  offerTimeoutMs: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly socket: SocketGateway,
  ) {}

  async offerRideToNearbyDrivers(input: MatchRideInput) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: input.rideId },
    });

    if (!ride || ride.status !== OrderStatusValue.SEARCHING_DRIVER) {
      this.logger.log(
        `Matching ride ${input.rideId}: skipped, ride status is ${ride?.status ?? 'missing'}`,
      );
      return { ride, offeredDrivers: 0, shouldContinueSearch: false };
    }

    this.logger.log(
      `Matching ride ${ride.id}: searching Redis GEO within ${input.radiusKm}km`,
    );

    const nearbyDrivers = await this.geo.findNearbyDrivers(
      input.pickupLat,
      input.pickupLng,
      input.radiusKm,
    );
    const onlineDrivers = await this.filterOnlineDrivers(nearbyDrivers);
    const expiresInSeconds = Math.ceil(input.offerTimeoutMs / 1000);

    for (const driver of onlineDrivers) {
      this.socket.emitToDriver(driver.driverId, RealtimeEvent.NEW_ORDER, {
        ride,
        distanceMeters: driver.distanceMeters,
        expiresInSeconds,
      });
    }

    this.logger.log(
      `Matching ride ${ride.id}: found ${nearbyDrivers.length} nearby drivers, offered ${onlineDrivers.length} ONLINE drivers, expiresIn=${expiresInSeconds}s`,
    );

    return {
      ride,
      offeredDrivers: onlineDrivers.length,
      shouldContinueSearch: true,
    };
  }

  async cancelNoDriverRide(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.status !== OrderStatusValue.SEARCHING_DRIVER) {
      return ride;
    }

    const cancelledRide = await this.prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: OrderStatusValue.CANCELLED,
        cancelReason: 'NO_DRIVER_FOUND',
        statusHistory: {
          create: {
            status: OrderStatusValue.CANCELLED,
            reason: 'NO_DRIVER_FOUND',
          },
        },
      },
    });

    this.logger.warn(
      `Matching ride ${cancelledRide.id}: cancelled with reason NO_DRIVER_FOUND`,
    );

    this.socket.emitToPassenger(
      cancelledRide.customerId,
      RealtimeEvent.MATCHING_FAILED,
      cancelledRide,
    );
    this.socket.emitToOrder(
      cancelledRide.id,
      RealtimeEvent.MATCHING_FAILED,
      cancelledRide,
    );

    return cancelledRide;
  }

  private async filterOnlineDrivers(nearbyDrivers: NearbyDriver[]) {
    if (nearbyDrivers.length === 0) {
      return [];
    }

    const distanceByDriverId = new Map(
      nearbyDrivers.map((driver) => [driver.driverId, driver.distanceMeters]),
    );
    const onlineDrivers = await this.prisma.driver.findMany({
      where: {
        id: { in: nearbyDrivers.map((driver) => driver.driverId) },
        status: DriverStatusValue.ONLINE,
      },
      select: { id: true },
    });
    const onlineDriverIds = new Set(onlineDrivers.map((driver) => driver.id));

    return nearbyDrivers
      .filter((driver) => onlineDriverIds.has(driver.driverId))
      .map((driver) => ({
        driverId: driver.driverId,
        distanceMeters: distanceByDriverId.get(driver.driverId) ?? driver.distanceMeters,
      }));
  }
}
