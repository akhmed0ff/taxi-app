import { Injectable, Logger, Optional } from '@nestjs/common';
import { RealtimeEvent } from '../../common/realtime-events';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { GeoService, NearbyDriver } from '../../infrastructure/redis/geo.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { DriverStatusValue } from '../driver/driver-status';
import { OrderStatusValue } from '../order/order-status';
import { RideOfferStatusValue } from './ride-offer-status';

export interface MatchRideInput {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  radiusKm: number;
  offerTimeoutMs: number;
}

// Dev-friendly: offer to more drivers to reduce flakiness in local testing.
const OFFER_BATCH_SIZE = 10;

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly socket: SocketGateway,
    @Optional() private readonly redis?: RedisService,
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
    const alreadyOfferedDriverIds = await this.getAlreadyOfferedDriverIds(
      ride.id,
      onlineDrivers.map((driver) => driver.driverId),
    );
    const availableDrivers = onlineDrivers.filter(
      (driver) => !alreadyOfferedDriverIds.has(driver.driverId),
    );
    const driversToOffer = availableDrivers.slice(0, OFFER_BATCH_SIZE);
    const expiresInSeconds = Math.ceil(input.offerTimeoutMs / 1000);
    const expiresAt = new Date(Date.now() + input.offerTimeoutMs);

    for (const driver of driversToOffer) {
      const offerWhere = {
        rideId_driverId: {
          rideId: ride.id,
          driverId: driver.driverId,
        },
      };
      const payload = {
        ride,
        tariffClass: ride.tariffClass,
        estimatedFare: ride.estimatedFare,
        distanceMeters: driver.distanceMeters,
        expiresInSeconds,
      };

      await this.prisma.rideOffer.upsert({
        where: offerWhere,
        create: {
          rideId: ride.id,
          driverId: driver.driverId,
          status: RideOfferStatusValue.PENDING,
          distanceMeters: driver.distanceMeters,
          expiresAt,
        },
        update: {
          status: RideOfferStatusValue.PENDING,
          distanceMeters: driver.distanceMeters,
          expiresAt,
          acceptedAt: null,
          rejectedAt: null,
        },
      });

      await this.redis?.createRideOffer(
        ride.id,
        driver.driverId,
        expiresInSeconds,
      );

      this.socket.emitToDriver(
        driver.driverId,
        RealtimeEvent.NEW_RIDE_OFFER_LOWER,
        payload,
      );

      await this.prisma.rideOffer.update({
        where: offerWhere,
        data: {
          status: RideOfferStatusValue.SENT,
        },
      });
    }
    const offeredDrivers = driversToOffer.length;

    this.logger.log(
      `Matching ride ${ride.id}: found ${nearbyDrivers.length} nearby drivers, offered ${offeredDrivers} ONLINE drivers, expiresIn=${expiresInSeconds}s`,
    );

    return {
      ride,
      offeredDrivers,
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
      RealtimeEvent.RIDE_MATCHING_FAILED,
      cancelledRide,
    );
    this.socket.emitToOrder(
      cancelledRide.id,
      RealtimeEvent.RIDE_MATCHING_FAILED,
      cancelledRide,
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
    this.socket.emitToAdmins(RealtimeEvent.ORDER_UPDATED, cancelledRide);

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

  private async getAlreadyOfferedDriverIds(rideId: string, driverIds: string[]) {
    if (driverIds.length === 0) {
      return new Set<string>();
    }

    const existingOffers = await this.prisma.rideOffer.findMany({
      where: {
        rideId,
        driverId: { in: driverIds },
      },
      select: { driverId: true },
    });

    return new Set(existingOffers.map((offer) => offer.driverId));
  }
}
