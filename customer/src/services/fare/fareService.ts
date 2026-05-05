import type { PublicTariff } from '../api';
import { mapAdapter } from '../map/mapAdapter';
import type { Coordinates } from '../map/map.types';

export type TariffForEstimatedFare = Pick<
  PublicTariff,
  'baseFare' | 'pricePerKm' | 'pricePer100m'
>;

export type EstimatedFareResult = {
  distanceKm: number;
  durationMin: number;
  estimatedFare: number;
  formattedFare: string;
};

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatUzs(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} сум`;
}

/**
 * Оценка стоимости поездки без Mapbox route: расстояние из mapAdapter.getDistance (mock или иной адаптер).
 */
export async function calculateEstimatedFare(params: {
  pickup: Coordinates;
  destination: Coordinates;
  tariff: TariffForEstimatedFare;
}): Promise<EstimatedFareResult> {
  const { pickup, destination, tariff } = params;
  const { distanceKm, durationMin } = await mapAdapter.getDistance(pickup, destination);

  const baseFare = tariff.baseFare;
  const usePer100m =
    tariff.pricePer100m != null && Number.isFinite(tariff.pricePer100m);

  const rawFare = usePer100m
    ? baseFare + distanceKm * 10 * tariff.pricePer100m!
    : baseFare + distanceKm * tariff.pricePerKm;

  const estimatedFare = roundToNearest(rawFare, 500);

  return {
    distanceKm,
    durationMin,
    estimatedFare,
    formattedFare: formatUzs(estimatedFare),
  };
}
