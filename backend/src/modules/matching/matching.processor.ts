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

const OFFER_TTL_SECONDS = 25;
const MAX_MATCHING_ATTEMPTS = 4;
const BASE_RADIUS_KM = 3;
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
    const radiusKm = BASE_RADIUS_KM + (attempt - 1) * RADIUS_STEP_KM;
    const result = await this.matchingService.offerRideToNearbyDrivers({
      rideId: job.data.rideId,
      pickupLat: job.data.pickupLat,
      pickupLng: job.data.pickupLng,
      radiusKm,
      offerTtlSeconds: OFFER_TTL_SECONDS,
    });

    if (!result.shouldContinueSearch) {
      return result;
    }

    if (attempt >= MAX_MATCHING_ATTEMPTS) {
      await this.matchingService.cancelNoDriverRide(job.data.rideId);
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
        delay: OFFER_TTL_SECONDS * 1000,
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    this.logger.log(
      `Scheduled next matching attempt ${attempt + 1} for ride ${job.data.rideId}`,
    );

    return {
      ...result,
      attempt,
      radiusKm,
      nextAttemptInSeconds: OFFER_TTL_SECONDS,
    };
  }
}
