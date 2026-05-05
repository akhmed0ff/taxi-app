import type { Coordinates, MapAdapter, RouteResult } from './map.types';

// TODO: replace with real Mapbox-backed implementation (maps API / SDK).
// Must not throw in current dev mode.

function distanceKm(from: Coordinates, to: Coordinates) {
  const dx = to.lat - from.lat;
  const dy = to.lng - from.lng;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export const mapboxAdapter: MapAdapter = {
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

  async geocode(_address: string) {
    // Safe fallback until real geocoding is implemented.
    return { lat: 41.0167, lng: 70.1436 };
  },
};

