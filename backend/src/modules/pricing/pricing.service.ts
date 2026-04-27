import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { UpsertTariffDto } from './dto/upsert-tariff.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  calculateFare(input: CalculateFareInput) {
    const surgeMultiplier = input.surgeMultiplier ?? 1;
    const minimumFare = input.minimumFare ?? 0;

    const rawFare =
      input.baseFare +
      input.distanceKm * input.pricePerKm +
      input.durationMinutes * input.pricePerMinute;

    return Math.max(Math.round(rawFare * surgeMultiplier), minimumFare);
  }

  findTariffs() {
    return this.prisma.tariff.findMany({
      orderBy: [{ active: 'desc' }, { city: 'asc' }],
    });
  }

  createTariff(dto: UpsertTariffDto) {
    return this.prisma.tariff.create({
      data: dto,
    });
  }

  updateTariff(tariffId: string, dto: Partial<UpsertTariffDto>) {
    return this.prisma.tariff.update({
      where: { id: tariffId },
      data: dto,
    });
  }
}
