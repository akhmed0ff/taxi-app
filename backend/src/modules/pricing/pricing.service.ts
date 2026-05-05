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
  baseFareAmount: number;
  distanceAmount: number;
  freeWaitingMinutes: number;
  waitingMinutes: number;
  paidWaitingMinutes: number;
  waitingAmount: number;
  stopMinutes: number;
  stopAmount: number;
  subtotal: number;
  minimumFare: number;
  minimumFareAdjustment: number;
  total: number;
}

/** Публичный тариф для пассажирских приложений (GET /tariffs). */
export interface CustomerPublicTariff {
  id: string;
  code: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
  baseFare: number;
  pricePerKm: number;
  pricePer100m?: number;
  etaMinutes: number;
  seats: number;
  minimumFare: number;
  /** Для отображения условий ожидания / разбивки в клиенте (источник — БД / админка). */
  freeWaitingMinutes: number;
  waitingPerMinute: number;
  stopPerMinute: number;
}

export const DEFAULT_ANGREN_TARIFFS: Record<TariffClass, AngrenTariff> = {
  STANDARD: {
    tariffClass: TariffClassValue.STANDARD,
    city: 'Angren',
    baseFare: 3800,
    perKm: 2000,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 3800,
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
  COMFORT_PLUS: {
    tariffClass: TariffClassValue.COMFORT_PLUS,
    city: 'Angren',
    baseFare: 6500,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 6500,
    active: true,
  },
  DELIVERY: {
    tariffClass: TariffClassValue.DELIVERY,
    city: 'Angren',
    baseFare: 8800,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 8800,
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
    const baseFareAmount = input.tariff.baseFare;
    const distanceAmount = Math.round(input.distanceKm * input.tariff.perKm);
    const waitingAmount = paidWaitingMinutes * input.tariff.waitingPerMinute;
    const stopAmount = stopMinutes * input.tariff.stopPerMinute;
    const subtotal =
      baseFareAmount + distanceAmount + waitingAmount + stopAmount;
    const total = this.applyMinimumFare(subtotal, input.tariff.minimumFare);

    return {
      tariffClass: input.tariff.tariffClass,
      currency: 'UZS',
      distanceKm: roundMoneyInput(input.distanceKm),
      baseFareAmount,
      distanceAmount,
      freeWaitingMinutes: input.tariff.freeWaitingMinutes,
      waitingMinutes,
      paidWaitingMinutes,
      waitingAmount,
      stopMinutes,
      stopAmount,
      subtotal,
      minimumFare: input.tariff.minimumFare,
      minimumFareAdjustment: total - subtotal,
      total,
    };
  }

  findTariffs() {
    return this.prisma.tariff.findMany({
      orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { tariffClass: 'asc' }],
    });
  }

  findCustomerTariffs(): Promise<CustomerPublicTariff[]> {
    return this.prisma.tariff
      .findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { tariffClass: 'asc' }],
      })
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          code: r.tariffClass,
          title:
            r.title.trim() || defaultPassengerTitle(r.tariffClass),
          isActive: r.active,
          sortOrder: r.sortOrder,
          baseFare: r.baseFare,
          pricePerKm: r.perKm,
          pricePer100m: r.pricePer100m ?? undefined,
          etaMinutes: r.etaMinutes,
          seats: r.seats,
          minimumFare: r.minimumFare,
          freeWaitingMinutes: r.freeWaitingMinutes,
          waitingPerMinute: r.waitingPerMinute,
          stopPerMinute: r.stopPerMinute,
        })),
      );
  }

  findActiveTariffs() {
    return this.prisma.tariff.findMany({
      where: { active: true },
      select: {
        tariffClass: true,
        minimumFare: true,
        perKm: true,
        baseFare: true,
        freeWaitingMinutes: true,
      },
      orderBy: { tariffClass: 'asc' },
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
        active: dto.active ?? true,
        title: dto.title ?? defaultPassengerTitle(dto.tariffClass),
        sortOrder: dto.sortOrder ?? defaultSortOrder(dto.tariffClass),
        etaMinutes: dto.etaMinutes ?? 5,
        seats: dto.seats ?? 4,
        pricePer100m: dto.pricePer100m ?? null,
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
    return DEFAULT_ANGREN_TARIFFS[tariffClass] ?? DEFAULT_ANGREN_TARIFFS.STANDARD;
  }

  private applyMinimumFare(rawFare: number, minimumFare: number) {
    return Math.max(Math.round(rawFare), minimumFare);
  }
}

function roundMoneyInput(value: number) {
  return Math.round(value * 100) / 100;
}

function defaultPassengerTitle(tariffClass: string): string {
  switch (tariffClass) {
    case TariffClassValue.STANDARD:
      return 'Стандарт';
    case TariffClassValue.COMFORT:
      return 'Комфорт';
    case TariffClassValue.COMFORT_PLUS:
      return 'Комфорт+';
    case TariffClassValue.DELIVERY:
      return 'Доставка';
    default:
      return tariffClass;
  }
}

function defaultSortOrder(tariffClass: string): number {
  switch (tariffClass) {
    case TariffClassValue.STANDARD:
      return 1;
    case TariffClassValue.COMFORT:
      return 2;
    case TariffClassValue.COMFORT_PLUS:
      return 3;
    case TariffClassValue.DELIVERY:
      return 4;
    default:
      return 99;
  }
}
