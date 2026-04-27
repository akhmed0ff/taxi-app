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
  offerTtlSeconds: number;
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
      return { ride, offeredDrivers: 0, shouldContinueSearch: false };
    }

    const nearbyDrivers = await this.geo.findNearbyDrivers(
      input.pickupLat,
      input.pickupLng,
      input.radiusKm,
    );
    const onlineDrivers = await this.filterOnlineDrivers(nearbyDrivers);

    for (const driver of onlineDrivers) {
      this.socket.emitToDriver(driver.driverId, RealtimeEvent.NEW_ORDER, {
        ride,
        distanceMeters: driver.distanceMeters,
        expiresInSeconds: input.offerTtlSeconds,
      });
    }

    this.logger.log(
      `Offered ride ${ride.id} to ${onlineDrivers.length} online drivers within ${input.radiusKm}km`,
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
        statusHistory: {
          create: {
            status: OrderStatusValue.CANCELLED,
            reason: 'NO_DRIVERS_AVAILABLE',
          },
        },
      },
    });

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
