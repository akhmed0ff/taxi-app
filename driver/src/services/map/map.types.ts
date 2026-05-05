export type Coordinates = {
  lat: number;
  lng: number;
};

export type RouteResult = {
  points: Coordinates[];
  distanceKm: number;
  durationMin: number;
};

export interface MapAdapter {
  getRoute(from: Coordinates, to: Coordinates): Promise<RouteResult>;
  getDistance(from: Coordinates, to: Coordinates): Promise<{ distanceKm: number; durationMin: number }>;
  geocode(address: string): Promise<Coordinates>;
}

