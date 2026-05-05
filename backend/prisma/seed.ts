/**
 * Идемпотентное заполнение тарифов: выполняется только если в БД ещё нет строк.
 * Не перезаписывает существующие тарифы (правки — через админку / API).
 *
 * Запуск: из каталога backend — `npx prisma db seed`
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Значения по умолчанию для пустой БД (совпадают с fallback DEFAULT_ANGREN_TARIFFS в коде). */
const DEFAULT_TARIFF_ROWS = [
  {
    city: 'Angren',
    tariffClass: 'STANDARD',
    title: 'Стандарт',
    sortOrder: 1,
    etaMinutes: 7,
    seats: 4,
    pricePer100m: null as number | null,
    baseFare: 3800,
    perKm: 2000,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 3800,
    active: true,
  },
  {
    city: 'Angren',
    tariffClass: 'COMFORT',
    title: 'Комфорт',
    sortOrder: 2,
    etaMinutes: 7,
    seats: 4,
    pricePer100m: null,
    baseFare: 10000,
    perKm: 2500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 16000,
    active: true,
  },
  {
    city: 'Angren',
    tariffClass: 'COMFORT_PLUS',
    title: 'Комфорт+',
    sortOrder: 3,
    etaMinutes: 8,
    seats: 4,
    pricePer100m: null,
    baseFare: 6500,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 6500,
    active: true,
  },
  {
    city: 'Angren',
    tariffClass: 'DELIVERY',
    title: 'Доставка',
    sortOrder: 4,
    etaMinutes: 10,
    seats: 1,
    pricePer100m: null,
    baseFare: 8800,
    perKm: 3500,
    freeWaitingMinutes: 3,
    waitingPerMinute: 500,
    stopPerMinute: 500,
    minimumFare: 8800,
    active: true,
  },
];

async function main() {
  const count = await prisma.tariff.count();
  if (count > 0) {
    console.log(`[seed] Tariffs: skip (${count} row(s) already present).`);
    return;
  }

  for (const data of DEFAULT_TARIFF_ROWS) {
    await prisma.tariff.create({ data });
  }

  console.log(`[seed] Tariffs: inserted ${DEFAULT_TARIFF_ROWS.length} default row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
