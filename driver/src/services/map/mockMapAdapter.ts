import type { Coordinates, MapAdapter, RouteResult } from './map.types';

const ANGREN_CENTER: Coordinates = { lat: 41.0167, lng: 70.1436 };
const TASHKENT_CENTER: Coordinates = { lat: 41.2995, lng: 69.2401 };

function distanceKm(from: Coordinates, to: Coordinates) {
  const dx = to.lat - from.lat;
  const dy = to.lng - from.lng;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export const mockMapAdapter: MapAdapter = {
  async getRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
    const dist = distanceKm(from, to);
    return {
      points: [from, to],
      distanceKm: dist,
      durationMin: dist * 2,
    };
  },

  async getDistance(from: Coordinates, to: Coordinates) {
    const dist = distanceKm(from, to);
    return { distanceKm: dist, durationMin: dist * 2 };
  },

  async geocode(address: string) {
    const query = address.trim().toLowerCase();
    if (query.includes('angren') || query.includes('ангрен')) {
      return ANGREN_CENTER;
    }
    return TASHKENT_CENTER;
  },
};

