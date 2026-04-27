import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { UpsertTariffDto } from './dto/upsert-tariff.dto';
import { DEFAULT_TARIFF_CLASS, TariffClass, TariffClassValue } from './tariff-class';

export interface AngrenTariff {
  tariffClass: string;
  city?: string;
  baseFare: number;
  perKm: number;
  freeWaitingMinutes: number;
  waitingPerMinute: number;
  stopPerMinute: number;
  minimumFare: number;
  active?: boolean;
}

export interface EstimateFareInput {
  tariff: AngrenTariff;
  distanceKm: number;
}

export interface FinalFareInput extends EstimateFareInput {
  waitingMinutes?: number;
  stopMinutes?: number;
}

export const DEFAULT_ANGREN_TARIFFS: Record<TariffClass, AngrenTariff> = {
  ECONOMY: {
    tariffClass: TariffClassValue.ECONOMY,
    city: 'Angren',
    baseFare: 7000,
    perKm: 2000,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 12000,
    active: true,
  },
  COMFORT: {
    tariffClass: TariffClassValue.COMFORT,
    city: 'Angren',
    baseFare: 10000,
    perKm: 2500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 16000,
    active: true,
  },
  PREMIUM: {
    tariffClass: TariffClassValue.PREMIUM,
    city: 'Angren',
    baseFare: 15000,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 25000,
    active: true,
  },
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  calculateEstimatedFare(input: EstimateFareInput) {
    return this.applyMinimumFare(
      input.tariff.baseFare + input.distanceKm * input.tariff.perKm,
      input.tariff.minimumFare,
    );
  }

  calculateFinalFare(input: FinalFareInput) {
    const waitingMinutes = input.waitingMinutes ?? 0;
    const stopMinutes = input.stopMinutes ?? 0;
    const paidWaitingMinutes = Math.max(
      0,
      waitingMinutes - input.tariff.freeWaitingMinutes,
    );
    const rawFare =
      input.tariff.baseFare +
      input.distanceKm * input.tariff.perKm +
      paidWaitingMinutes * input.tariff.waitingPerMinute +
      stopMinutes * input.tariff.stopPerMinute;

    return this.applyMinimumFare(rawFare, input.tariff.minimumFare);
  }

  findTariffs() {
    return this.prisma.tariff.findMany({
      orderBy: [{ active: 'desc' }, { tariffClass: 'asc' }],
    });
  }

  createTariff(dto: UpsertTariffDto) {
    return this.prisma.tariff.create({
      data: {
        tariffClass: dto.tariffClass,
        city: dto.city ?? 'Angren',
        baseFare: dto.baseFare,
        perKm: dto.perKm,
        freeWaitingMinutes: dto.freeWaitingMinutes,
        waitingPerMinute: dto.waitingPerMinute,
        stopPerMinute: dto.stopPerMinute,
        minimumFare: dto.minimumFare,
        active: dto.active,
      },
    });
  }

  updateTariff(tariffId: string, dto: Partial<UpsertTariffDto>) {
    return this.prisma.tariff.update({
      where: { id: tariffId },
      data: {
        ...dto,
        city: dto.city ?? undefined,
      },
    });
  }

  getDefaultTariff(tariffClass: TariffClass = DEFAULT_TARIFF_CLASS) {
    return DEFAULT_ANGREN_TARIFFS[tariffClass] ?? DEFAULT_ANGREN_TARIFFS.ECONOMY;
  }

  private applyMinimumFare(rawFare: number, minimumFare: number) {
    return Math.max(Math.round(rawFare), minimumFare);
  }
}
