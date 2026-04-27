import { Injectable } from '@nestjs/common';

export interface CalculateFareInput {
  baseFare: number;
  distanceKm: number;
  durationMinutes: number;
  pricePerKm: number;
  pricePerMinute: number;
  surgeMultiplier?: number;
  minimumFare?: number;
}

@Injectable()
export class PricingService {
  calculateFare(input: CalculateFareInput) {
    const surgeMultiplier = input.surgeMultiplier ?? 1;
    const minimumFare = input.minimumFare ?? 0;

    const rawFare =
      input.baseFare +
      input.distanceKm * input.pricePerKm +
      input.durationMinutes * input.pricePerMinute;

    return Math.max(Math.round(rawFare * surgeMultiplier), minimumFare);
  }
}
