import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RealtimeEvent } from '../../common/realtime-events';
import { OrderStatusValue } from '../../modules/order/order-status';
import { PrismaService } from '../db/prisma.service';
import { GeoService } from '../redis/geo.service';
import { SocketGateway } from '../socket/socket.gateway';

interface FindDriverJob {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
}

@Injectable()
@Processor('ride-matching')
export class RideMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(RideMatchingProcessor.name);

  constructor(
    private readonly geo: GeoService,
    private readonly prisma: PrismaService,
    private readonly socket: SocketGateway,
  ) {
    super();
  }

  async process(job: Job<FindDriverJob>) {
    if (job.name !== 'find-driver') {
      return;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: job.data.rideId },
    });

    if (!ride || ride.status !== OrderStatusValue.SEARCHING_DRIVER) {
      return;
    }

    const radiusKm = 3 + job.attemptsMade * 3;
    const nearbyDrivers = await this.geo.findNearbyDrivers(
      job.data.pickupLat,
      job.data.pickupLng,
      radiusKm,
    );

    if (nearbyDrivers.length === 0) {
      throw new Error(`No nearby drivers within ${radiusKm}km`);
    }

    for (const driver of nearbyDrivers) {
      this.socket.emitToDriver(driver.driverId, RealtimeEvent.NEW_ORDER, {
        ride,
        distanceMeters: driver.distanceMeters,
        expiresInSeconds: 25,
      });
    }

    this.logger.log(
      `Offered ride ${ride.id} to ${nearbyDrivers.length} drivers within ${radiusKm}km`,
    );

    return { offeredDrivers: nearbyDrivers.length, radiusKm };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<FindDriverJob> | undefined, error: Error) {
    if (!job || job.name !== 'find-driver') {
      return;
    }

    this.logger.warn(
      `Ride matching failed for ${job.data.rideId}, attempt ${job.attemptsMade}: ${error.message}`,
    );

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: job.data.rideId },
    });

    if (!ride || ride.status !== OrderStatusValue.SEARCHING_DRIVER) {
      return;
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
  }
}
