import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { MatchingService } from './matching.service';

interface FindDriverJob {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  attempt?: number;
}

export const OFFER_TIMEOUT_MS = 10_000;
export const INITIAL_RADIUS_KM = 3;
export const MAX_RADIUS_KM = 12;
const RADIUS_STEP_KM = 3;

@Injectable()
@Processor('ride-matching')
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly matchingService: MatchingService,
    @InjectQueue('ride-matching') private readonly rideMatchingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<FindDriverJob>) {
    if (job.name !== 'find-driver') {
      return;
    }

    const attempt = job.data.attempt ?? 1;
    const radiusKm = Math.min(
      INITIAL_RADIUS_KM + (attempt - 1) * RADIUS_STEP_KM,
      MAX_RADIUS_KM,
    );

    this.logger.log(
      `Matching ride ${job.data.rideId}: attempt=${attempt}, radius=${radiusKm}km, offerTimeout=${OFFER_TIMEOUT_MS}ms`,
    );

    const result = await this.matchingService.offerRideToNearbyDrivers({
      rideId: job.data.rideId,
      pickupLat: job.data.pickupLat,
      pickupLng: job.data.pickupLng,
      radiusKm,
      offerTimeoutMs: OFFER_TIMEOUT_MS,
    });

    if (!result.shouldContinueSearch) {
      this.logger.log(
        `Matching ride ${job.data.rideId}: stopped because ride is no longer searching`,
      );
      return result;
    }

    if (radiusKm >= MAX_RADIUS_KM) {
      await this.matchingService.cancelNoDriverRide(job.data.rideId);
      this.logger.warn(
        `Matching ride ${job.data.rideId}: no driver accepted before max radius ${MAX_RADIUS_KM}km`,
      );
      return {
        ...result,
        attempt,
        radiusKm,
        completed: 'no-drivers',
      };
    }

    await this.rideMatchingQueue.add(
      'find-driver',
      {
        ...job.data,
        attempt: attempt + 1,
      },
      {
        delay: OFFER_TIMEOUT_MS,
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    this.logger.log(
      `Matching ride ${job.data.rideId}: scheduled attempt ${attempt + 1} after ${OFFER_TIMEOUT_MS}ms`,
    );

    return {
      ...result,
      attempt,
      radiusKm,
      nextAttemptInMs: OFFER_TIMEOUT_MS,
    };
  }
}
