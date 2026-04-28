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

export interface FareBreakdown {
  tariffClass: string;
  currency: 'UZS';
  distanceKm: number;
  baseFare: number;
  distanceFare: number;
  freeWaitingMinutes: number;
  waitingMinutes: number;
  paidWaitingMinutes: number;
  waitingFare: number;
  stopMinutes: number;
  stopFare: number;
  subtotal: number;
  minimumFare: number;
  minimumFareAdjustment: number;
  total: number;
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
    return this.calculateEstimatedFareDetails(input).total;
  }

  calculateFinalFare(input: FinalFareInput) {
    return this.calculateFinalFareDetails(input).total;
  }

  calculateEstimatedFareDetails(input: EstimateFareInput): FareBreakdown {
    return this.buildFareBreakdown({
      ...input,
      waitingMinutes: 0,
      stopMinutes: 0,
    });
  }

  calculateFinalFareDetails(input: FinalFareInput): FareBreakdown {
    return this.buildFareBreakdown(input);
  }

  private buildFareBreakdown(input: FinalFareInput): FareBreakdown {
    const waitingMinutes = input.waitingMinutes ?? 0;
    const stopMinutes = input.stopMinutes ?? 0;
    const paidWaitingMinutes = Math.max(
      0,
      waitingMinutes - input.tariff.freeWaitingMinutes,
    );
    const distanceFare = Math.round(input.distanceKm * input.tariff.perKm);
    const waitingFare = paidWaitingMinutes * input.tariff.waitingPerMinute;
    const stopFare = stopMinutes * input.tariff.stopPerMinute;
    const subtotal =
      input.tariff.baseFare + distanceFare + waitingFare + stopFare;
    const total = this.applyMinimumFare(subtotal, input.tariff.minimumFare);

    return {
      tariffClass: input.tariff.tariffClass,
      currency: 'UZS',
      distanceKm: roundMoneyInput(input.distanceKm),
      baseFare: input.tariff.baseFare,
      distanceFare,
      freeWaitingMinutes: input.tariff.freeWaitingMinutes,
      waitingMinutes,
      paidWaitingMinutes,
      waitingFare,
      stopMinutes,
      stopFare,
      subtotal,
      minimumFare: input.tariff.minimumFare,
      minimumFareAdjustment: total - subtotal,
      total,
    };
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

function roundMoneyInput(value: number) {
  return Math.round(value * 100) / 100;
}
